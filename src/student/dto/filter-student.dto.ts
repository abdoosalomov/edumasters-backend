import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum OrderDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export class FilterStudentDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    groupId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    isActive?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number = 10;

    @ApiPropertyOptional({ enum: ['createdAt', 'updatedAt', 'firstName', 'lastName'] })
    @IsOptional()
    @IsString()
    orderBy?: string;

    @ApiPropertyOptional({ enum: OrderDirection })
    @IsOptional()
    @IsEnum(OrderDirection)
    order: OrderDirection = OrderDirection.DESC;
}
