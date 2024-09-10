import { TGContext } from './context'
import { Markup } from 'telegraf'
import { db } from './db'
import { Pupil } from './dto'
/*! conversation context ensures that the this.tg.chat !== undefined
 */


const cancelButton = Markup.button.text('Отмена');
export interface ConversationContext{
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

    if(ctx.tg.text === 'Отмена'){
      if(!this.editMode){
        ctx.cancelConversation = true;
        ctx.propagate = true;
        return;
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
      if(ctx.tg.text === 'Отправить'){
        // todo: save to docs
        console.log(this);
        var pupil: Pupil = {
          name: this.name,
          age: this.age,
          contact: this.contact,
        }
        db.savePupil("tg", ctx.tg.from?.id, pupil)
        ctx.cancelConversation = true;
        return;
      }else if(ctx.tg.text === 'Изменить имя'){
        this.state = 'name';
        this.editMode = true;
      }else if(ctx.tg.text === 'Изменить возраст'){
        this.state = 'age';
        this.editMode = true;
      }else if(ctx.tg.text === 'Изменить контактные данные'){
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
        ctx.tg.reply('Введите ваше имя:', 
          Markup.keyboard([
            Markup.button.text(`${ctx.tg.from?.first_name} ${ctx.tg.from?.last_name}`),
            cancelButton
          ])
        );
        break;
      case 'age':
        ctx.tg.reply('Введите ваш возвраст:',
          Markup.keyboard([
            cancelButton
          ])
        );
        break;
      case 'contact':
        ctx.tg.reply('Введите контактные данные:',
          Markup.keyboard([
            Markup.button.text(`Tg: @${ctx.tg.from?.username}`),
            cancelButton
          ])
        );
        break;
      case 'submit':
        ctx.tg.replyWithMarkdownV2(`**Введены данные**\n**Имя:** ${this.name}\n**Возраст:** ${this.age}\n**Контакты:** ${this.contact}`, Markup.keyboard([
          Markup.button.text('Отправить'),
          Markup.button.text('Изменить имя'),
          Markup.button.text('Изменить возраст'),
          Markup.button.text('Изменить контактные данные'),
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

