import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { EmployeeRoleService } from './employee-role.service';
import { CreateEmployeeRoleDto } from './dto/create-employee-role.dto';
import { UpdateEmployeeRoleDto } from './dto/update-employee-role.dto';
import { FilterEmployeeRoleDto } from './dto/filter-employee-role.dto';

@ApiTags('Roles')
@Controller('roles')
export class EmployeeRoleController {
    constructor(private readonly service: EmployeeRoleService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new role' })
    create(@Body() dto: CreateEmployeeRoleDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all roles' })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, default: 10 })
    @ApiQuery({ name: 'orderBy', required: false, enum: ['name', 'createdAt', 'updatedAt'] })
    @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
    findAll(@Query() filter: FilterEmployeeRoleDto) {
        return this.service.findAll(filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get role by ID' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update role by ID' })
    update(@Param('id') id: string, @Body() dto: UpdateEmployeeRoleDto) {
        return this.service.update(+id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete role by ID' })
    remove(@Param('id') id: string) {
        return this.service.remove(+id);
    }
}
