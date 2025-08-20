import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationStatus } from '@prisma/client';
import { sendMessage } from 'src/bot';
import { ChequeService } from 'src/cheque/cheque.service';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly chequeService: ChequeService,
    ) {}

    @Cron('35 19 * * *')
    async handleDailyChequeClosure() {
        this.logger.log('Starting daily cheque closure at 8:53 AM CDT (6:53 PM Uzbekistan time)...');
        
        try {
            await this.chequeService.closeChequeAutomatically();
            this.logger.log('Daily cheque closure completed successfully');
        } catch (error) {
            this.logger.error(`Failed to close daily cheques: ${error.message}`);
        }
    }

    @Cron(CronExpression.EVERY_5_SECONDS)
    async sendNotifications() {
        const notifications = await this.getNotifications();
        this.logger.log(`Notifications in WAITING status: ${notifications}`)
        for (const notification of notifications) {
            await this.prisma.notification.update({
                where: { id: notification.id },
                data: { status: NotificationStatus.SENDING },
            });

            try {
                await sendMessage({
                    message: notification.message,
                    chatId: notification.telegramId,
                });
                this.logger.log(`Sent notification ${notification.id} to ${notification.telegramId}`);
            } catch (error) {
                this.logger.error(`Failed to send notification ${notification.id}: ${error.message}`);
                await this.prisma.notification.update({
                    where: { id: notification.id },
                    data: { status: NotificationStatus.ERROR, error: error.message },
                });
            } finally {
                await this.prisma.notification.update({
                    where: { id: notification.id },
                    data: { status: NotificationStatus.SENT },
                });
            }
        }
    }

    async getNotifications() {
        const notifications = await this.prisma.notification.findMany({
            where: {
                status: NotificationStatus.WAITING,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return notifications;
    }
}
