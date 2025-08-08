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
} from '@nestjs/common';
import { ChequeService } from './cheque.service';
import { CreateChequeDto } from './dto/create-cheque.dto';
import { UpdateChequeDto } from './dto/update-cheque.dto';
import { FilterChequeDto } from './dto/filter-cheque.dto';

@Controller('cheques')
export class ChequeController {
  constructor(private readonly chequeService: ChequeService) {}

  @Post()
  async create(@Body() createChequeDto: CreateChequeDto, @Request() req) {
    return this.chequeService.create(createChequeDto, req.user.id);
  }

  @Post('close-daily')
  async closeDailyCheque(@Request() req) {
    return this.chequeService.closeDailyCheque(req.user.id);
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
