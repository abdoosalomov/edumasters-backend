import { Bot, Context, MiddlewareFn, InlineKeyboard } from 'grammy';
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



/**
 * Helper function to check if user follows the required channel
 * @param ctx Grammy context
 * @param userId User's Telegram ID
 * @returns Promise<boolean> - true if user is a member, false otherwise
 */
async function checkChannelMembership(ctx: Context, userId: number): Promise<boolean> {
    try {
        const channelId = await getConfigValue('CHANNEL_ID');
        if (!channelId) return true; // If no channel configured, skip check
        
        const chatMember = await ctx.api.getChatMember(channelId, userId);
        return ['member', 'administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
        console.error('Error checking channel membership:', error);
        return false;
    }
}

/**
 * Helper function to get config value from database
 * @param key Config key
 * @returns Promise<string | null>
 */
async function getConfigValue(key: string): Promise<string | null> {
    try {
        const config = await prisma.config.findFirst({
            where: { key, userId: 0 }
        });
        return config?.value || null;
    } catch (error) {
        console.error(`Error fetching config ${key}:`, error);
        return null;
    }
}

export async function sendMessage(options: { message: string; chatId: string, parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' }) {
    const parse_mode = options?.parseMode || 'Markdown';
    await bot.api.sendMessage(options.chatId, options.message, { parse_mode });
}

// Handle /start command
bot.command('start', async (ctx) => {
    const telegramId = ctx.from?.id;
    
    if (!telegramId) {
        await ctx.reply('❌ Sizning Telegram ID aniqlanmadi');
        return;
    }
    
    try {
        // Check if user follows the required channel
        const isChannelMember = await checkChannelMembership(ctx, telegramId);
        
        if (!isChannelMember) {
            // Send channel request message with inline buttons
            const channelRequestMessage = await getConfigValue('CHANNEL_REQUEST_MESSAGE');
            const channelUrl = await getConfigValue('CHANNEL_URL');
            
            const keyboard = new InlineKeyboard()
                .url('Obuna bo\'lish', channelUrl || 'https://t.me/edumasters_lc')
                .row()
                .text('Tekshirish', 'check_subscription');

            await ctx.reply(
                channelRequestMessage || '🔔 Botdan foydalanish uchun avval rasmiy kanalimizga obuna bo\'ling!\n\nKanalimizda eng so\'nggi yangiliklar, muhim e\'lonlar va foydali ma\'lumotlarni bilib borasiz.\n\nObuna bo\'lgach, "Tekshirish" tugmasini bosing.',
                { 
                    reply_markup: keyboard,
                    parse_mode: 'HTML'
                }
            );
            return;
        }

        // User is subscribed, proceed with normal start flow
        await handleStartCommand(ctx, telegramId);
        
    } catch (error) {
        console.error('Start command error:', error);
        await ctx.reply('❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
    }
});

// Helper function to handle normal start command flow
async function handleStartCommand(ctx: Context, telegramId: number) {
    try {
        // Try to fetch start message from database
        const config = await prisma.config.findFirst({
            where: { key: 'CONFIG_START_MESSAGE', userId: 0 }
        });
        
        let welcomeMessage: string;
        
        if (config?.value) {
            // Use message from database and replace placeholder with actual telegram ID
            welcomeMessage = config.value.replace('{TELEGRAM_ID}', telegramId.toString());
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
}

// Handle subscription check callback
bot.callbackQuery('check_subscription', async (ctx) => {
    try {
        await ctx.answerCallbackQuery();
        
        const telegramId = ctx.from?.id;
        if (!telegramId) {
            await ctx.reply('❌ Sizning Telegram ID aniqlanmadi');
            return;
        }
        
        // Check if user now follows the channel
        const isChannelMember = await checkChannelMembership(ctx, telegramId);
        
        if (!isChannelMember) {
            await ctx.reply('❌ Siz hali kanalga obuna bo\'lmadingiz. Iltimos, avval obuna bo\'ling va qaytadan tekshiring.');
            return;
        }

        // User is now subscribed, proceed with normal start flow
        await handleStartCommand(ctx, telegramId);
        
    } catch (error) {
        console.error('Subscription check error:', error);
        await ctx.reply('❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
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
