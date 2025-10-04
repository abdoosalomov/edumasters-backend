import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { sendMessage } from 'src/bot';
import { ChequeService } from 'src/cheque/cheque.service';
import { SmsService } from 'src/sms/sms.service';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly chequeService: ChequeService,
        private readonly smsService: SmsService,
    ) {}

    // @Cron('36 19 * * *')
    // async handleDailyChequeClosure() {
    //     this.logger.log('Starting daily cheque closure at 8:53 AM CDT (6:53 PM Uzbekistan time)...');
        
    //     try {
    //         await this.chequeService.closeChequeAutomatically();
    //         this.logger.log('Daily cheque closure completed successfully');
    //     } catch (error) {
    //         this.logger.error(`Failed to close daily cheques: ${error.message}`);
    //     }
    // }

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

                    // Send SMS if applicable
                    await this.sendSmsIfApplicable(notification);
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

    /**
     * Send SMS notification if the notification type supports it
     */
    private async sendSmsIfApplicable(notification: any) {
        try {
            // Check if this notification type should trigger SMS
            if (!this.smsService.shouldSendSms(notification.type)) {
                this.logger.log(`SMS not applicable for notification type: ${notification.type}`);
                return;
            }

            // Check if notification has phone number for SMS
            if (!notification.phoneNumber) {
                this.logger.log(`No phone number found for notification ${notification.id} - skipping SMS`);
                return;
            }

            this.logger.log(`Found phone: ${notification.phoneNumber} for notification ${notification.id}`);

            // Get student data for SMS fields (we still need this for dynamic fields)
            const parent = await this.prisma.parent.findFirst({
                where: { telegramId: notification.telegramId },
                include: { student: true }
            });

            if (!parent || !parent.student) {
                this.logger.log(`No student data found for notification ${notification.id} - skipping SMS`);
                return;
            }

            // Prepare SMS fields based on notification type
            const smsFields = await this.prepareSmsFields(notification, parent.student);
            
            // Send SMS notification
            await this.smsService.sendNotificationSmsWithDynamicFields(
                notification.type,
                notification.phoneNumber, // Use phone from notification
                smsFields
            );

            this.logger.log(`SMS sent for notification ${notification.id} to ${notification.phoneNumber}`);
        } catch (error) {
            this.logger.error(`Failed to send SMS for notification ${notification.id}: ${error.message}`);
            // Don't fail the entire notification if SMS fails
        }
    }

    /**
     * Prepare SMS fields based on notification type and student data
     */
    private async prepareSmsFields(notification: any, student: any): Promise<Record<string, string>> {
        const smsFields: Record<string, string> = {
            name: `${student.firstName} ${student.lastName}`
        };

        switch (notification.type) {
            case NotificationType.PAYMENT_REMINDER:
                const minBalance = ((await this.prisma.config.findFirst({
                    where: { key: 'MIN_STUDENT_BALANCE' },
                    select: { value: true }
                }))?.value ?? '-500000');
                const formattedMinBalance = new Intl.NumberFormat('de-DE').format(Number(minBalance));
                
                // Use field names that sort alphabetically to correct order:
                // field1 -> name (student name)
                // field2 -> debt (actual debt) 
                // field3 -> threshold (debt threshold)
                smsFields.debt = new Intl.NumberFormat('de-DE').format(Number(student.balance));
                smsFields.threshold = formattedMinBalance;
                break;

            case NotificationType.ATTENDANCE_REMINDER:
                // For poor attendance template (82250) - expects: field1=student, field2=firstDate, field3=secondDate
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                // Use field names that sort alphabetically to correct order:
                // field1 -> name (student name)
                // field2 -> firstDate (first date)
                // field3 -> secondDate (second date)
                smsFields.firstDate = yesterday.toLocaleDateString('uz-UZ');
                smsFields.secondDate = today.toLocaleDateString('uz-UZ');
                break;

            case NotificationType.PERFORMANCE_REMINDER:
                // Good attendance template (82249) - only needs student name
                break;

            case NotificationType.TEST_RESULT_REMINDER:
                // Test result template (82251) - will be handled by test-result service
                // This is just a fallback
                break;

            default:
                this.logger.log(`No specific SMS fields for notification type: ${notification.type}`);
        }

        return smsFields;
    }
}
