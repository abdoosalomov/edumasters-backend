import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum OrderDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export type TestOrderByField = 'title' | 'createdAt' | 'updatedAt' | 'isActive';

export class FilterTestDto {
    @ApiPropertyOptional({ description: 'Filter by group ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    groupId?: number;

    @ApiPropertyOptional({ description: 'Search by test title' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by active status' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number = 10;

    @ApiPropertyOptional({ description: 'Field to order by', enum: ['title', 'createdAt', 'updatedAt', 'isActive'] })
    @IsOptional()
    @IsString()
    orderBy?: TestOrderByField;

    @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'] })
    @IsOptional()
    @IsEnum(OrderDirection)
    order: OrderDirection = OrderDirection.DESC;
}
