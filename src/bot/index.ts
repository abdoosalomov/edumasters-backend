import { Bot, Context, MiddlewareFn } from 'grammy';
import { BOT_CONFIG } from './config';

const bot = new Bot(BOT_CONFIG.token!);

const loggingMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
    const from = ctx.from?.username || ctx.from?.id;
    const chat = ctx.chat?.id;
    const type = ctx.update?.['message'] ? 'message' : Object.keys(ctx.update)[0];

    console.log(`[${new Date().toISOString()}] Update Type: ${type}`);
    console.log(`From: ${from}, Chat ID: ${chat}`);
    console.log('Update:', JSON.stringify(ctx.update, null, 2));

    await next(); // Proceed to the next middleware
};



export async function sendMessage(options: { message: string; chatId: string, parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' }) {
    const parse_mode = options?.parseMode || 'Markdown';
    await bot.api.sendMessage(options.chatId, options.message, { parse_mode });
}

export async function initializeBot() {
    bot.use(loggingMiddleware)
    await bot.start();
}
