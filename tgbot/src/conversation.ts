import { TGContext } from './context'
import { Markup } from 'telegraf'
import { Pupil, db } from './db'
/*! conversation context ensures that the this.tg.chat !== undefined
 */

const Cancel = 'Отмена'
const Submit = 'Отправить'
const ChangeName = 'Изменить имя'
const ChangeAge = 'Изменить возраст'
const ChangeCity = 'Изменить готовность к очным встречам'
const ChangeRequest = 'Изменить запрос'
const ChangeContact = 'Изменить контактные данные'

const WelcomeMessage = `Спектры проблем и переживаний, с которыми Вы можете к нам обратиться:
- сложности в межличностных отношениях (дружеских, романтических, семейных и т.д.)
- трудности в учёбе (стресс, страх публичных выступлений, тревожность, прокрастинация, тремор при общении с коллегами и преподавателями, страх совершать ошибки);
- обеспокоенность своим психологическим состоянием (вредные привычки, нестабильная самооценка и эмоциональность, страхи, трудности в проявлении чувств и сопереживании, стремление к соперничеству, психосоматические симптомы, болезненное восприятие критики, невозможность "понять себя"). 

Если у Вас есть вопросы - можете задать их в @karevaina или по почте: clin.psy@mail.ru.`;
const GoToSurvey = `В данный момент ведется активный набор на консультации. Хотите оставить заявку?`;
const EnterName = 'Как мы можем к Вам обращаться?'
const EnterAge = 'Подскажите, сколько Вам лет?'
const EnterCity = 'Вы готовы приходить на встречи очно в городе Дубна?'
const EnterRequest = 'Пожалуйста, попробуйте описать Ваш запрос в одном или двух предложениях (что Вас беспокоит или что хотелось бы изменить).'
const EnterContact = 'Как мы можем связаться с вами? Просим оставить вас ссылку на соц. сети, почту или номер телефона (и предпочтительный тип связи по нему).'
const Entered = 'Информация верна?'
const Thanks = 'Благодарим за обращение! Мы рассмотрим заявку и свяжемся с Вами, если найдется специалист.'
const CityNo = 'Нет. Только онлайн.'
const Yes = 'Да'
const No = 'Нет'

interface ConversationContext{
  setNext(handler: ConversationHandler):void;
  showWelcomeMessage: boolean;
  cancelConversation: boolean;
  propagate: boolean;
  tg: TGContext;
}

interface ConversationHandler{
  handle(ctx:ConversationContext):void;
}

interface SurveyConversationHandler<Type> extends ConversationHandler{
  data: Type | undefined
}


type responseHandler<Type> = (current: SurveyConversationHandler<Type>, ctx:ConversationContext, response:string)=>void;
type cancellationHandler<Type> = (current: SurveyConversationHandler<Type>, ctx:ConversationContext)=>void;
class OptionsSurveyHandler<Type> implements SurveyConversationHandler<Type>{
  constructor(startMessage:string|undefined, question:string, options:string[],cancelOption:string, extraOptions:boolean, cancel:cancellationHandler<Type>, handleResponse:responseHandler<Type>, last: SurveyConversationHandler<Type>|undefined, ctx: ConversationContext){
    this.cancel = cancel;
    this.handleResponse = handleResponse;
    this.startMessage = startMessage;
    this.question = question;
    this.options = options;
    this.cancelOption = cancelOption;
    this.extraOptions = extraOptions;
    // templates/generics?
    this.data = last?.data;

    this.sendStartMessage(ctx);
    this.sendQuestion(ctx);
  }
  async handle(ctx:ConversationContext){
    if(ctx.tg.updateType !== 'message' && ctx.tg.updateType !== 'callback_query'){
      await this.sendQuestion(ctx);
      return;
    }
    if(ctx.tg.text !== undefined){
      if(ctx.tg.text === this.cancelOption){
        await this.cancel(this,ctx);
        return;
      }
      if(this.extraOptions || this.options.includes(ctx.tg.text)){
        await this.handleResponse(this, ctx, ctx.tg.text);
        return;
      }
    }
    await this.sendQuestion(ctx);
    
  }
  async sendStartMessage(ctx:ConversationContext){
    if(this.startMessage !== undefined)
      await ctx.tg.reply(this.startMessage)
  }
  async sendQuestion(ctx:ConversationContext){
    var buttons = [...this.options,this.cancelOption].map((elem)=>Markup.button.text(elem))
    await ctx.tg.reply(this.question,Markup.keyboard(buttons));
  }
  cancel:cancellationHandler<Type>;
  handleResponse:responseHandler<Type>;
  cancelOption:string;
  options:string[];
  extraOptions:boolean;
  startMessage:string|undefined;
  question:string;
  data:Type|undefined;
}

