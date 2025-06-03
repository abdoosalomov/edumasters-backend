import { IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateParentDto {
    @ApiProperty({ description: 'ID of the student this parent belongs to' })
    @IsInt()
    studentId: number;

    @ApiProperty({ description: 'Telegram ID of the parent' })
    @IsString()
    telegramId: string;
}
