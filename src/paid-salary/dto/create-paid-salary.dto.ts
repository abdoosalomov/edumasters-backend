import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreatePaidSalaryDto {
  @ApiProperty({ description: 'ID of the teacher to pay salary to' })
  @IsInt()
  @Min(1)
  teacherId: number;

  @ApiProperty({ description: 'Amount paid to the teacher', type: Number })
  @IsNumber()
  @Min(0)
  payed_amount: number;

  @ApiProperty({ description: 'Date when salary was paid (ISO string)', required: false })
  date?: string;
}
