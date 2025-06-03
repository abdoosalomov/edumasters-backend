import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ParentService } from './parent.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { FilterParentDto, OrderDirection, ParentOrderField } from './dto/filter-parent.dto';

@ApiTags('Parents')
@Controller('parents')
export class ParentsController {
    constructor(private readonly parentsService: ParentService) {}

    @Post()
    @ApiOperation({ summary: 'Create new parent' })
    create(@Body() dto: CreateParentDto) {
        return this.parentsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all parents' })
    @ApiQuery({ name: 'search', required: false, description: 'Search by telegram or student name' })
    @ApiQuery({ name: 'studentId', required: false, type: Number, description: 'Filter by student ID' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({
        name: 'orderBy',
        required: false,
        enum: ParentOrderField,
        description: 'Field to order by',
    })
    @ApiQuery({ name: 'order', required: false, enum: OrderDirection, description: 'Sort direction' })
    findAll(@Query() filter: FilterParentDto) {
        return this.parentsService.findAll(filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get parent by ID' })
    findOne(@Param('id') id: string) {
        return this.parentsService.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update parent by ID' })
    update(@Param('id') id: string, @Body() dto: UpdateParentDto) {
        return this.parentsService.update(+id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete parent by ID (hard delete)' })
    remove(@Param('id') id: string) {
        return this.parentsService.remove(+id);
    }
}
