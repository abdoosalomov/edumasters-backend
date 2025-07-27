import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationDto {
  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsOptional()
  @IsString()
  error?: string;
} 