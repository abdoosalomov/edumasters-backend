import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateChequeDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  report?: string;
} 