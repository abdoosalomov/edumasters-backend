import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateChequeDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  report?: string;
} 