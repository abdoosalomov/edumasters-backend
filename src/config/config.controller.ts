import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { FilterConfigDto } from './dto/filter-config.dto';

@ApiTags('Config')
@Controller('config')
export class ConfigController {
  constructor(private readonly service: ConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Create new configuration' })
  create(@Body() dto: CreateConfigDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List configurations with optional filters' })
  @ApiQuery({ name: 'key', required: false, type: String, description: 'Search by configuration key' })
  @ApiQuery({ name: 'userId', required: false, type: Number, description: 'Filter by user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  findAll(@Query() filter: FilterConfigDto) {
    return this.service.findAll(filter);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get configuration by key (defaults to userId=0)' })
  findByKey(@Param('key') key: string, @Query('userId') userId?: string) {
    return this.service.findByKey(key, userId ? +userId : 0);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get configuration by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update configuration by ID' })
  update(@Param('id') id: string, @Body() dto: UpdateConfigDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete configuration by ID' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
} 