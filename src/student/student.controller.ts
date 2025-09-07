import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto, OrderDirection } from './dto/filter-student.dto';
import { PaymentNotificationDto } from './dto/payment-notification.dto';
import { NotificationType } from '@prisma/client';

@ApiTags('Students')
@Controller('students')
export class StudentController {
    constructor(private readonly studentService: StudentService) {}

    @Post()
    @ApiOperation({ summary: 'Create new student' })
    create(@Body() dto: CreateStudentDto) {
        return this.studentService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all students' })
    @ApiQuery({ name: 'search', required: false, description: 'Search by name or phone number' })
    @ApiQuery({ name: 'groupId', required: false, type: Number, description: 'Filter by group ID' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({
        name: 'orderBy',
        required: false,
        enum: ['createdAt', 'updatedAt', 'firstName', 'lastName'],
        description: 'Field to order by',
    })
    @ApiQuery({ name: 'order', required: false, enum: OrderDirection, description: 'Sort direction' })
    findAll(@Query() filter: FilterStudentDto) {
        return this.studentService.findAll(filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get student by ID' })
    findOne(@Param('id') id: string) {
        return this.studentService.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update student by ID' })
    update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
        return this.studentService.update(+id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deactivate student (force=false) or permanently delete (force=true)' })
    remove(@Param('id') id: string, @Query('force') force?: string) {
        return this.studentService.remove(+id, force === 'true');
    }

    @Patch(':id/restore')
    @ApiOperation({ summary: 'Restore soft deleted student by ID' })
    restore(@Param('id') id: string) {
        return this.studentService.restore(+id);
    }

    @Post(':id/notification')
    @ApiOperation({ summary: 'Queue notification for student (type in query)' })
    @ApiQuery({ name: 'type', enum: ['PAYMENT_REMINDER', 'PERFORMANCE_REMINDER', 'ATTENDANCE_REMINDER', 'TEST_RESULT_REMINDER', 'GROUP_MESSAGE', 'OTHER'] })
    createNotification(
        @Param('id') id: string,
        @Query('type') type: NotificationType,
        @Body() dto: PaymentNotificationDto,
    ) {
        return this.studentService.createNotification(+id, type, dto);
    }
}
