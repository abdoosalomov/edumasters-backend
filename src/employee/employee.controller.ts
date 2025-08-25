import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, ParseBoolPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { FilterEmployeeDto } from './dto/filter-employee.dto';

@ApiTags('employees')
@Controller('employee')
export class EmployeeController {
    constructor(private readonly employeeService: EmployeeService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new employee' })
    @ApiResponse({ status: 201, description: 'Employee created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    create(@Body() createEmployeeDto: CreateEmployeeDto) {
        return this.employeeService.create(createEmployeeDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all employees with filtering and pagination' })
    @ApiResponse({ status: 200, description: 'Employees retrieved successfully' })
    findAll(@Query() filter: FilterEmployeeDto) {
        return this.employeeService.findAll(filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get employee by ID' })
    @ApiResponse({ status: 200, description: 'Employee retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.employeeService.findOne(id);
    }

    @Get(':id/salary-history')
    @ApiOperation({ summary: 'Get employee salary history and calculations' })
    @ApiResponse({ status: 200, description: 'Salary history retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    getSalaryHistory(@Param('id', ParseIntPipe) id: number) {
        return this.employeeService.getSalaryHistory(id);
    }

    @Get('salary-report')
    @ApiOperation({ summary: 'Get salary report for all employees for a given month/year' })
    @ApiResponse({ status: 200, description: 'Salary report generated successfully' })
    getSalaryReport(@Query('year') year: string, @Query('month') month: string) {
        // Default to current year/month if not provided
        const now = new Date();
        const y = year ? parseInt(year, 10) : now.getFullYear();
        const m = month ? parseInt(month, 10) : now.getMonth() + 1;
        return this.employeeService.getSalaryReport(y, m);
    }

    @Get(':id/home-screen')
    @ApiOperation({ summary: 'Get teacher home screen data' })
    async getTeacherHomeScreen(@Param('id', ParseIntPipe) id: number) {
        return this.employeeService.getTeacherHomeScreen(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update employee' })
    @ApiResponse({ status: 200, description: 'Employee updated successfully' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateEmployeeDto: UpdateEmployeeDto) {
        return this.employeeService.update(id, updateEmployeeDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remove employee (soft delete by default)' })
    @ApiResponse({ status: 200, description: 'Employee removed successfully' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    @ApiQuery({ name: 'force', required: false, type: Boolean, description: 'Force delete from database' })
    remove(@Param('id', ParseIntPipe) id: number, @Query('force', new ParseBoolPipe({ optional: true })) force: boolean = false) {
        return this.employeeService.remove(id, force);
    }
}
