import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { StatisticsFilterDto } from './dto/statistics-filter.dto';

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly service: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get today\'s statistics for the system and teacher salary' })
  @ApiQuery({ name: 'teacherId', required: false, type: Number, description: 'Teacher ID to calculate salary for' })
  getStatistics(@Query() filter: StatisticsFilterDto) {
    return this.service.getStatistics(filter);
  }
} 