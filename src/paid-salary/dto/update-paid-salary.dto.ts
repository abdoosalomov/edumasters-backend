import { PartialType } from '@nestjs/swagger';
import { CreatePaidSalaryDto } from './create-paid-salary.dto';

export class UpdatePaidSalaryDto extends PartialType(CreatePaidSalaryDto) {}
