import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestDto {
    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsInt()
    groupId: number;

    @ApiProperty()
    @IsInt()
    @Min(1)
    totalQuestions: number;

    @ApiPropertyOptional({ description: 'Test date (defaults to now if not provided)' })
    @IsOptional()
    @IsDateString()
    date?: string;
}