function createOptionsQuestionMapped<Type>(startMessage:string|undefined,question:string, optionsHandlers: Map<string, (current:SurveyConversationHandler<Type>,ctx:ConversationContext)=>void> ,cancelOption: string,cancel: cancellationHandler<Type>, last:SurveyConversationHandler<Type>|undefined, ctx:ConversationContext) : ConversationHandler{
  var options = Array.from(optionsHandlers.keys())
  return new OptionsSurveyHandler(
    startMessage,
    question,
    options,
    cancelOption,
    false,
    cancel,
    (current:SurveyConversationHandler<Type>, ctx:ConversationContext, response:string)=>{
      var handler = optionsHandlers.get(response)
      if(handler !== undefined){
        handler(current,ctx);
      }
    },
    last,
    ctx
  );
}

var defaultCancellationHandler = (current: SurveyConversationHandler<Pupil>, ctx:ConversationContext)=>{
  ctx.cancelConversation = true;
  ctx.showWelcomeMessage = true;
};
function createPupil(ctx:ConversationContext): Pupil{
  return {
    source: "tg",
    id: ctx.tg.from?.id,
    name: undefined,
    city: undefined,
    age: undefined, 
    request: undefined,
    contact: undefined
  }
}

function createSubmitQuestion(current: SurveyConversationHandler<Pupil>, ctx:ConversationContext){
  var message = `${Entered}
${EnterName}
${current.data?.name}

${EnterAge}
${current.data?.age}

${EnterCity}
${current.data?.city}

${EnterRequest}
${current.data?.request}

${EnterContact}
${current.data?.contact}
`;
  return createOptionsQuestionMapped(
    undefined,
    message,
    new Map<string, (current:SurveyConversationHandler<Pupil>,ctx:ConversationContext)=>void>([
      [ChangeName, (current:SurveyConversationHandler<Pupil>,ctx:ConversationContext)=>{
        var next = createNameQuestion(current,ctx,true);
        ctx.setNext(next);
      }],
      [ChangeAge, (current:SurveyConversationHandler<Pupil>,ctx:ConversationContext)=>{
        var next = createAgeQuestion(current,ctx,true);
        ctx.setNext(next);
      }],
      [ChangeCity, (current:SurveyConversationHandler<Pupil>,ctx:ConversationContext)=>{
        var next = createCityQuestion(current,ctx,true);
        ctx.setNext(next);
      }],
      [ChangeRequest, (current:SurveyConversationHandler<Pupil>,ctx:ConversationContext)=>{
        var next = createRequestQuestion(current,ctx,true);
        ctx.setNext(next);
      }],
      [ChangeContact, (current:SurveyConversationHandler<Pupil>,ctx:ConversationContext)=>{
        var next = createContactQuestion(current,ctx,true);
        ctx.setNext(next);
      }],
      [Submit, (current:SurveyConversationHandler<Pupil>,ctx:ConversationContext)=>{
        if(current.data !== undefined){
          var cont: string = "" 
          if(ctx.tg.from?.username){
            cont = ctx.tg.from.username
          }else if (ctx.tg.from?.id){
            cont = ctx.tg.from.id.toString()
          }
          current.data.contact = "("+ cont +") " + current.data.contact
          db.submit(current.data)
        }
        ctx.tg.reply(Thanks)
        ctx.cancelConversation = true;
        ctx.showWelcomeMessage = true;
      }]
    ]),
    Cancel,
    defaultCancellationHandler,
    current,
    ctx
  )
}
function createContactQuestion(current: SurveyConversationHandler<Pupil>, ctx:ConversationContext, edit:boolean){
  var options: string[] = []
  if(ctx.tg.from?.username !== undefined){
    options = [`@${ctx.tg.from?.username}`];
  }
  var callback: responseHandler<Pupil> = (current:SurveyConversationHandler<Pupil>, ctx:ConversationContext, response:string)=>{
    if(current.data === undefined){
      current.data = createPupil(ctx);
    }
    current.data.contact = response;
    var next = createSubmitQuestion(current, ctx);
    ctx.setNext(next)
  }
  return new OptionsSurveyHandler(
    undefined, 
    EnterContact,
    options,
    Cancel,
    true,
    defaultCancellationHandler,
    callback,
    current,
    ctx
  )
}

