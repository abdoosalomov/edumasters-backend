import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export class FilterStudentDto {
    @ApiPropertyOptional({ description: 'Search by student name or phone number' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by group ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    groupId?: number;

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

    @ApiPropertyOptional({ description: 'Field to order by', enum: ['createdAt', 'updatedAt', 'firstName', 'lastName'] })
    @IsOptional()
    @IsString()
    orderBy?: string;

    @ApiPropertyOptional({ description: 'Sort direction', enum: OrderDirection })
    @IsOptional()
    @IsEnum(OrderDirection)
    order?: OrderDirection;
}
