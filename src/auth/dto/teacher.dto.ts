import { IsDecimal, IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { SalaryType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeacherDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @ApiProperty()
    @IsDecimal()
    salary: number;

    @ApiProperty({ enum: SalaryType })
    @IsEnum(SalaryType)
    salaryType: SalaryType;

    @ApiProperty()
    @IsNumber()
    roleId: number;
}

export class LoginDto {
    @ApiProperty()
    @IsString()
    username: string;

    @ApiProperty()
    @IsString()
    password: string;
}
