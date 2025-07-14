import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeRoleDto {
    @ApiProperty({ description: 'Role name', maxLength: 100 })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiProperty({ description: 'Role description', maxLength: 255, required: false })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    description?: string;
}
