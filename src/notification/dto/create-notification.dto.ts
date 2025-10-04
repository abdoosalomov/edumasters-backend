import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateNotificationDto {
  @ApiPropertyOptional({ description: 'Message that will be sent to the user (optional, fallback to default)' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.OTHER })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Student ID that this message targets' })
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @ApiPropertyOptional({ description: 'Parent ID that this message targets (if message is for a parent specifically)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({ description: 'Phone number for SMS notifications (student phone)' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
} 