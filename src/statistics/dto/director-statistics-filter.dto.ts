import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class DirectorStatisticsFilterDto {
  @ApiPropertyOptional({ 
    description: 'Start date for statistics (YYYY-MM-DD format). If not provided, will get all-time data', 
    example: '2024-01-01',
    type: String,
    required: false
  })
  @IsOptional()
  @Type(() => String)
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ 
    description: 'End date for statistics (YYYY-MM-DD format). If not provided, will get all-time data', 
    example: '2024-12-31',
    type: String,
    required: false
  })
  @IsOptional()
  @Type(() => String)
  @IsDateString()
  toDate?: string;
}
