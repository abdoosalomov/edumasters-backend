import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus, PerformanceStatus } from '@prisma/client';

@ApiTags('Attendance')
@Controller('attendances')
export class AttendanceController {
    constructor(private readonly service: AttendanceService) {}

    @Post()
    @ApiOperation({ summary: 'Create attendance record' })
    create(@Body() dto: CreateAttendanceDto) {
        return this.service.create(dto);
    }

    @Post('bulk')
    @ApiOperation({ summary: 'Create multiple attendance records at once' })
    createBulk(@Body() dto: BulkAttendanceDto) {
        return this.service.createBulk(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List attendance records with optional filters' })
    @ApiQuery({ name: 'studentId', required: false, type: Number, description: 'Filter by student ID' })
    @ApiQuery({ name: 'groupId', required: false, type: Number, description: 'Filter by group ID' })
    @ApiQuery({ name: 'status', required: false, enum: AttendanceStatus, description: 'Filter by attendance status' })
    @ApiQuery({ name: 'performance', required: false, enum: PerformanceStatus, description: 'Filter by performance status' })
    @ApiQuery({ name: 'date', required: false, type: String, description: 'Filter by date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    findAll(@Query() filter: FilterAttendanceDto) {
        return this.service.findAll(filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get attendance record by ID' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update attendance by ID' })
    update(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
        return this.service.update(+id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete attendance by ID' })
    remove(@Param('id') id: string) {
        return this.service.remove(+id);
    }
}
