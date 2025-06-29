import { AttendanceStatus, PerformanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class FilterAttendanceDto {
    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    studentId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    groupId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(PerformanceStatus)
    performance?: PerformanceStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    date?: string;

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
}
