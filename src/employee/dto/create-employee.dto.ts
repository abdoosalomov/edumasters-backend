import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SalaryType } from '@prisma/client';

export class CreateEmployeeDto {
    @ApiProperty({ description: 'Username for the employee' })
    @IsString()
    @MaxLength(50)
    username: string;

    @ApiProperty({ description: 'Password for the employee' })
    @IsString()
    @MaxLength(255)
    password: string;

    @ApiProperty({ description: 'First name of the employee' })
    @IsString()
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ description: 'Last name of the employee' })
    @IsString()
    @MaxLength(100)
    lastName: string;

    @ApiProperty({ description: 'Phone number of the employee' })
    @IsString()
    @MaxLength(20)
    phoneNumber: string;

    @ApiProperty({ description: 'Salary amount', type: 'number' })
    @IsNumber()
    @Min(0)
    salary: number;

    @ApiProperty({ description: 'Type of salary', enum: SalaryType })
    @IsEnum(SalaryType)
    salaryType: SalaryType;

    @ApiProperty({ description: 'Role ID of the employee' })
    @IsNumber()
    roleId: number;

    @ApiProperty({ description: 'Whether the employee is active', default: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ description: 'Whether the employee is a teacher', default: false })
    @IsBoolean()
    @IsOptional()
    isTeacher?: boolean;
}
