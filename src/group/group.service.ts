import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { FilterGroupDto } from './dto/filter-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateGroupDto) {
        const result = this.prisma.group.create({ data, include: { teacher: true } });
        return { data: result };
    }

    async findAll(filter: FilterGroupDto) {
        const { page, limit, search, dayType, isActive, orderBy, order } = filter;

        const where: any = {};

        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        if (dayType) {
            where.dayType = dayType;
        }

        if (typeof isActive === 'boolean') {
            where.isActive = isActive;
        }

        const total = await this.prisma.group.count({ where });

        const results = await this.prisma.group.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: { teacher: true },
            orderBy: {
                [orderBy ?? 'createdAt']: order ?? 'desc',
            },
        });

        return {
            data: results,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    findOne(id: number) {
        return this.prisma.group.findUnique({
            where: { id },
            include: { teacher: true, students: true, attendances: true, tests: true },
        });
    }

    update(id: number, data: UpdateGroupDto) {
        return this.prisma.group.update({
            where: { id },
            data,
        });
    }

    remove(id: number) {
        return this.prisma.group.delete({ where: { id } });
    }
}