function createRequestQuestion(current: SurveyConversationHandler<Pupil>, ctx:ConversationContext, edit: boolean){
  var callback:responseHandler<Pupil>
  if(edit){
    callback = (current:SurveyConversationHandler<Pupil>, ctx:ConversationContext, response:string)=>{
      if(current.data === undefined){
        current.data = createPupil(ctx);
      }
      current.data.request = response;
      var next = createSubmitQuestion(current, ctx);
      ctx.setNext(next)
    }
  }else{
    callback = (current:SurveyConversationHandler<Pupil>, ctx:ConversationContext, response:string)=>{
      if(current.data === undefined){
        current.data = createPupil(ctx);
      }
      current.data.request = response;
      var next = createContactQuestion(current, ctx, false);
      ctx.setNext(next)
    }
  }
  return new OptionsSurveyHandler(
    undefined, 
    EnterRequest,
    [],
    Cancel,
    true,
    defaultCancellationHandler,
    callback,
    current,
    ctx
  )
}
function createCityQuestion(current: SurveyConversationHandler<Pupil>, ctx:ConversationContext, edit:boolean){
  var callback:responseHandler<Pupil>
  if(edit){
    callback = (current:SurveyConversationHandler<Pupil>, ctx:ConversationContext, response:string)=>{
      if(current.data === undefined){
        current.data = createPupil(ctx);
      }
      current.data.city = response;
      var next = createSubmitQuestion(current, ctx);
      ctx.setNext(next)
    }
  }else{
    callback = (current:SurveyConversationHandler<Pupil>, ctx:ConversationContext, response:string)=>{
      if(current.data === undefined){
        current.data = createPupil(ctx);
      }
      current.data.city = response;
      var next = createRequestQuestion(current, ctx, false);
      ctx.setNext(next)
    }
  }
  return new OptionsSurveyHandler(
    undefined, 
    EnterCity,
    [Yes, CityNo],
    Cancel,
    true,
    defaultCancellationHandler,
    callback,
    current,
    ctx
  )
}

function createAgeQuestion(current: SurveyConversationHandler<Pupil>, ctx:ConversationContext, edit:boolean){
  var callback:responseHandler<Pupil>
  if(edit){
    callback = (current:SurveyConversationHandler<Pupil>, ctx:ConversationContext, response:string)=>{
      if(current.data === undefined){
        current.data = createPupil(ctx);
      }
      current.data.age = response;
      var next = createSubmitQuestion(current, ctx);
      ctx.setNext(next)
    }
  }else{
    callback = (current:SurveyConversationHandler<Pupil>, ctx:ConversationContext, response:string)=>{
      if(current.data === undefined){
        current.data = createPupil(ctx);
      }
      current.data.age = response;
      var next = createCityQuestion(current, ctx, false);
      ctx.setNext(next)
    }
  }
  return new OptionsSurveyHandler(
    undefined, 
    EnterAge,
    [],
    Cancel,
    true,
    defaultCancellationHandler,
    callback,
    current,
    ctx
  )
}

function createNameQuestion(current: SurveyConversationHandler<Pupil>, ctx:ConversationContext, edit:boolean){
  var callback:responseHandler<Pupil>
  if(edit){
    callback = (current:SurveyConversationHandler<Pupil>, ctx:ConversationContext, response:string)=>{
      if(current.data === undefined){
        current.data = createPupil(ctx);
      }
      current.data.name = response;
      var next = createSubmitQuestion(current, ctx);
      ctx.setNext(next)
    }
  }else{
    callback = (current:SurveyConversationHandler<Pupil>, ctx:ConversationContext, response:string)=>{
      if(current.data === undefined){
        current.data = createPupil(ctx);
      }
      current.data.name = response;
      var next = createAgeQuestion(current, ctx, false);
      ctx.setNext(next)
    }
  }
  var options: string[] = []
  if(ctx.tg.from !== undefined){
    options = [`${ctx.tg.from.first_name} ${ctx.tg.from.last_name}`];
  }
  return new OptionsSurveyHandler(
    undefined, 
    EnterName,
    options,
    Cancel,
    true,
    defaultCancellationHandler,
    callback,
    current,
    ctx
  )
}

function createSurveyHandler(ctx:ConversationContext):ConversationHandler{
  return createOptionsQuestionMapped(
    WelcomeMessage,
    GoToSurvey,
    new Map<string, (current:SurveyConversationHandler<Pupil>,ctx:ConversationContext)=>void>([
      [Yes, (current:SurveyConversationHandler<Pupil>,ctx:ConversationContext)=>{
        current.data = createPupil(ctx);
        var next =  createNameQuestion(current,ctx,false)
        ctx.setNext(next)
      }]
    ]),
    Cancel,
    defaultCancellationHandler,
    undefined,
    ctx
  )
}

export class MainConversationHandler{

  async handle(ctx:TGContext){
    var convs = this.conversations
    var convctx: ConversationContext = {
      setNext(handler: ConversationHandler):void{
        convs.set(ctx.from?.id!, handler)
      },
      showWelcomeMessage:false,
      cancelConversation:false,
      tg: ctx,
      propagate: false
    }
    if(ctx.from !== undefined){
      var handler = this.conversations.get(ctx.from.id)
      if(handler !== undefined){
        await handler.handle(convctx);
        if(convctx.cancelConversation){
          this.conversations.delete(ctx.from.id)
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
        var conv = createSurveyHandler(ctx);
        ctx.setNext(conv)
      }else{
        this.showInfoMessage(ctx);
      }
    }
  }

  showInfoMessage(ctx: ConversationContext){
    ctx.tg.reply('Используйте /start',Markup.removeKeyboard());
  }

  constructor(){
    this.conversations = new Map<number, ConversationHandler>()
  }

  conversations: Map<number, ConversationHandler>
};

