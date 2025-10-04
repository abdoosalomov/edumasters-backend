import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import axios from 'axios';
import { PhoneUtil } from '../common/utils/phone.util';

export enum SmsTemplateId {
    ABSENT_NOTIFICATION = '82248',
    GOOD_ATTENDANCE = '82249',
    POOR_ATTENDANCE = '82250',
    TEST_RESULT_NOTIFICATION = '82251',
    DEBT_NOTIFICATION = '82252',
}

export interface SmsVariables {
    [key: string]: string | undefined;
}

// Mapping between notification types and SMS template IDs
export const NOTIFICATION_TO_SMS_MAPPING: Record<NotificationType, SmsTemplateId | null> = {
    [NotificationType.ATTENDANCE_REMINDER]: SmsTemplateId.POOR_ATTENDANCE, // Poor attendance for multiple absences
    [NotificationType.PAYMENT_REMINDER]: SmsTemplateId.DEBT_NOTIFICATION,
    [NotificationType.PERFORMANCE_REMINDER]: SmsTemplateId.GOOD_ATTENDANCE,
    [NotificationType.TEST_RESULT_REMINDER]: SmsTemplateId.TEST_RESULT_NOTIFICATION,
    [NotificationType.GROUP_MESSAGE]: null, // No SMS template for group messages
    [NotificationType.OTHER]: null, // No SMS template for other messages
};

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private readonly baseUrl: string;
    private readonly basicAuthLogin: string;
    private readonly basicAuthPassword: string;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('SMS_BASE_URL') || '';
        this.basicAuthLogin = this.configService.get<string>('SMS_BASIC_AUTH_LOGIN') || '';
        this.basicAuthPassword = this.configService.get<string>('SMS_BASIC_AUTH_PASSWORD') || '';

        if (!this.baseUrl || !this.basicAuthLogin || !this.basicAuthPassword) {
            this.logger.error('SMS configuration is missing. Please check your environment variables.');
        }
    }

    async sendSms(templateId: SmsTemplateId, recipient: string, variables?: SmsVariables): Promise<void> {
        try {
            // Normalize phone number
            const normalizedPhone = PhoneUtil.normalizePhoneNumber(recipient);
            
            if (!PhoneUtil.isValidPhoneNumber(normalizedPhone)) {
                throw new Error(`Invalid phone number format: ${recipient} -> ${normalizedPhone}`);
            }

            const messageId = new Date().getTime().toString();
            
            const requestData = {
                messages: [
                    {
                        'template-id': templateId,
                        recipient: normalizedPhone,
                        'message-id': messageId,
                        variables: variables || {},
                    },
                ],
            };

            this.logger.log(`Sending SMS with template ${templateId} to ${normalizedPhone} (original: ${recipient})`);

            const response = await axios.post(this.baseUrl, requestData, {
                auth: {
                    username: this.basicAuthLogin,
                    password: this.basicAuthPassword,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            this.logger.log(`SMS sent successfully. Response: ${JSON.stringify(response.data)}`);
        } catch (error) {
            this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Check if a notification type should trigger SMS
     */
    shouldSendSms(notificationType: NotificationType): boolean {
        return NOTIFICATION_TO_SMS_MAPPING[notificationType] !== null;
    }

    /**
     * Get SMS template ID for a notification type
     */
    getSmsTemplateId(notificationType: NotificationType): SmsTemplateId | null {
        return NOTIFICATION_TO_SMS_MAPPING[notificationType];
    }

    /**
     * Send SMS notification for a specific notification type
     */
    async sendNotificationSms(
        notificationType: NotificationType,
        recipient: string,
        variables?: SmsVariables
    ): Promise<void> {
        const templateId = this.getSmsTemplateId(notificationType);
        if (!templateId) {
            this.logger.warn(`No SMS template configured for notification type: ${notificationType}`);
            return;
        }

        await this.sendSms(templateId, recipient, variables);
    }

    /**
     * Send SMS with dynamic field mapping
     * This method allows you to pass any number of fields dynamically
     */
    async sendSmsWithDynamicFields(
        templateId: SmsTemplateId,
        recipient: string,
        fields: Record<string, string>
    ): Promise<void> {
        // Convert fields to the expected format (field1, field2, etc.)
        const variables: SmsVariables = {};
        
        // Sort keys to ensure consistent field ordering
        const sortedKeys = Object.keys(fields).sort();
        
        sortedKeys.forEach((key, index) => {
            const fieldName = `field${index + 1}`;
            variables[fieldName] = fields[key];
        });

        this.logger.log(`Sending SMS with template ${templateId} to ${recipient} with ${Object.keys(fields).length} dynamic fields`);
        
        await this.sendSms(templateId, recipient, variables);
    }

    /**
     * Send notification SMS with dynamic field mapping
     */
    async sendNotificationSmsWithDynamicFields(
        notificationType: NotificationType,
        recipient: string,
        fields: Record<string, string>
    ): Promise<void> {
        const templateId = this.getSmsTemplateId(notificationType);
        if (!templateId) {
            this.logger.warn(`No SMS template configured for notification type: ${notificationType}`);
            return;
        }

        await this.sendSmsWithDynamicFields(templateId, recipient, fields);
    }

}
