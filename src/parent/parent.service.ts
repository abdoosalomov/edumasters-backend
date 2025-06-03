import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { FilterParentDto } from './dto/filter-parent.dto';

@Injectable()
export class ParentService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateParentDto) {
        const studentExists = await this.prisma.student.count({ where: { id: data.studentId } });
        if (!studentExists) throw new BadRequestException('Student not found');

        const result = await this.prisma.parent.create({
            data,
            include: { student: true },
        });

        return { data: result };
    }

    async findAll(filter: FilterParentDto) {
        const { page, limit, search, studentId, orderBy, order } = filter;

        const where: any = {};

        if (search) {
            where.OR = [
                { telegramId: { contains: search, mode: 'insensitive' } },
                {
                    student: {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                        ],
                    },
                },
            ];
        }

        if (studentId) {
            where.studentId = studentId;
        }

        const total = await this.prisma.parent.count({ where });

        const parents = await this.prisma.parent.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: { student: true },
            orderBy: {
                [orderBy ?? 'createdAt']: order ?? 'desc',
            },
        });

        return {
            data: parents,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const parent = await this.prisma.parent.findUnique({
            where: { id },
            include: { student: true },
        });

        if (!parent) throw new NotFoundException('Parent not found');
        return { data: parent };
    }

    async update(id: number, data: UpdateParentDto) {
        const exists = await this.prisma.parent.count({ where: { id } });
        if (!exists) throw new NotFoundException('Parent not found');

        if (data.studentId) {
            const studentExists = await this.prisma.student.count({ where: { id: data.studentId } });
            if (!studentExists) throw new BadRequestException('Student not found');
        }

        const updated = await this.prisma.parent.update({
            where: { id },
            data,
            include: { student: true },
        });

        return { data: updated };
    }

    async remove(id: number) {
        const exists = await this.prisma.parent.count({ where: { id } });
        if (!exists) throw new NotFoundException('Parent not found');

        const deleted = await this.prisma.parent.delete({ where: { id } });
        return { data: deleted };
    }
}
