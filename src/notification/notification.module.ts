import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [PrismaModule, SmsModule],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {} 