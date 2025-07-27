import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DebtorNotificationDto {
  @ApiPropertyOptional({ description: 'Custom message text for debtors' })
  @IsOptional()
  @IsString()
  message?: string;
} 