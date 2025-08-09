import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ChequeService } from './cheque.service';
import { CreateChequeDto } from './dto/create-cheque.dto';
import { UpdateChequeDto } from './dto/update-cheque.dto';
import { FilterChequeDto } from './dto/filter-cheque.dto';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Cheques')
@Controller('cheques')
export class ChequeController {
  constructor(private readonly chequeService: ChequeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a cheque for a given date (defaults to today)' })
  @ApiQuery({ name: 'adminId', required: false, type: Number, description: 'Admin ID (fallback if no auth token)' })
  async create(@Body() createChequeDto: CreateChequeDto, @Request() req, @Query('adminId') adminId?: string) {
    const id = adminId ? +adminId : req.user?.id;
    if (!id) {
      throw new BadRequestException('adminId is required (provide via auth token or adminId query param)');
    }
    return this.chequeService.create(createChequeDto, id);
  }

  @Post('close-daily')
  @ApiOperation({ summary: 'Close today\'s daily cheque and send report' })
  @ApiQuery({ name: 'adminId', required: false, type: Number, description: 'Admin ID (fallback if no auth token)' })
  async closeDailyCheque(@Request() req, @Query('adminId') adminId?: string) {
    const id = adminId ? +adminId : req.user?.id;
    if (!id) {
      throw new BadRequestException('adminId is required (provide via auth token or adminId query param)');
    }
    return this.chequeService.closeDailyCheque(id);
  }

  @Get()
  async findAll(@Query() filter: FilterChequeDto) {
    return this.chequeService.findAll(filter);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.chequeService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateChequeDto: UpdateChequeDto) {
    return this.chequeService.update(+id, updateChequeDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.chequeService.remove(+id);
  }
}
