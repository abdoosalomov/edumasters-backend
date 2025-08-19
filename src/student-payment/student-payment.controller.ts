import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { StudentPaymentService } from './student-payment.service';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import { FilterStudentPaymentDto } from './dto/filter-student-payment.dto';

@ApiTags('StudentPayments')
@Controller('student-payments')
export class StudentPaymentController {
    constructor(private readonly service: StudentPaymentService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new student payment' })
    create(@Body() dto: CreateStudentPaymentDto) {
        return this.service.create(dto, dto.adminId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all student payments with totals (total, cash, card)' })
    @ApiQuery({ name: 'studentId', required: false, type: Number })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'date', required: false, type: String, description: 'YYYY-MM-DD to filter by day' })
    findAll(@Query() filter: FilterStudentPaymentDto) {
        return this.service.findAll(filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get student payment by ID' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update student payment' })
    update(@Param('id') id: string, @Body() dto: UpdateStudentPaymentDto) {
        return this.service.update(+id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete student payment' })
    remove(@Param('id') id: string) {
        return this.service.remove(+id);
    }
}
