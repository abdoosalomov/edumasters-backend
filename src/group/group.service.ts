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
        const { page, limit, search, dayType, isActive, orderBy, order, teacherId } = filter;

        const where: any = {};

        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        if (dayType) {
            where.dayType = dayType;
        }

        if (isActive) {
            where.isActive = isActive === 'true';
        }

        if (teacherId) {
            where.teacherId = teacherId;
        }

        const total = await this.prisma.group.count({ where });

        const groups = await this.prisma.group.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                teacher: true,
                students: {
                    select: {
                        id: true,
                        balance: true,
                    },
                },
            },
            orderBy: {
                [orderBy ?? 'createdAt']: order ?? 'desc',
            },
        });

        const results = groups.map((group) => ({
            ...group,
            debtorsCount: group.students.filter((s) => Number(s.balance) < 0).length,
        }));

        if (orderBy === 'debtorsCount') {
            const direction = order === 'asc' ? 1 : -1;
            results.sort((a, b) => (a.debtorsCount - b.debtorsCount) * direction);
        }

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

    async findOne(id: number) {
        return this.prisma.group.findUnique({
            where: { id },
            include: { teacher: true, students: true, attendances: true, tests: true, _count: true },
        });
    }

    update(id: number, data: UpdateGroupDto) {
        return this.prisma.group.update({
            where: { id },
            data,
        });
    }

    async remove(id: number, force: boolean) {
        if (force) await this.prisma.group.delete({ where: { id } });
        else await this.prisma.group.update({ where: { id }, data: { isActive: false } });
    }
}
