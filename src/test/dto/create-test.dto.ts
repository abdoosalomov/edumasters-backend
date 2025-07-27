import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestDto {
    @ApiProperty({ description: 'Title of the test' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'ID of the group this test belongs to' })
    @IsInt()
    groupId: number;

    @ApiProperty({ description: 'Total number of questions in the test' })
    @IsInt()
    @Min(1)
    totalQuestions: number;

    @ApiPropertyOptional({ description: 'Test date (ISO string, defaults to now if not provided)' })
    @IsOptional()
    @IsDateString()
    date?: string;
}
