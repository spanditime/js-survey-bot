import { TGContext } from './context'
import { Markup } from 'telegraf'
import { db } from './db'
import { Pupil } from './dto'
/*! conversation context ensures that the this.tg.chat !== undefined
 */

const Cancel = 'Отмена'
const Submit = 'Отправить'
const ChangeName = 'Изменить имя'
const ChangeAge = 'Изменить возраст'
const ChangeContact = 'Изменить контактные данные'

const EnterName = 'Введите ваше имя'
const EnterAge = 'Введите ваш возраст'
const EnterContact = 'Введите контактные данные'
const Entered = 'Даные введены'

const cancelButton = Markup.button.text(Cancel);
export interface ConversationContext{
  showWelcomeMessage: boolean
  cancelConversation: boolean
  propagate: boolean;
  tg: TGContext;
}

interface ConversationHandler {
  handle(ctx: ConversationContext):void;
};

class SurveyConversationHandler{
  handle(ctx: ConversationContext) {
    if(ctx.tg.updateType !== 'message' && ctx.tg.updateType !== 'callback_query'){
      this.showCurrentStateQuestion(ctx)
      return;
    }

    if(ctx.tg.text === Cancel){
      if(!this.editMode){
        ctx.showWelcomeMessage = true;
        ctx.cancelConversation = true;
        return;
      }else{
        this.editMode = false;
        this.state = 'submit';
      }
    }

    if(this.state === 'name'){
      this.name = ctx.tg.text;
      this.state = this.editMode ? 'submit' : 'age';
    }else if(this.state === 'age'){
      this.age = ctx.tg.text;
      this.state = this.editMode ? 'submit' : 'contact';
    }else if(this.state === 'contact'){
      this.contact = ctx.tg.text;
      this.state = 'submit';
    }else if(this.state === 'submit'){
      if(ctx.tg.text === Submit){
        // todo: save to docs
        var pupil: Pupil = {
          name: this.name,
          age: this.age,
          contact: this.contact,
        }
        db.savePupil("tg", ctx.tg.from?.id, pupil)
        ctx.tg.reply("data submitted")
        ctx.cancelConversation = true;
        ctx.showWelcomeMessage = true;
        return;
      }else if(ctx.tg.text === ChangeName){
        this.state = 'name';
        this.editMode = true;
      }else if(ctx.tg.text === ChangeAge){
        this.state = 'age';
        this.editMode = true;
      }else if(ctx.tg.text === ChangeContact){
        this.state = 'contact';
        this.editMode = true;
      }


    }
    this.showCurrentStateQuestion(ctx);
  }
  showInfoMessage(ctx: ConversationContext){
    ctx.tg.reply('мы собираем ваши данные для того что бы... с вами могут связаться позже\n')
  }
  showCurrentStateQuestion(ctx: ConversationContext){
    switch(this.state){
      case 'name':
        ctx.tg.reply(EnterName, 
          Markup.keyboard([
            Markup.button.text(`${ctx.tg.from?.first_name} ${ctx.tg.from?.last_name}`),
            cancelButton
          ])
        );
        break;
      case 'age':
        ctx.tg.reply(EnterAge,
          Markup.keyboard([
            cancelButton
          ])
        );
        break;
      case 'contact':
        ctx.tg.reply(EnterContact,
          Markup.keyboard([
            Markup.button.text(`Tg: @${ctx.tg.from?.username}`),
            cancelButton
          ])
        );
        break;
      case 'submit':
        ctx.tg.replyWithMarkdownV2(Entered + `\n**Имя:** ${this.name}\n**Возраст:** ${this.age}\n**Контакты:** ${this.contact}`,
          Markup.keyboard([
            Markup.button.text(Submit),
            Markup.button.text(ChangeName),
            Markup.button.text(ChangeAge),
            Markup.button.text(ChangeContact),
            cancelButton
        ]))
        break;
    }
  }
  constructor(ctx: ConversationContext){
    db.getPupil("tg", ctx.tg.from?.id)
    this.state = 'name'
    this.editMode = false;
    this.showInfoMessage(ctx);
    this.showCurrentStateQuestion(ctx);
  }
  name?: string;
  age?: string;
  contact?: string;
  state:'name'|'age'|'contact'|'submit';
  editMode: boolean;
}


export class MainConversationHandler{

  handle(ctx:TGContext):void{
    var convctx = {
      showWelcomeMessage:false,
      cancelConversation:false,
      tg: ctx,
      propagate: false
    }
    if(ctx.chat !== undefined){
      var handler = this.conversations.get(ctx.chat.id)
      if(handler !== undefined){
        handler.handle(convctx);
        if(convctx.cancelConversation){
          this.conversations.delete(ctx.chat.id)
          if(convctx.showWelcomeMessage){
            this.showInfoMessage(convctx)
          }
          return;
        }
        if(!convctx.propagate){
          return;
        }
      }
      this.handle_main(convctx);
    }
  }

  handle_main(ctx: ConversationContext){
    if(ctx.tg.has('message')){
      if(ctx.tg.text === '/start'){
        this.conversations.set(ctx.tg.chat.id, new SurveyConversationHandler(ctx));
      }else{
        this.showInfoMessage(ctx);
      }
    }
  }

  showInfoMessage(ctx: ConversationContext){
    ctx.tg.reply('Используйте /start');
  }

  constructor(){
    this.conversations = new Map<number, ConversationHandler>()
  }

  conversations: Map<number, ConversationHandler>
};

