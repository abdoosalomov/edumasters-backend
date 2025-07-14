import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FilterEmployeeRoleDto {
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

    @ApiProperty({ description: 'Search term for role name or description' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiProperty({ description: 'Order by field', default: 'createdAt', enum: ['name', 'createdAt', 'updatedAt'] })
    @IsString()
    @IsOptional()
    orderBy?: 'name' | 'createdAt' | 'updatedAt' = 'createdAt';

    @ApiProperty({ description: 'Order direction', default: 'desc', enum: ['asc', 'desc'] })
    @IsString()
    @IsOptional()
    order?: 'asc' | 'desc' = 'desc';
}
