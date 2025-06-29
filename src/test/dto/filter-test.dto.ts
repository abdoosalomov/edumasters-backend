import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum OrderDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export type TestOrderByField = 'title' | 'createdAt' | 'updatedAt' | 'isActive';

export class FilterTestDto {
    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    groupId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

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

    @ApiPropertyOptional({ enum: ['title', 'createdAt', 'updatedAt', 'isActive'] })
    @IsOptional()
    @IsString()
    orderBy?: TestOrderByField;

    @ApiPropertyOptional({ enum: OrderDirection, default: OrderDirection.DESC })
    @IsOptional()
    @IsEnum(OrderDirection)
    order: OrderDirection = OrderDirection.DESC;
}
