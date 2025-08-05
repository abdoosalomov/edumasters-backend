import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { StatisticsFilterDto } from './dto/statistics-filter.dto';

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly service: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get monthly statistics for a specific teacher' })
  @ApiQuery({ name: 'teacherId', required: true, type: Number, description: 'Teacher ID to get statistics for' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Year for statistics (e.g., 2024)', example: 2024 })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Month for statistics (1-12)', example: 12 })
  getStatistics(@Query() filter: StatisticsFilterDto) {
    return this.service.getStatistics(filter);
  }
} 