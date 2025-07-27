import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaidSalaryService } from './paid-salary.service';
import { CreatePaidSalaryDto } from './dto/create-paid-salary.dto';
import { UpdatePaidSalaryDto } from './dto/update-paid-salary.dto';

@ApiTags('PaidSalary')
@Controller('paid-salary')
export class PaidSalaryController {
  constructor(private readonly paidSalaryService: PaidSalaryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new paid salary record' })
  create(@Body() createPaidSalaryDto: CreatePaidSalaryDto) {
    return this.paidSalaryService.create(createPaidSalaryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all paid salary records' })
  findAll() {
    return this.paidSalaryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get paid salary record by ID' })
  findOne(@Param('id') id: string) {
    return this.paidSalaryService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update paid salary record by ID' })
  update(@Param('id') id: string, @Body() updatePaidSalaryDto: UpdatePaidSalaryDto) {
    return this.paidSalaryService.update(+id, updatePaidSalaryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete paid salary record by ID' })
  remove(@Param('id') id: string) {
    return this.paidSalaryService.remove(+id);
  }
}
