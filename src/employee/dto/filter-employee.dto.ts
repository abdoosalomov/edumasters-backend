import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SalaryType } from '@prisma/client';

export class FilterEmployeeDto {
    @ApiProperty({ description: 'Page number', default: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    page?: number = 1;

    @ApiProperty({ description: 'Number of items per page', default: 10 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    limit?: number = 10;

    @ApiProperty({ description: 'Search term for name or phone number' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiProperty({ description: 'Filter by role ID' })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    roleId?: number;

    @ApiProperty({ description: 'Filter by active status' })
    @IsOptional()
    isActive?: string;

    @ApiProperty({ description: 'Filter by teacher status' })
    @IsOptional()
    isTeacher?: string;

    @ApiProperty({ description: 'Filter by salary type', enum: SalaryType })
    @IsEnum(SalaryType)
    @IsOptional()
    salaryType?: SalaryType;

    @ApiProperty({ description: 'Order by field', default: 'createdAt' })
    @IsString()
    @IsOptional()
    orderBy?: string = 'createdAt';

    @ApiProperty({ description: 'Order direction', default: 'desc' })
    @IsString()
    @IsOptional()
    order?: 'asc' | 'desc' = 'desc';
}
