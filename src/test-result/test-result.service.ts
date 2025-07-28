import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTestResultDto } from './dto/create-test-result.dto';
import { UpdateTestResultDto } from './dto/update-test-result.dto';
import { FilterTestResultDto } from './dto/filter-test-result.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class TestResultService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateTestResultDto) {
        const { testId, results } = dto;
    
        const test = await this.prisma.test.findUnique({ where: { id: testId } });
        if (!test) throw new BadRequestException(`Test with ID ${testId} not found`);
    
        const studentIds = results.map(r => r.studentId);
    
        const students = await this.prisma.student.findMany({
            where: { id: { in: studentIds } },
        });
    
        const foundStudentIds = new Set(students.map(s => s.id));
        const missingStudents = studentIds.filter(id => !foundStudentIds.has(id));
        if (missingStudents.length) {
            throw new BadRequestException(`Students not found: ${missingStudents.join(', ')}`);
        }
    
        // Check for existing results
        const existingResults = await this.prisma.testResult.findMany({
            where: {
                testId,
                studentId: { in: studentIds },
            },
        });
    
        if (existingResults.length) {
            const existingIds = existingResults.map(r => r.studentId);
            throw new BadRequestException(`TestResults already exist for studentIds: ${existingIds.join(', ')}`);
        }
    
        // Create test results
        const createdResults = await this.prisma.testResult.createMany({
            data: results.map(r => ({
                studentId: r.studentId,
                testId,
                correctAnswers: r.correctAnswers,
            })),
        });
    
        // Fetch all parents of students
        const parents = await this.prisma.parent.findMany({
            where: { studentId: { in: studentIds } },
        });
    
        if (!parents.length) {
            throw new BadRequestException('No parents found for these students');
        }
    
        const reminderText = await this.prisma.config.findFirst({
            where: {
                key: NotificationType.TEST_RESULT_REMINDER
            }
        });
    
        const messageTemplate = reminderText?.value || `Test natijasi: %s/%g to'g'ri javob`;
    
        const notifications = parents.map(parent => {
            const result = results.find(r => r.studentId === parent.studentId);
            return {
                type: NotificationType.TEST_RESULT_REMINDER,
                telegramId: parent.telegramId,
                message: messageTemplate
                    .replace('%s', result?.correctAnswers.toString() || '0')
                    .replace('%g', test.totalQuestions.toString()),
            };
        });
    
        await this.prisma.notification.createMany({ data: notifications });
    
        return { message: 'Test results created successfully', count: createdResults.count };
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
            include: { test: true, student: true },
            orderBy: { createdAt: 'desc' },
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
            include: { test: true, student: true },
        });

        if (!result) throw new BadRequestException(`TestResult with ID ${id} not found`);
        return { data: result };
    }

    async update(id: number, dto: UpdateTestResultDto) {
        const exists = await this.prisma.testResult.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`TestResult with ID ${id} not found`);

        const updated = await this.prisma.testResult.update({ where: { id }, data: dto });
        return { data: updated };
    }

    async remove(id: number) {
        const exists = await this.prisma.testResult.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`TestResult with ID ${id} not found`);

        await this.prisma.testResult.delete({ where: { id } });
        return { message: 'Deleted successfully' };
    }
}