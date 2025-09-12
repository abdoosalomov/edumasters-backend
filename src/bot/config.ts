import "dotenv/config";

export const BOT_CONFIG = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
} as const;

export const TEACHERS_BOT_CONFIG = {
    token: process.env.TEACHERS_BOT_TOKEN,
    teacherAppURL: process.env.TEACHERS_BOT_TEACHER_APP_URL || "https://edu-masters-teachers.vercel.app/",
    adminPanelURL: process.env.TEACHERS_BOT_ADMIN_PANEL_URL || "https://edu-masters.vercel.app/"
} as const;

export const DIRECTOR_BOT_CONFIG = {
    token: process.env.DIRECTOR_BOT_TOKEN,
    directorAppURL: process.env.DIRECTOR_BOT_APP_URL || "https://edu-masters-director.vercel.app/"
} as const;