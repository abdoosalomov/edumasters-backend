import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ChequeModule } from 'src/cheque/cheque.module';

@Module({
  imports: [PrismaModule, ChequeModule],
  providers: [CronService],
})
export class AppCronModule {} 