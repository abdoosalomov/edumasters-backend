import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@ApiTags('Attendance')
@Controller('attendances')
export class AttendanceController {
    constructor(private readonly service: AttendanceService) {}

    @Post()
    @ApiOperation({ summary: 'Create attendance record' })
    create(@Body() dto: CreateAttendanceDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List attendance records with optional filters' })
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
