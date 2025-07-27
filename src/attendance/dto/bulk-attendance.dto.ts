import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAttendanceDto } from './create-attendance.dto';

export class BulkAttendanceDto {
  @ApiProperty({ type: [CreateAttendanceDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceDto)
  attendances: CreateAttendanceDto[];
} 