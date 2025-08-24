import { Bot, Context, MiddlewareFn } from 'grammy';
import { BOT_CONFIG } from './config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationStatus } from '@prisma/client';

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

bot.command('publish', async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    
    if (!telegramId) {
        await ctx.reply('❌ Sizning Telegram ID aniqlanmadi');
        return;
    }

    try {
        // Get admin IDs from config
        const adminConfigs = await prisma.config.findMany({
            where: {
                key: "TELEGRAM_BOT_ADMIN_ID",
            }, 
            select: {
                value: true
            }
        });

        // Check if current user is admin
        const adminIds = adminConfigs.map(config => config.value);
        const isAdmin = adminIds.includes(telegramId);

        if (!isAdmin) {
            // await ctx.reply('❌ Sizda bu amalni bajarish uchun ruxsat yo\'q');
            return;
        }

        // Extract message text after /publish
        const message = ctx.message?.text?.split('/publish')[1]?.trim();
        if (!message) {
            await ctx.reply('📝 Xabar matnini kiriting.\n\nMisol: /publish Assalomu alaykum! Bu barcha ota-onalar uchun xabar.');
            return;
        }

        // Create broadcast notification with telegramId = '0'
        await prisma.notification.create({
            data: {
                type: 'OTHER',
                message: message,
                telegramId: '0', // Special ID for broadcast
                status: NotificationStatus.WAITING
            }
        });

        await ctx.reply('✅ Xabar barcha ota-onalarga yuborish uchun navbatga qo\'shildi!');
        
    } catch (error) {
        console.error('Error in publish command:', error);
        await ctx.reply('❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
})

export async function initializeBot() {
    bot.use(loggingMiddleware)
    await bot.start();
}
