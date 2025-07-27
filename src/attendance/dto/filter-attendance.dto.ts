import { AttendanceStatus, PerformanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class FilterAttendanceDto {
    @ApiPropertyOptional({ description: 'Filter by student ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    studentId?: number;

    @ApiPropertyOptional({ description: 'Filter by group ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    groupId?: number;

    @ApiPropertyOptional({ description: 'Filter by attendance status' })
    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

    @ApiPropertyOptional({ description: 'Filter by performance status' })
    @IsOptional()
    @IsEnum(PerformanceStatus)
    performance?: PerformanceStatus;

    @ApiPropertyOptional({ description: 'Filter by specific date (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    date?: string;

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
