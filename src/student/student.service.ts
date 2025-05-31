import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';

@Injectable()
export class StudentService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateStudentDto) {
        const isGroupExists = await this.prisma.group.count({ where: { id: data.groupId } });
        if (!isGroupExists) throw new BadRequestException('Group not found');

        const result = await this.prisma.student.create({
            data,
            include: { group: true, parents: true },
        });
        return { data: result };
    }

    async findAll(filter: FilterStudentDto) {
        const { page, limit, search, groupId, isActive, orderBy, order } = filter;

        const where: any = {};

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (typeof isActive === 'string') {
            where.isActive = isActive === 'true';
        }

        if (groupId) {
            where.groupId = groupId;
        }

        const total = await this.prisma.student.count({ where });

        const students = await this.prisma.student.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: { group: true, parents: true },
            orderBy: {
                [orderBy ?? 'createdAt']: order ?? 'desc',
            },
        });

        return {
            data: students,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        return this.prisma.student.findUnique({
            where: { id },
            include: {
                group: true,
                attendances: true,
                testResults: true,
                payments: true,
                parents: true,
            },
        });
    }

    async update(id: number, data: UpdateStudentDto) {
        if (data.groupId) {
            const isGroupExists = await this.prisma.group.count({ where: { id: data.groupId } });
            if (!isGroupExists) throw new BadRequestException('Group not found');
        }

        const result = await this.prisma.student.update({
            where: { id },
            data,
        });

        return {
            data: result,
        };
    }

    async remove(id: number, force: boolean) {
        if (force) await this.prisma.student.delete({ where: { id } });
        else await this.prisma.student.update({ where: { id }, data: { isActive: false } });
    }
}
