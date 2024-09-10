import { Telegraf } from 'telegraf'
import { TGContext } from './context'
import { MainConversationHandler } from './conversation'

const handler:MainConversationHandler = new MainConversationHandler();

const bot: Telegraf<TGContext> = new Telegraf(process.env.BOT_TOKEN as string);

bot.use((ctx:TGContext)=>handler.handle(ctx))
bot.launch();
