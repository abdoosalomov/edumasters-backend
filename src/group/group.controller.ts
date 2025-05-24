import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GroupService } from './group.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { FilterGroupDto, OrderDirection } from './dto/filter-group.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@ApiTags('Groups')
@Controller('groups')
export class GroupController {
    constructor(private readonly groupService: GroupService) {}

    @Post()
    create(@Body() dto: CreateGroupDto) {
        return this.groupService.create(dto);
    }

    @Get()
    @ApiQuery({ name: 'search', required: false, description: 'Search by group title' })
    @ApiQuery({ name: 'dayType', enum: ['ODD', 'EVEN'], required: false, description: 'Group day type' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({
        name: 'orderBy',
        required: false,
        enum: ['title', 'createdAt', 'updatedAt', 'isActive'],
        description: 'Field to order by',
    })
    @ApiQuery({
        name: 'order',
        required: false,
        enum: OrderDirection,
        description: 'Sorting direction',
    })
    findAll(@Query() filter: FilterGroupDto) {
        return this.groupService.findAll(filter);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.groupService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
        return this.groupService.update(+id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Query('force') force?: string) {
        return this.groupService.remove(+id, force === 'true');
    }
}
