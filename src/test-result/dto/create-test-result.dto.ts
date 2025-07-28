import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class StudentResultDto {
    @ApiProperty({ description: 'ID of the student' })
    @IsInt()
    studentId: number;

    @ApiProperty({ description: 'Number of correct answers' })
    @IsInt()
    @Min(0)
    correctAnswers: number;
}

export class CreateTestResultDto {
    @ApiProperty({ description: 'ID of the test' })
    @IsInt()
    testId: number;

    @ApiProperty({ type: [StudentResultDto], description: 'Results for multiple students' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StudentResultDto)
    results: StudentResultDto[];
}
