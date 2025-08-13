import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStudentDto {
    @ApiProperty({ description: 'ID of the group this student belongs to' })
    @IsInt()
    groupId: number;

    @ApiProperty({ description: 'First name of the student' })
    @IsString()
    firstName: string;

    @ApiProperty({ description: 'Last name of the student' })
    @IsString()
    lastName: string;

    @ApiProperty({ description: 'Phone number of the student' })
    @IsString()
    phoneNumber: string;

    @ApiProperty({ description: 'Date when student joined (ISO string)' })
    @IsDateString()
    cameDate: string;

    @ApiPropertyOptional({ description: 'Initial balance of the student', default: 0 })
    @IsOptional()
    @IsNumber()
    balance?: number;

    @ApiPropertyOptional({ description: 'Parent telegram ID (optional)' })
    @IsOptional()
    @IsString()
    parentTelegramId?: string;
}
