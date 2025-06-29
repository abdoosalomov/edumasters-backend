import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTestResultDto {
    @ApiProperty()
    @IsInt()
    studentId: number;

    @ApiProperty()
    @IsInt()
    testId: number;

    @ApiProperty()
    @IsInt()
    @Min(0)
    correctAnswers: number;
}
