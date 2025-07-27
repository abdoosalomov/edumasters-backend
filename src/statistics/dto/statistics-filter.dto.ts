import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StatisticsFilterDto {
  @ApiPropertyOptional({ description: 'Teacher ID to get today\'s statistics for' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacherId?: number;
} 