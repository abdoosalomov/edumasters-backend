import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TestService } from './test.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { FilterTestDto } from './dto/filter-test.dto';

@ApiTags('Tests')
@Controller('tests')
export class TestController {
    constructor(private readonly testService: TestService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new test' })
    create(@Body() dto: CreateTestDto) {
        return this.testService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tests' })
    @ApiQuery({ name: 'groupId', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, default: 10 })
    @ApiQuery({ name: 'orderBy', required: false, enum: ['title', 'createdAt', 'updatedAt', 'isActive'] })
    @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
    findAll(@Query() filter: FilterTestDto) {
        return this.testService.findAll(filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get test by ID' })
    findOne(@Param('id') id: string) {
        return this.testService.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update test by ID' })
    update(@Param('id') id: string, @Body() dto: UpdateTestDto) {
        return this.testService.update(+id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete or deactivate test by ID' })
    remove(@Param('id') id: string, @Query('force') force?: string) {
        return this.testService.remove(+id, force === 'true');
    }
}
