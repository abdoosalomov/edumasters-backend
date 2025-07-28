import "dotenv/config";

export const BOT_CONFIG = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
} as const;