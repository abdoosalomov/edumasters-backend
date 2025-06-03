import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum ParentOrderField {
    createdAt = 'createdAt',
    updatedAt = 'updatedAt',
}

export enum OrderDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export class FilterParentDto {
    @ApiPropertyOptional({ description: 'Search by telegram ID or student name' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by student ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    studentId?: number;

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
        enum: ParentOrderField,
        default: ParentOrderField.createdAt,
        description: 'Field to order by',
    })
    @IsOptional()
    @IsString()
    orderBy?: ParentOrderField;

    @ApiPropertyOptional({
        enum: OrderDirection,
        default: OrderDirection.DESC,
        description: 'Ordering direction',
    })
    @IsOptional()
    @IsEnum(OrderDirection)
    order: OrderDirection = OrderDirection.DESC;
}
