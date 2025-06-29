import { Module } from '@nestjs/common';
import { StudentPaymentService } from './student-payment.service';
import { StudentPaymentController } from './student-payment.controller';

@Module({
  controllers: [StudentPaymentController],
  providers: [StudentPaymentService],
})
export class StudentPaymentModule {}
