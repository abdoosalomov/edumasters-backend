import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GroupDayType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export type GroupOrderByField = 'title' | 'createdAt' | 'updatedAt' | 'isActive' | 'debtorsCount';

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
    // @Type(() => Boolean)
    @IsString()
    isActive?: string;

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

    @ApiPropertyOptional({
        enum: ['title', 'createdAt', 'updatedAt', 'isActive', 'debtorsCount'],
        description: 'Field to order by',
    })
    @IsOptional()
    @IsString()
    orderBy?: GroupOrderByField;

    @ApiPropertyOptional({ enum: OrderDirection, default: OrderDirection.DESC, description: 'Ordering direction' })
    @IsOptional()
    @IsEnum(OrderDirection)
    order: OrderDirection = OrderDirection.DESC;

    @ApiPropertyOptional({ description: 'Filter by teacher ID' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    teacherId?: number;

    @ApiPropertyOptional({ description: 'Filter only loaner (in-debt) students' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    loanerOnly?: boolean;
}
