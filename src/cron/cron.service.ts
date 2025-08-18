import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { GroupDayType, NotificationStatus } from '@prisma/client';
import { sendMessage } from 'src/bot';
import { ChequeService } from 'src/cheque/cheque.service';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly chequeService: ChequeService,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailyBalanceDeduction() {
        this.logger.log('Starting daily balance deduction...');

        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Determine today's day type
        let todayDayType: GroupDayType | null = null;
        if (dayOfWeek === 0) {
            // Sunday - no lessons
            this.logger.log('Sunday - no lessons today');
            return;
        } else if (dayOfWeek % 2 === 0) {
            todayDayType = GroupDayType.EVEN;
        } else {
            todayDayType = GroupDayType.ODD;
        }

        this.logger.log(`Today is ${todayDayType} day`);

        // Get default price from config if needed
        const defaultPriceConfig = await this.prisma.config.findFirst({
            where: { key: 'DEFAULT_LESSON_PRICE', userId: 0 },
        });
        const defaultPrice = defaultPriceConfig ? Number(defaultPriceConfig.value) : 0;

        if (!defaultPrice) {
            this.logger.warn('No default lesson price configured');
        }

        // Get all active groups for today's day type
        const groups = await this.prisma.group.findMany({
            where: {
                dayType: todayDayType,
                isActive: true,
            },
            include: {
                students: {
                    where: { isActive: true },
                },
            },
        });

        let totalDeductions = 0;
        let totalStudents = 0;

        for (const group of groups) {
            const lessonPrice = group.price ? Number(group.price) : defaultPrice;

            if (!lessonPrice) {
                this.logger.warn(`No price configured for group ${group.id} and no default price`);
                continue;
            }

            for (const student of group.students) {
                try {
                    // Deduct lesson price from student's balance
                    const updatedStudent = await this.prisma.student.update({
                        where: { id: student.id },
                        data: {
                            balance: {
                                decrement: lessonPrice,
                            },
                        },
                    });

                    totalDeductions++;
                    this.logger.log(
                        `Deducted ${lessonPrice} from student ${student.id} (${student.firstName} ${student.lastName}) - New balance: ${updatedStudent.balance}`,
                    );
                } catch (error) {
                    this.logger.error(`Failed to deduct balance for student ${student.id}: ${error.message}`);
                }
            }

            totalStudents += group.students.length;
        }

        this.logger.log(
            `Daily balance deduction completed. Processed ${totalDeductions} students from ${groups.length} groups. Total students: ${totalStudents}`,
        );
    }

    @Cron('45 10 * * *')
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
