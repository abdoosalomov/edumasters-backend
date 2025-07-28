import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { FilterNotificationDto } from './dto/filter-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

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
} 