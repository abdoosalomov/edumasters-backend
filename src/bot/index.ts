import { Bot, Context, MiddlewareFn } from 'grammy';
import { BOT_CONFIG } from './config';
import { PrismaService } from '../prisma/prisma.service';

const bot = new Bot(BOT_CONFIG.token!);
const prisma = new PrismaService();

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

// Handle /start command
bot.command('start', async (ctx) => {
    const telegramId = ctx.from?.id;
    
    try {
        // Try to fetch start message from database
        const config = await prisma.config.findFirst({
            where: { key: 'CONFIG_START_MESSAGE', userId: 0 }
        });
        
        let welcomeMessage: string;
        
        if (config?.value) {
            // Use message from database and replace placeholder with actual telegram ID
            welcomeMessage = config.value.replace('{TELEGRAM_ID}', telegramId?.toString() || 'N/A');
        } else {
            // Fallback message if not found in database
            welcomeMessage = `<b>Assalomu alaykum, hurmatli ota-ona!</b>

Edu Masters oilasiga xush kelibsiz! Ushbu bot orqali siz farzandingizning ta'lim jarayonidagi yangiliklarni birinchi bo'lib bilib borasiz.

Sizning telegram ID'ingiz: <code>${telegramId}</code>

📌 <b>Iltimos, chatni o'chirib yubormang. </b>Farzandingizning o'qishi bo'yicha barcha yangiliklarni shu yerda yoritib boramiz.`;
        }

        await ctx.reply(welcomeMessage, { parse_mode: 'HTML' });
    } catch (error) {
        console.error('Error fetching start message from database:', error);
        
        // Fallback message in case of database error
        const fallbackMessage = `<b>Assalomu alaykum, hurmatli ota-ona!</b>

Edu Masters oilasiga xush kelibsiz! Ushbu bot orqali siz farzandingizning ta'lim jarayonidagi yangiliklarni birinchi bo'lib bilib borasiz.

Sizning telegram ID'ingiz: <code>${telegramId}</code>

📌 <b>Iltimos, chatni o'chirib yubormang. </b>Farzandingizning o'qishi bo'yicha barcha yangiliklarni shu yerda yoritib boramiz.`;

        await ctx.reply(fallbackMessage, { parse_mode: 'HTML' });
    }
});

export async function initializeBot() {
    bot.use(loggingMiddleware)
    await bot.start();
}
