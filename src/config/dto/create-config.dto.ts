import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateConfigDto {
  @ApiProperty({ description: 'Configuration key (unique identifier)' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Configuration value' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'User ID (0 for global config)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  userId?: number;
} 