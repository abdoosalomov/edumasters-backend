import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { FilterTestDto } from './dto/filter-test.dto';

@Injectable()
export class TestService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateTestDto) {
        const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
        if (!group) throw new BadRequestException(`Group with ID ${dto.groupId} not found`);

        const test = await this.prisma.test.create({
            data: {
                title: dto.title,
                date: dto.date ? new Date(dto.date) : new Date(),
                groupId: dto.groupId,
                totalQuestions: dto.totalQuestions,
            },
        });

        return { data: test };
    }

    async findAll(filter: FilterTestDto) {
        const { page, limit, groupId, isActive, search, orderBy, order } = filter;

        const where: any = {};
        if (groupId) where.groupId = groupId;
        if (typeof isActive === 'boolean') where.isActive = isActive;
        if (search) where.title = { contains: search, mode: 'insensitive' };

        const total = await this.prisma.test.count({ where });

        const tests = await this.prisma.test.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                group: true,
                TestResult: true,
            },
            orderBy: {
                [orderBy ?? 'createdAt']: order ?? 'desc',
            },
        });

        return {
            data: tests,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const test = await this.prisma.test.findUnique({
            where: { id },
            include: {
                group: true,
                TestResult: {
                    include: {
                        student: true,
                    },
                },
            },
        });

        if (!test) throw new BadRequestException(`Test with ID ${id} not found`);

        return { data: test };
    }

    async update(id: number, dto: UpdateTestDto) {
        const exists = await this.prisma.test.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`Test with ID ${id} not found`);

        const updated = await this.prisma.test.update({
            where: { id },
            data: dto,
        });

        return { data: updated };
    }

    async remove(id: number, force: boolean) {
        const exists = await this.prisma.test.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`Test with ID ${id} not found`);

        if (force) {
            await this.prisma.test.delete({ where: { id } });
        } else {
            await this.prisma.test.update({ where: { id }, data: { isActive: false } });
        }

        return { message: force ? 'Deleted permanently' : 'Soft-deleted (isActive = false)' };
    }
}
