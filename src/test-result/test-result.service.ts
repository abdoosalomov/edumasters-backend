import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTestResultDto } from './dto/create-test-result.dto';
import { UpdateTestResultDto } from './dto/update-test-result.dto';
import { FilterTestResultDto } from './dto/filter-test-result.dto';

@Injectable()
export class TestResultService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateTestResultDto) {
        const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
        if (!student) throw new BadRequestException(`Student with ID ${dto.studentId} not found`);

        const test = await this.prisma.test.findUnique({ where: { id: dto.testId } });
        if (!test) throw new BadRequestException(`Test with ID ${dto.testId} not found`);

        const exists = await this.prisma.testResult.findUnique({
            where: { studentId_testId: { studentId: dto.studentId, testId: dto.testId } },
        });
        if (exists) throw new BadRequestException(`TestResult already exists for this student and test`);

        const result = await this.prisma.testResult.create({
            data: {
                studentId: dto.studentId,
                testId: dto.testId,
                correctAnswers: dto.correctAnswers,
            },
        });

        return { data: result };
    }

    async findAll(filter: FilterTestResultDto) {
        const { page, limit, testId, studentId } = filter;

        const where: any = {};
        if (testId) where.testId = testId;
        if (studentId) where.studentId = studentId;

        const total = await this.prisma.testResult.count({ where });

        const results = await this.prisma.testResult.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                test: true,
                student: true,
            },
            orderBy: {
                createdAt: 'desc',
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

    async findOne(id: number) {
        const result = await this.prisma.testResult.findUnique({
            where: { id },
            include: {
                test: true,
                student: true,
            },
        });

        if (!result) throw new BadRequestException(`TestResult with ID ${id} not found`);
        return { data: result };
    }

    async update(id: number, dto: UpdateTestResultDto) {
        const exists = await this.prisma.testResult.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`TestResult with ID ${id} not found`);

        const updated = await this.prisma.testResult.update({
            where: { id },
            data: dto,
        });

        return { data: updated };
    }

    async remove(id: number) {
        const exists = await this.prisma.testResult.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`TestResult with ID ${id} not found`);

        await this.prisma.testResult.delete({ where: { id } });
        return { message: 'Deleted successfully' };
    }
}
