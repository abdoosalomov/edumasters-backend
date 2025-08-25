import "dotenv/config";

export const BOT_CONFIG = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
} as const;

export const TEACHERS_BOT_CONFIG = {
    token: process.env.TEACHERS_BOT_TOKEN
} as const;