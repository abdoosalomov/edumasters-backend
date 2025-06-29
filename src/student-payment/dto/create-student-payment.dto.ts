import { PaymentType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentPaymentDto {
    @ApiProperty()
    @IsInt()
    studentId: number;

    @ApiProperty({ enum: PaymentType })
    @IsEnum(PaymentType)
    paymentType: PaymentType;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountAmount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    date?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    paymentPhoto?: string;
}
