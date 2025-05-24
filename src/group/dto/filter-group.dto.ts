import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GroupDayType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export type GroupOrderByField = 'title' | 'createdAt' | 'updatedAt' | 'isActive';

export class FilterGroupDto {
    @ApiPropertyOptional({ description: 'Search by title (case-insensitive)' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: GroupDayType, description: 'Filter by group day type' })
    @IsOptional()
    @IsEnum(GroupDayType)
    dayType?: GroupDayType;

    @ApiPropertyOptional({ description: 'Filter by active status' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ minimum: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ minimum: 1, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number = 10;

    @ApiPropertyOptional({ enum: ['title', 'createdAt', 'updatedAt', 'isActive'], description: 'Field to order by' })
    @IsOptional()
    @IsString()
    orderBy?: GroupOrderByField;

    @ApiPropertyOptional({ enum: OrderDirection, default: OrderDirection.DESC, description: 'Ordering direction' })
    @IsOptional()
    @IsEnum(OrderDirection)
    order: OrderDirection = OrderDirection.DESC;
}
