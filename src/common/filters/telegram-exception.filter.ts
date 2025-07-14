import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Catch()
export class TelegramExceptionFilter implements ExceptionFilter {
    constructor(private readonly configService: ConfigService) {}

    async catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            message = exception.message;
        }

        // Only send Telegram log for 500 errors
        if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
            const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
            const userId = this.configService.get<string>('TELEGRAM_USER_ID');
            if (botToken && userId) {
                const errorText = `🚨 Internal Server Error\nURL: ${request.url}\nMethod: ${request.method}\nMessage: ${message}\nStack: ${exception instanceof Error ? exception.stack : ''}`;
                try {
                    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        chat_id: userId,
                        text: errorText,
                    });
                } catch (e) {
                    // Ignore Telegram errors
                }
            }
        }

        response.status(status).json({
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
