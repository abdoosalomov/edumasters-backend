import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaidSalaryService } from './paid-salary.service';
import { CreatePaidSalaryDto } from './dto/create-paid-salary.dto';
import { UpdatePaidSalaryDto } from './dto/update-paid-salary.dto';

@Controller('paid-salary')
export class PaidSalaryController {
  constructor(private readonly paidSalaryService: PaidSalaryService) {}

  @Post()
  create(@Body() createPaidSalaryDto: CreatePaidSalaryDto) {
    return this.paidSalaryService.create(createPaidSalaryDto);
  }

  @Get()
  findAll() {
    return this.paidSalaryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paidSalaryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaidSalaryDto: UpdatePaidSalaryDto) {
    return this.paidSalaryService.update(+id, updatePaidSalaryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paidSalaryService.remove(+id);
  }
}
