import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class DirectorStatisticsFilterDto {
  @ApiProperty({ 
    description: 'Start date for statistics (YYYY-MM-DD format)', 
    example: '2024-01-01',
    type: String
  })
  @Type(() => String)
  @IsDateString()
  fromDate: string;

  @ApiProperty({ 
    description: 'End date for statistics (YYYY-MM-DD format)', 
    example: '2024-12-31',
    type: String
  })
  @Type(() => String)
  @IsDateString()
  toDate: string;
}
