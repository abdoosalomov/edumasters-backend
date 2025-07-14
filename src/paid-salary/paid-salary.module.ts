import { Module } from '@nestjs/common';
import { PaidSalaryService } from './paid-salary.service';
import { PaidSalaryController } from './paid-salary.controller';

@Module({
  controllers: [PaidSalaryController],
  providers: [PaidSalaryService],
})
export class PaidSalaryModule {}
