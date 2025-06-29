import { AttendanceStatus, PerformanceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceDto {
    @ApiProperty()
    @IsInt()
    studentId: number;

    @ApiProperty()
    @IsInt()
    groupId: number;

    @ApiProperty({ enum: AttendanceStatus })
    @IsEnum(AttendanceStatus)
    status: AttendanceStatus;

    @ApiProperty({ enum: PerformanceStatus })
    @IsEnum(PerformanceStatus)
    performance: PerformanceStatus;

    @ApiPropertyOptional({ description: 'Attendance date (defaults to now if not provided)' })
    @IsOptional()
    @IsDateString()
    date?: string;
}
