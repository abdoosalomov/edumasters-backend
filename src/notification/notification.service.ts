import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { FilterNotificationDto } from './dto/filter-notification.dto';
import { SmsService } from '../sms/sms.service';
import { ChannelType } from './enums/channel-type.enum';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  async create(dto: CreateNotificationDto) {
    // If studentId provided ensure exists
    if (dto.studentId) {
      const studentExists = await this.prisma.student.count({ where: { id: dto.studentId } });
      if (!studentExists) throw new BadRequestException(`Student with ID ${dto.studentId} not found`);
    }

    if (dto.parentId) {
      const parentExists = await this.prisma.parent.count({ where: { id: dto.parentId } });
      if (!parentExists) throw new BadRequestException(`Parent with ID ${dto.parentId} not found`);
    }

    const type = dto.type ?? NotificationType.OTHER;

    let message = dto.message;
    if (!message) {
      const cfg = await this.prisma.config.findFirst({ where: { key: type, userId: 0 } });
      message = cfg?.value ?? 'Message';
    }

    let telegramId: string | undefined = undefined;
    if (dto.parentId) {
      const parent = await this.prisma.parent.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException(`Parent with ID ${dto.parentId} not found`);
      telegramId = parent.telegramId;
    }

    if (!telegramId) throw new BadRequestException('telegramId could not be determined');

    const notification = await this.prisma.notification.create({
      data: {
        type,
        message,
        status: NotificationStatus.WAITING,
        telegramId,
        phoneNumber: dto.phoneNumber, // Add phone number if provided
      },
    });

    return { data: notification };
  }

  async findAll(filter: FilterNotificationDto) {
    const { page, limit, status, type } = filter;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const total = await this.prisma.notification.count({ where });

    const notifications = await this.prisma.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: number, dto: UpdateNotificationDto) {
    const exists = await this.prisma.notification.findUnique({ where: { id } });
    if (!exists) throw new BadRequestException(`Notification with ID ${id} not found`);

    const updated = await this.prisma.notification.update({
      where: { id },
      data: dto,
    });

    return { data: updated };
  }

  /**
   * Create notification with dual channel support (Telegram + SMS)
   * This method will send both Telegram and SMS notifications when applicable
   */
  async createDualNotification(
    type: NotificationType,
    telegramId: string,
    message: string,
    studentPhoneNumber?: string,
    smsVariables?: { [key: string]: string | undefined }
  ) {
    // Create Telegram notification
    const notification = await this.prisma.notification.create({
      data: {
        type,
        message,
        status: NotificationStatus.WAITING,
        telegramId,
      },
    });

    // Send SMS if applicable and student phone number provided
    if (studentPhoneNumber && this.smsService.shouldSendSms(type)) {
      try {
        await this.smsService.sendNotificationSms(type, studentPhoneNumber, smsVariables);
      } catch (error) {
        // Log SMS error but don't fail the notification creation
        console.error(`Failed to send SMS for notification ${notification.id}:`, error);
      }
    }

    return { data: notification };
  }

  /**
   * Create notification with dual channel support using dynamic fields
   * This method allows passing any number of SMS fields dynamically
   */
  async createDualNotificationWithDynamicFields(
    type: NotificationType,
    telegramId: string,
    message: string,
    studentPhoneNumber?: string,
    smsFields?: Record<string, string>
  ) {
    // Create Telegram notification
    const notification = await this.prisma.notification.create({
      data: {
        type,
        message,
        status: NotificationStatus.WAITING,
        telegramId,
      },
    });

    // Send SMS if applicable and student phone number provided
    if (studentPhoneNumber && this.smsService.shouldSendSms(type) && smsFields) {
      try {
        await this.smsService.sendNotificationSmsWithDynamicFields(type, studentPhoneNumber, smsFields);
      } catch (error) {
        // Log SMS error but don't fail the notification creation
        console.error(`Failed to send SMS for notification ${notification.id}:`, error);
      }
    }

    return { data: notification };
  }

  /**
   * Create notifications for all parents of a student with dual channel support
   * This method will send both Telegram and SMS notifications when applicable
   */
  async createStudentDualNotifications(
    studentId: number,
    type: NotificationType,
    message: string,
    smsVariables?: { [key: string]: string | undefined }
  ) {
    // Get student with parents
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { parents: true },
    });

    if (!student) {
      throw new BadRequestException(`Student with ID ${studentId} not found`);
    }

    if (!student.parents || student.parents.length === 0) {
      throw new BadRequestException(`Student with ID ${studentId} has no parents to notify`);
    }

    const notifications: any[] = [];

    // Create notifications for each parent
    for (const parent of student.parents) {
      const notification = await this.createDualNotification(
        type,
        parent.telegramId,
        message,
        student.phoneNumber, // Use student's phone number for SMS
        smsVariables
      );
      notifications.push(notification.data);
    }

    return { data: notifications };
  }

  /**
   * Create notifications for all parents of a student with dynamic SMS fields
   * This method allows passing any number of SMS fields dynamically
   */
  async createStudentDualNotificationsWithDynamicFields(
    studentId: number,
    type: NotificationType,
    message: string,
    smsFields?: Record<string, string>
  ) {
    // Get student with parents
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { parents: true },
    });

    if (!student) {
      throw new BadRequestException(`Student with ID ${studentId} not found`);
    }

    if (!student.parents || student.parents.length === 0) {
      throw new BadRequestException(`Student with ID ${studentId} has no parents to notify`);
    }

    const notifications: any[] = [];

    // Create notifications for each parent
    for (const parent of student.parents) {
      const notification = await this.createDualNotificationWithDynamicFields(
        type,
        parent.telegramId,
        message,
        student.phoneNumber, // Use student's phone number for SMS
        smsFields
      );
      notifications.push(notification.data);
    }

    return { data: notifications };
  }

  /**
   * Create notification with specific channel type (Telegram, SMS, or Dual)
   */
  async createChannelNotification(
    type: NotificationType,
    telegramId: string,
    message: string,
    channelType: ChannelType,
    studentPhoneNumber?: string,
    smsFields?: Record<string, string>
  ) {
    switch (channelType) {
      case ChannelType.TELEGRAM:
        return this.createTelegramOnlyNotification(type, telegramId, message);
      
      case ChannelType.SMS:
        return this.createSmsOnlyNotification(type, studentPhoneNumber, smsFields);
      
      case ChannelType.DUAL:
        return this.createDualNotificationWithDynamicFields(type, telegramId, message, studentPhoneNumber, smsFields);
      
      default:
        throw new BadRequestException(`Invalid channel type: ${channelType}`);
    }
  }

  /**
   * Create Telegram-only notification
   */
  private async createTelegramOnlyNotification(
    type: NotificationType,
    telegramId: string,
    message: string
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        type,
        message,
        status: NotificationStatus.WAITING,
        telegramId,
      },
    });

    return { data: notification };
  }

  /**
   * Create SMS-only notification
   */
  private async createSmsOnlyNotification(
    type: NotificationType,
    studentPhoneNumber?: string,
    smsFields?: Record<string, string>
  ) {
    if (!studentPhoneNumber) {
      throw new BadRequestException('Student phone number is required for SMS notifications');
    }

    if (!this.smsService.shouldSendSms(type)) {
      throw new BadRequestException(`SMS template not available for notification type: ${type}`);
    }

    try {
      await this.smsService.sendNotificationSmsWithDynamicFields(type, studentPhoneNumber, smsFields || {});
      return { 
        data: { 
          message: 'SMS sent successfully',
          type,
          channel: 'SMS',
          recipient: studentPhoneNumber
        } 
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Create notifications for all parents of a student with specific channel type
   */
  async createStudentChannelNotifications(
    studentId: number,
    type: NotificationType,
    message: string,
    channelType: ChannelType,
    smsFields?: Record<string, string>
  ) {
    // Get student with parents
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { parents: true },
    });

    if (!student) {
      throw new BadRequestException(`Student with ID ${studentId} not found`);
    }

    if (!student.parents || student.parents.length === 0) {
      throw new BadRequestException(`Student with ID ${studentId} has no parents to notify`);
    }

    const notifications: any[] = [];

    // Create notifications for each parent
    for (const parent of student.parents) {
      const notification = await this.createChannelNotification(
        type,
        parent.telegramId,
        message,
        channelType,
        student.phoneNumber,
        smsFields
      );
      notifications.push(notification.data);
    }

    return { data: notifications };
  }
} 