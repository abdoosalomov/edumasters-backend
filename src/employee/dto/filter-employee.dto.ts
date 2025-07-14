import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryType } from '@prisma/client';

export class FilterEmployeeDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Search term for name or phone number' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by role ID' })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    roleId?: number;

    @ApiPropertyOptional({ description: 'Filter by active status' })
    @IsOptional()
    isActive?: string;

    @ApiPropertyOptional({ description: 'Filter by teacher status' })
    @IsOptional()
    isTeacher?: string;

    @ApiPropertyOptional({ description: 'Filter by salary type', enum: SalaryType })
    @IsEnum(SalaryType)
    @IsOptional()
    salaryType?: SalaryType;

    @ApiPropertyOptional({ description: 'Order by field', default: 'createdAt' })
    @IsString()
    @IsOptional()
    orderBy?: string = 'createdAt';

    @ApiPropertyOptional({ description: 'Order direction', default: 'desc' })
    @IsString()
    @IsOptional()
    order?: 'asc' | 'desc' = 'desc';
}
