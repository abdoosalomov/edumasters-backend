import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTestResultDto {
    @ApiProperty({ description: 'ID of the student who took the test' })
    @IsInt()
    studentId: number;

    @ApiProperty({ description: 'ID of the test' })
    @IsInt()
    testId: number;

    @ApiProperty({ description: 'Number of correct answers in the test' })
    @IsInt()
    @Min(0)
    correctAnswers: number;
}
