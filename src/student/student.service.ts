import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';
import { PaymentNotificationDto } from './dto/payment-notification.dto';
import { NotificationType } from '@prisma/client';
import { CodedBadRequestException } from '../common/exceptions/coded-exception';
import { ERROR_CODES } from '../common/constants/error-codes';

@Injectable()
export class StudentService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateStudentDto) {
        const isGroupExists = await this.prisma.group.count({ where: { id: data.groupId } });
        if (!isGroupExists) throw new CodedBadRequestException('Group not found', ERROR_CODES.STUDENT_GROUP_NOT_FOUND);

        // Extract parent telegram ID from data
        const { parentTelegramId, ...studentData } = data;

        // Convert cameDate to proper date format (YYYY-MM-DD)
        const studentDataWithDate = {
            ...studentData,
            cameDate: new Date(studentData.cameDate).toISOString().split('T')[0] + 'T00:00:00.000Z'
        };

        const result = await this.prisma.student.create({
            data: studentDataWithDate,
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
        const { page, limit, search, groupId, teacherId, isActive, frozen, isDeleted, orderBy, order } = filter;

        const where: any = {};

        // By default, exclude deleted students unless explicitly requested
        if (typeof isDeleted === 'boolean') {
            where.isDeleted = isDeleted;
        } else {
            where.isDeleted = false; // Default: hide deleted students
        }

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

        // Filter by teacher ID: first get group IDs for the teacher, then filter students by those groups
        if (teacherId) {
            const teacherGroups = await this.prisma.group.findMany({
                where: { teacherId },
                select: { id: true },
            });
            
            const groupIds = teacherGroups.map(group => group.id);
            
            if (groupIds.length === 0) {
                // Teacher has no groups, return empty result
                return {
                    data: [],
                    meta: {
                        total: 0,
                        page,
                        limit,
                        totalPages: 0,
                    },
                };
            }
            
            where.groupId = { in: groupIds };
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
        const student = await this.prisma.student.findUnique({
            where: { id },
            include: {
                group: true,
                attendances: true,
                testResults: true,
                payments: true,
                parents: true,
            },
        });

        // Return null if student is soft deleted (unless explicitly requested)
        if (student && student.isDeleted) {
            return null;
        }

        return student;
    }

    async update(id: number, data: UpdateStudentDto) {
        if (data.groupId) {
            const isGroupExists = await this.prisma.group.count({ where: { id: data.groupId } });
            if (!isGroupExists) throw new CodedBadRequestException('Group not found', ERROR_CODES.STUDENT_GROUP_NOT_FOUND);

            // Check if student is changing to a group with a different teacher
            // If so, validate that student has non-negative balance
            const currentStudent = await this.prisma.student.findUnique({
                where: { id },
                include: {
                    group: {
                        select: { teacherId: true }
                    }
                }
            });

            if (!currentStudent) {
                throw new CodedBadRequestException('Student not found', ERROR_CODES.STUDENT_NOT_FOUND);
            }

            const newGroup = await this.prisma.group.findUnique({
                where: { id: data.groupId },
                select: { teacherId: true }
            });

            // If the new group has a different teacher, check balance
            if (newGroup && currentStudent.group.teacherId !== newGroup.teacherId) {
                const currentBalance = Number(currentStudent.balance || 0);
                if (currentBalance < 0) {
                    throw new CodedBadRequestException('Cannot change to a group with a different teacher: student has negative balance. Please settle the balance first.', ERROR_CODES.STUDENT_NEGATIVE_BALANCE_GROUP_CHANGE);
                }
            }
        }

        // Extract parentTelegramId from data before updating student
        const { parentTelegramId, ...studentData } = data;

        // Convert cameDate to proper date format if provided
        const studentDataWithDate = studentData.cameDate 
            ? {
                ...studentData,
                cameDate: new Date(studentData.cameDate).toISOString().split('T')[0] + 'T00:00:00.000Z'
              }
            : studentData;

        const result = await this.prisma.student.update({
            where: { id },
            data: studentDataWithDate,
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
        if (!student) throw new CodedBadRequestException(`Student with ID ${id} not found`, ERROR_CODES.STUDENT_NOT_FOUND);

        if (force) {
            // Force delete - set isDeleted = true (permanent soft delete)
            await this.prisma.student.update({ 
                where: { id }, 
                data: { 
                    isDeleted: true,
                    isActive: false
                } 
            });
            return { message: 'Student permanently deleted (soft delete)' };
        } else {
            // Regular delete - just deactivate (isActive = false)
            await this.prisma.student.update({ 
                where: { id }, 
                data: { 
                    isActive: false
                } 
            });
            return { message: 'Student deactivated successfully' };
        }
    }

    async restore(id: number) {
        const student = await this.prisma.student.findUnique({ where: { id } });
        if (!student) throw new CodedBadRequestException(`Student with ID ${id} not found`, ERROR_CODES.STUDENT_NOT_FOUND);
        
        if (!student.isDeleted) {
            throw new CodedBadRequestException(`Student ${id} is not deleted`, ERROR_CODES.STUDENT_NOT_DELETED);
        }

        await this.prisma.student.update({
            where: { id },
            data: {
                isDeleted: false,
                isActive: true // Restore as active
            }
        });

        return { message: 'Student restored successfully' };
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
        if (!student) throw new CodedBadRequestException(`Student with ID ${studentId} not found`, ERROR_CODES.STUDENT_NOT_FOUND);

        // Determine message
        let message = dto.message;
        if (!message) {
            // Try to fetch from Config table with key=type
            const config = await this.prisma.config.findFirst({ where: { key: type, userId: 0 } });
            message = config?.value ?? 'Message';
        }

        if (!message) throw new CodedBadRequestException('Message could not be determined', ERROR_CODES.STUDENT_MESSAGE_DETERMINATION_FAILED);

        if (!student.parents || student.parents.length === 0) {
            throw new CodedBadRequestException('Student has no parents to notify', ERROR_CODES.STUDENT_NO_PARENTS_TO_NOTIFY);
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
