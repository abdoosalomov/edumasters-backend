import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PaymentNotificationDto {
  @ApiPropertyOptional({ description: 'Custom message to send with payment reminder' })
  @IsOptional()
  @IsString()
  message?: string;
} 