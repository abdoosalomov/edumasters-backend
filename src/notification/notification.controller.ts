import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationDto } from './dto/filter-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { ChannelType } from './enums/channel-type.enum';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create new notification (generic)' })
  create(@Body() dto: CreateNotificationDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
  @ApiQuery({ name: 'type', required: false, enum: ['PAYMENT_REMINDER', 'PERFORMANCE_REMINDER', 'ATTENDANCE_REMINDER', 'TEST_RESULT_REMINDER', 'GROUP_MESSAGE', 'OTHER'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() filter: FilterNotificationDto) {
    return this.service.findAll(filter);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update notification status / error' })
  update(@Param('id') id: string, @Body() dto: UpdateNotificationDto) {
    return this.service.update(+id, dto);
  }

  // Convenience route specifically for payment reminders
  @Post('payment-reminder')
  @ApiOperation({ summary: 'Create payment reminder notifications for all parents of the student' })
  @ApiQuery({ name: 'channel', enum: ['telegram', 'sms', 'dual'], required: false, description: 'Channel type: telegram (Telegram only), sms (SMS only), dual (both channels). Default: dual' })
  createPaymentReminder(
    @Body() body: { studentId: number; message?: string },
    @Query('channel') channel: ChannelType = ChannelType.DUAL
  ) {
    const defaultMessage = 'Sizda toʼlov muddati kelib qoldi. Iltimos, dars toʼlovini amalga oshiring.';
    const dto: CreateNotificationDto = {
      ...body,
      type: NotificationType.PAYMENT_REMINDER,
      message: body.message ?? defaultMessage,
    };
    return this.service.create(dto);
  }
} 