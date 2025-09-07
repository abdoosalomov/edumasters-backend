import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';
import { PaymentNotificationDto } from './dto/payment-notification.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class StudentService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateStudentDto) {
        const isGroupExists = await this.prisma.group.count({ where: { id: data.groupId } });
        if (!isGroupExists) throw new BadRequestException('Group not found');

        // Extract parent telegram ID from data
        const { parentTelegramId, ...studentData } = data;

        const result = await this.prisma.student.create({
            data: studentData,
            include: { group: true, parents: true },
        });

        // Create parent if telegram ID is provided
        if (parentTelegramId) {
            await this.prisma.parent.create({
                data: {
                    studentId: result.id,
                    telegramId: parentTelegramId,
                },
            });
        }

        // Return student with updated parents relation
        const studentWithParents = await this.prisma.student.findUnique({
            where: { id: result.id },
            include: { group: true, parents: true },
        });

        return { data: studentWithParents };
    }

    async findAll(filter: FilterStudentDto) {
        const { page, limit, search, groupId, isActive, frozen, orderBy, order } = filter;

        const where: any = {};

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (typeof isActive === 'boolean') {
            where.isActive = isActive;
        }

        if (typeof frozen === 'boolean') {
            where.frozen = frozen;
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

        // Extract parentTelegramId from data before updating student
        const { parentTelegramId, ...studentData } = data;

        const result = await this.prisma.student.update({
            where: { id },
            data: studentData,
        });

        // Handle parent telegram ID update if provided
        if (parentTelegramId !== undefined) {
            if (parentTelegramId) {
                // Check if parent exists for this student
                const existingParent = await this.prisma.parent.findFirst({
                    where: { studentId: id }
                });

                if (existingParent) {
                    // Update existing parent's telegram ID
                    await this.prisma.parent.update({
                        where: { id: existingParent.id },
                        data: { telegramId: parentTelegramId }
                    });
                } else {
                    // Create new parent if none exists
                    await this.prisma.parent.create({
                        data: {
                            studentId: id,
                            telegramId: parentTelegramId,
                        },
                    });
                }
            } else {
                // Only delete if explicitly setting to null/empty
                await this.prisma.parent.deleteMany({
                    where: { studentId: id }
                });
            }
        }

        return {
            data: result,
        };
    }

    async remove(id: number, force: boolean) {
        const student = await this.prisma.student.findUnique({ where: { id } });
        if (!student) throw new BadRequestException(`Student with ID ${id} not found`);

        if (force) {
            // Only check negative balance; rely on DB-level cascading for all relations
            if (Number(student.balance) < 0) {
                throw new BadRequestException(
                    `Cannot delete student with negative balance (${student.balance}). Please settle the debt first.`,
                );
            }

            await this.prisma.student.delete({ where: { id } });
        } else {
            await this.prisma.student.update({ where: { id }, data: { isActive: false } });
        }

        return { message: 'Student deleted successfully' };
    }

    async createNotification(
        studentId: number,
        type: NotificationType,
        dto: PaymentNotificationDto,
    ) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: { parents: true },
        });
        if (!student) throw new BadRequestException(`Student with ID ${studentId} not found`);

        // Determine message
        let message = dto.message;
        if (!message) {
            // Try to fetch from Config table with key=type
            const config = await this.prisma.config.findFirst({ where: { key: type, userId: 0 } });
            message = config?.value ?? 'Message';
        }

        if (!message) throw new BadRequestException('Message could not be determined');

        if (!student.parents || student.parents.length === 0) {
            throw new BadRequestException('Student has no parents to notify');
        }

        // Replace placeholders in the message (same as group notification logic)
        let processedMessage = message;
        
        // Replace common student placeholders for all notification types
        processedMessage = processedMessage.replace('{{STUDENT_NAME}}', student.firstName + ' ' + student.lastName);
        
        // Replace payment-specific placeholders if this is a payment reminder
        if (type === NotificationType.PAYMENT_REMINDER) {
            const minBalance = ((await this.prisma.config.findFirst({where: {key: 'MIN_STUDENT_BALANCE'}, select: {value: true}}))?.value ?? '-500000');
            const formattedMinBalance = new Intl.NumberFormat('de-DE').format(Number(minBalance));
            
            processedMessage = processedMessage
                .replace('{{STUDENT_BALANCE}}', new Intl.NumberFormat('de-DE').format(Number(student.balance)))
                .replace('{{MIN_BALANCE}}', formattedMinBalance);
        }

        const data = student.parents.map((p) => ({
            type,
            message: processedMessage,
            telegramId: p.telegramId,
        }));
        await this.prisma.notification.createMany({ data });

        return { message: 'Notification queued for sending' };
    }
}
