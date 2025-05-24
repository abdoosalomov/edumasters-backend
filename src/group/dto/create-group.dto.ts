import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { GroupDayType } from '@prisma/client';

export class CreateGroupDto {
    @IsString()
    title: string;

    @IsEnum(GroupDayType)
    dayType: GroupDayType;

    @IsOptional()
    @IsString()
    subject?: string;

    @IsInt()
    teacherId: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
