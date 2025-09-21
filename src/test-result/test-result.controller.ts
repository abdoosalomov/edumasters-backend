import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { TestResultService } from './test-result.service';
import { CreateTestResultDto } from './dto/create-test-result.dto';
import { UpdateTestResultDto } from './dto/update-test-result.dto';
import { FilterTestResultDto } from './dto/filter-test-result.dto';

@ApiTags('TestResults')
@Controller('test-results')
export class TestResultController {
    constructor(private readonly service: TestResultService) {}

    @Post()
    @ApiOperation({ summary: 'Create test results for multiple students' })
    create(@Body() dto: CreateTestResultDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all test results' })
    @ApiQuery({ name: 'testId', required: false, type: Number })
    @ApiQuery({ name: 'studentId', required: false, type: Number })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(@Query() filter: FilterTestResultDto) {
        return this.service.findAll(filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get test result by ID' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update test result' })
    update(@Param('id') id: string, @Body() dto: UpdateTestResultDto) {
        return this.service.update(+id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete test result' })
    remove(@Param('id') id: string) {
        return this.service.remove(+id);
    }

    @Get('excel/:testId')
    @ApiOperation({ summary: 'Generate Excel report and send via Telegram' })
    @ApiQuery({ name: 'telegramId', required: true, type: String, description: 'Telegram ID to send the Excel file to' })
    async generateExcelReport(
        @Param('testId') testId: string, 
        @Query('telegramId') telegramId: string
    ) {
        return await this.service.generateExcelReport(+testId, telegramId);
    }
}
