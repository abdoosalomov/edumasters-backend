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

    @Cron('36 19 * * *')
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
        if(notifications.length === 0) return;
        this.logger.log(`Notifications in WAITING status: ${notifications.length}`)
        
        // Log notification types for debugging
        const notificationTypes = notifications.map(n => n.type);
        this.logger.log(`Notification types: ${notificationTypes.join(', ')}`);
        
        for (const notification of notifications) {
            this.logger.log(`Processing notification ${notification.id}: Type=${notification.type}, TelegramID=${notification.telegramId}`);
            
            await this.prisma.notification.update({
                where: { id: notification.id },
                data: { status: NotificationStatus.SENDING },
            });

            try {
                // Check if this is a broadcast message (telegramId = '0')
                if (notification.telegramId === '0') {
                    this.logger.log(`Handling broadcast message for notification ${notification.id}`);
                    await this.handleBroadcastMessage(notification);
                } else {
                    // Send regular notification
                    this.logger.log(`Sending notification ${notification.id} to ${notification.telegramId}`);
                    await sendMessage({
                        message: notification.message,
                        chatId: notification.telegramId,
                        parseMode: "HTML"
                    });
                    this.logger.log(`Sent notification ${notification.id} to ${notification.telegramId}`);
                }
                
                // Mark as sent
                await this.prisma.notification.update({
                    where: { id: notification.id },
                    data: { status: NotificationStatus.SENT },
                });
                
            } catch (error) {
                this.logger.error(`Failed to send notification ${notification.id}: ${error.message}`);
                await this.prisma.notification.update({
                    where: { id: notification.id },
                    data: { status: NotificationStatus.ERROR, error: error.message },
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

    private async handleBroadcastMessage(notification: any) {
        // Get all parent telegram IDs
        const parents = await this.prisma.parent.findMany({
            select: {
                telegramId: true
            },
            distinct: ['telegramId']
        });

        this.logger.log(`Broadcasting message to ${parents.length} parents`);

        let successCount = 0;
        let failureCount = 0;

        // Send to all parents (don't save individual sends to database)
        for (const parent of parents) {
            try {
                await sendMessage({
                    message: notification.message,
                    chatId: parent.telegramId,
                    parseMode: "HTML"
                });
                successCount++;
            } catch (error) {
                this.logger.error(`Failed to broadcast to ${parent.telegramId}: ${error.message}`);
                failureCount++;
            }
        }

        this.logger.log(`Broadcast completed. Success: ${successCount}, Failures: ${failureCount}`);
    }
}
