import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupDayType } from '@prisma/client';

export class CreateGroupDto {
    @ApiProperty({ description: 'Title of the group' })
    @IsString()
    title: string;

    @ApiProperty({ enum: GroupDayType, description: 'Type of day for the group' })
    @IsEnum(GroupDayType)
    dayType: GroupDayType;

    @ApiPropertyOptional({ description: 'Optional subject of the group' })
    @IsOptional()
    @IsString()
    subject?: string;

    @ApiProperty({ description: 'ID of the teacher assigned to this group' })
    @IsInt()
    teacherId: number;

    @ApiPropertyOptional({ description: 'Whether the group is active', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
