import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsInt, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStudentDto {
    @ApiProperty()
    @IsString()
    firstName: string;

    @ApiProperty()
    @IsString()
    lastName: string;

    @ApiProperty()
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiProperty()
    @IsDate()
    @Type(() => Date)
    cameDate: Date;

    @ApiProperty()
    @IsInt()
    groupId: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
