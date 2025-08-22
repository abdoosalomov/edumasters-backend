import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { AttendanceStatus, PerformanceStatus, NotificationType, Parent, SalaryType } from '@prisma/client';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateAttendanceDto) {
        const { attendances } = { attendances: [data] } as BulkAttendanceDto;
        const result = await this.createManyInternal(attendances);
        return { data: result[0] };
    }

    async createBulk(bulkDto: BulkAttendanceDto) {
        const result = await this.createManyInternal(bulkDto.attendances);
        return { data: result };
    }

    private async createManyInternal(attendances: CreateAttendanceDto[]) {
        const createdRecords: any[] = [];
        for (const dto of attendances) {
            const student = await this.prisma.student.findUnique({ 
                where: { id: dto.studentId }, 
                include: { 
                    parents: true,
                    group: {
                        include: {
                            teacher: true
                        }
                    }
                } 
            });
            if (!student) throw new BadRequestException(`Student with ID ${dto.studentId} not found`);

            const groupExists = await this.prisma.group.count({ where: { id: dto.groupId } });
            if (!groupExists) throw new BadRequestException(`Group with ID ${dto.groupId} not found`);

            // Validate logical consistency: if status is ABSENT, performance must also be ABSENT
            if (dto.status === AttendanceStatus.ABSENT && dto.performance && dto.performance !== PerformanceStatus.ABSENT) {
                throw new BadRequestException('If attendance status is ABSENT, performance must also be ABSENT. Cannot have ABSENT status with GOOD, NORMAL, or BAD performance.');
            }

            // Note: Balance check and student deactivation is handled automatically in handleBalanceDeductionAndSalary

            const performance: PerformanceStatus =
                dto.performance ?? (dto.status === AttendanceStatus.ABSENT ? PerformanceStatus.ABSENT : PerformanceStatus.NORMAL);

            const attendance = await this.prisma.attendance.create({
                data: {
                    studentId: dto.studentId,
                    groupId: dto.groupId,
                    status: dto.status,
                    performance,
                    date: dto.date ? new Date(dto.date) : new Date(),
                },
            });

            createdRecords.push(attendance);

            // Handle balance deduction and salary calculation
            await this.handleBalanceDeductionAndSalary(student, attendance);
            await this.handleNotifications(attendance, student.parents);
        }
        return createdRecords;
    }

    private async getDefaultLessonPrice(): Promise<number> {
        const defaultPriceConfig = await this.prisma.config.findFirst({
            where: { key: 'DEFAULT_LESSON_PRICE', userId: 0 },
        });
        return defaultPriceConfig ? Number(defaultPriceConfig.value) : 0;
    }

    private async handleBalanceDeductionAndSalary(student: any, attendance: any) {
        try {
            // 1. Deduct balance from student (regardless of attendance status - present or absent)
            const lessonPrice = student.group.price ? Number(student.group.price) : await this.getDefaultLessonPrice();
            
            if (lessonPrice > 0) {
                const updatedStudent = await this.prisma.student.update({
                    where: { id: student.id },
                    data: {
                        balance: {
                            decrement: lessonPrice,
                        },
                    },
                });

                this.logger.log(
                    `Deducted ${lessonPrice} from student ${student.id} (${student.firstName} ${student.lastName}) - New balance: ${updatedStudent.balance} (attendance recorded)`,
                );

                // 3. Check if student should be deactivated due to low balance
                await this.checkAndDeactivateStudent(updatedStudent);
            }

            // 2. Calculate PER_STUDENT salary for teacher if applicable (regardless of attendance status)
            if (student.group.teacher && student.group.teacher.salaryType === SalaryType.PER_STUDENT) {
                await this.calculatePerStudentSalary(student.group.teacher.id, student.id, attendance.date, attendance.id);
            }

        } catch (error) {
            this.logger.error(`Failed to handle balance deduction and salary calculation: ${error.message}`);
        }
    }

    private async checkAndDeactivateStudent(student: any) {
        try {
            const minBalanceConfig = await this.prisma.config.findFirst({
                where: { key: 'MIN_STUDENT_BALANCE', userId: 0 },
            });

            const minBalance = minBalanceConfig ? Number(minBalanceConfig.value) : -600000; // Default fallback
            const currentBalance = Number(student.balance || 0);

            if (currentBalance <= minBalance && student.isActive) {
                // Deactivate the student
                await this.prisma.student.update({
                    where: { id: student.id },
                    data: { isActive: false },
                });

                this.logger.warn(
                    `Student ${student.id} (${student.firstName} ${student.lastName}) deactivated due to low balance. ` +
                    `Balance: ${currentBalance}, Minimum: ${minBalance}`
                );
            }
        } catch (error) {
            this.logger.error(`Failed to check and deactivate student: ${error.message}`);
        }
    }



    private async calculatePerStudentSalary(teacherId: number, studentId: number, attendanceDate: Date, attendanceId: number) {
        try {
            // Check if this is the first attendance for this student in this month
            const startOfMonth = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), 1);
            const endOfMonth = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth() + 1, 0, 23, 59, 59, 999);

            const existingAttendanceThisMonth = await this.prisma.attendance.findFirst({
                where: {
                    studentId: studentId,
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                    id: { not: attendanceId }, // Exclude current attendance
                },
            });

            // Calculate salary if this is the first attendance of the month for this student
            // (regardless of whether student was present or absent)
            if (!existingAttendanceThisMonth) {
                const teacher = await this.prisma.employee.findUnique({
                    where: { id: teacherId },
                });

                if (teacher && teacher.salaryType === SalaryType.PER_STUDENT) {
                    // Create a paid salary record for this student
                    await this.prisma.paidSalary.create({
                        data: {
                            teacherId: teacherId,
                            payed_amount: teacher.salary,
                            date: attendanceDate,
                        },
                    });

                    this.logger.log(
                        `Calculated PER_STUDENT salary for teacher ${teacherId} - student ${studentId} - amount: ${teacher.salary} (attendance recorded)`,
                    );
                }
            }
        } catch (error) {
            this.logger.error(`Failed to calculate PER_STUDENT salary: ${error.message}`);
        }
    }

    private async handleNotifications(attendance: any, parents: any[]) {
        // Attendance reminder if absent
        if (attendance.status === AttendanceStatus.ABSENT) {
            const reminderText = await this.prisma.config.findFirst({where: {
                key: NotificationType.ATTENDANCE_REMINDER,
            }})

            const defaultMessage = `Hurmatli ota-ona, farzandingiz <b>{studentName}</b> {date} sanasidagi darsimizda qatnashmadi. Har bir dars o'quv jarayonining muhim qismi hisoblanadi, shuning uchun dars qoldirish kelajakdagi natijalarga salbiy ta'sir ko'rsatishi mumkin. Farzandingizning davomatiga e'tibor qaratishingizni so'raymiz.`;
            
            const template = reminderText?.value || defaultMessage;
            
            // Get student info for the message
            const student = await this.prisma.student.findUnique({
                where: { id: attendance.studentId },
                select: { firstName: true, lastName: true }
            });
            
            const studentName = student ? `${student.firstName} ${student.lastName}` : 'O\'quvchi';
            const date = attendance.date.toLocaleDateString('ru-RU');
            
            const message = template
                .replace('{studentName}', studentName)
                .replace('{date}', date);

            await this.createNotificationsForParents(
                parents,
                NotificationType.ATTENDANCE_REMINDER,
                message,
            );
        }

        // Performance reminder if BAD
        if (attendance.performance === PerformanceStatus.BAD) {
            // Find last unreported BAD performances
            const badPerformances = await this.prisma.attendance.findMany({
                where: {
                    studentId: attendance.studentId,
                    performance: PerformanceStatus.BAD,
                    performanceReported: false,
                },
                orderBy: { date: 'asc' },
            });

            if (badPerformances.length >= 3) {
                const dates = badPerformances.slice(0, 3).map((a) => a.date.toLocaleDateString('ru-RU')).join(', ');
                const reminderText = await this.prisma.config.findFirst({
                    where: {
                        key: NotificationType.PERFORMANCE_REMINDER
                    }
                })

                const message = reminderText?.value || `O'quvchi quyidagi darslarda sust natija ko'rsatdi: %s`;
                await this.createNotificationsForParents(
                    parents,
                    NotificationType.PERFORMANCE_REMINDER,
                    message.replace("%s", `${dates}`),
                );

                const ids = badPerformances.slice(0, 3).map((a) => a.id);
                await this.prisma.attendance.updateMany({ where: { id: { in: ids } }, data: { performanceReported: true } });
            }
        }
    }

    private async createNotificationsForParents(
        parents: Parent[],
        type: NotificationType,
        message: string,
    ) {
        if (!parents || parents.length === 0) {
            throw new BadRequestException('Student has no parents to notify');
        }

        const data = parents.map((p) => ({
            type,
            message,
            telegramId: p.telegramId,
        }));
        await this.prisma.notification.createMany({ data });
    }

    async findAll(filter: FilterAttendanceDto) {
        const { page, limit, groupId, studentId, date, status, performance } = filter;

        const where: any = {};
        if (groupId) where.groupId = groupId;
        if (studentId) where.studentId = studentId;
        if (date) where.date = new Date(date);
        if (status) where.status = status;
        if (performance) where.performance = performance;

        const total = await this.prisma.attendance.count({ where });

        const attendances = await this.prisma.attendance.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                student: true,
                group: true,
            },
            orderBy: {
                date: 'desc',
            },
        });

        return {
            data: attendances,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const attendance = await this.prisma.attendance.findUnique({
            where: { id },
            include: { student: true, group: true },
        });

        if (!attendance) throw new BadRequestException(`Attendance with ID ${id} not found`);
        return { data: attendance };
    }

    async update(id: number, data: UpdateAttendanceDto) {
        const exists = await this.prisma.attendance.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`Attendance with ID ${id} not found`);

        const updated = await this.prisma.attendance.update({
            where: { id },
            data,
        });

        return { data: updated };
    }

    async remove(id: number) {
        const exists = await this.prisma.attendance.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`Attendance with ID ${id} not found`);

        await this.prisma.attendance.delete({ where: { id } });
        return { message: 'Attendance deleted successfully' };
    }
}
