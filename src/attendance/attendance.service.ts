import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { AttendanceStatus, PerformanceStatus, NotificationType, Parent } from '@prisma/client';

@Injectable()
export class AttendanceService {
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
            const student = await this.prisma.student.findUnique({ where: { id: dto.studentId }, include: { parents: true } });
            if (!student) throw new BadRequestException(`Student with ID ${dto.studentId} not found`);

            const groupExists = await this.prisma.group.count({ where: { id: dto.groupId } });
            if (!groupExists) throw new BadRequestException(`Group with ID ${dto.groupId} not found`);

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

            await this.handleNotifications(attendance, student.parents);
        }
        return createdRecords;
    }

    private async handleNotifications(attendance: any, parents: any[]) {
        // Attendance reminder if absent
        if (attendance.status === AttendanceStatus.ABSENT) {
            const reminderText = await this.prisma.config.findFirst({where: {
                key: NotificationType.ATTENDANCE_REMINDER,
            }})

            const message = reminderText?.value || `Farzandingiz bugun darsga kelmadi!`

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
