import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FilterTestResultDto {
    @ApiPropertyOptional({ description: 'Filter by test ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    testId?: number;

    @ApiPropertyOptional({ description: 'Filter by student ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    studentId?: number;

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
}
