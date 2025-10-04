import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ChequeModule } from 'src/cheque/cheque.module';
import { SmsModule } from 'src/sms/sms.module';

@Module({
  imports: [PrismaModule, ChequeModule, SmsModule],
  providers: [CronService],
})
export class AppCronModule {} 