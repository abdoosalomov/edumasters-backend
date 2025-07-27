import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { FilterGroupDto, OrderDirection } from './dto/filter-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupDayType } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { DebtorNotificationDto } from './dto/debtor-notification.dto';

@Injectable()
export class GroupService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateGroupDto) {
        const teacher = await this.prisma.employee.findUnique({
            where: { id: data.teacherId },
        });
        if (!teacher) {
            throw new BadRequestException(`Teacher with ID ${data.teacherId} not found!`);
        }

        const result = await this.prisma.group.create({ data, include: { teacher: true } });
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
                    where: { isActive: true },
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

    async getTodayGroups(teacherId: number) {
        const today = this.todayIs();
        if (!today) return { data: [] };
        const groups = await this.findAll({
            teacherId,
            dayType: today,
            page: 1,
            limit: 10,
            order: OrderDirection.ASC,
        });

        return {
            data: groups.data,
            meta: {
                total: groups.meta.total,
                page: 1,
                limit: 10,
                totalPages: Math.ceil(groups.meta.total / 10),
            },
        };
    }

    async findOne(id: number) {
        return this.prisma.group.findUnique({
            where: { id },
            include: { teacher: true, students: { where: { isActive: true } }, attendances: true, tests: true, _count: true },
        });
    }

    async update(id: number, data: UpdateGroupDto) {
        if (data.teacherId) {
            const teacher = await this.prisma.employee.findUnique({
                where: {
                    id: data.teacherId,
                },
            });
            if (!teacher) throw new BadRequestException(`Teacher with ID ${data.teacherId} not found!`);
        }
        const result = await this.prisma.group.update({
            where: { id },
            data,
        });

        return {
            data: result,
        };
    }

    async remove(id: number, force: boolean) {
        const exists = await this.prisma.group.count({ where: { id } });
        if (!exists) throw new BadRequestException(`Group with ID ${id} not found!`);

        if (force) await this.prisma.group.delete({ where: { id } });
        else await this.prisma.group.update({ where: { id }, data: { isActive: false } });
    }

    async findByDateAndTeacher(date: string, teacherId: number) {
        if (!date) throw new BadRequestException('Date is required');
        if (!teacherId) throw new BadRequestException('Teacher ID is required');
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        let dayType: GroupDayType | null = null;
        if (dayOfWeek === 0) return { data: [] }; // Sunday
        else if (dayOfWeek % 2 === 0) dayType = GroupDayType.EVEN;
        else dayType = GroupDayType.ODD;

        // Only groups created before or on the given date
        const groups = await this.prisma.group.findMany({
            where: {
                teacherId,
                dayType,
                createdAt: { lte: targetDate },
                isActive: true,
            },
            include: {
                students: { where: { isActive: true } },
            },
        });

        // Determine lesson status for each group
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const isToday = date === todayStr;
        const result = groups.map((group) => {
            // group.time format: 'HH:MM - HH:MM'
            let status = 'upcoming';
            if (date < todayStr) status = 'completed';
            else if (isToday && group.time) {
                const [start, end] = group.time.split(' - ');
                const [startHour, startMin] = start.split(':').map(Number);
                const [endHour, endMin] = end.split(':').map(Number);
                const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin);
                const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin);
                if (now > endTime) status = 'completed';
            }
            return { ...group, lessonStatus: status };
        });
        return { data: result };
    }

    private todayIs(): GroupDayType | null {
        const today = new Date().getDay();
        if (today === 0) return null;
        if (today % 2 === 0) return GroupDayType.EVEN;
        else return GroupDayType.ODD;
    }

    async notifyDebtors(groupId: number, dto: DebtorNotificationDto) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                students: {
                    where: { isActive: true, balance: { lt: 0 } },
                    include: { parents: true },
                },
            },
        });

        if (!group) throw new BadRequestException(`Group with ID ${groupId} not found`);

        if (!group.students.length) return { message: 'No debtors in this group' };

        let message = dto.message;
        if (!message) {
            const cfg = await this.prisma.config.findFirst({ where: { key: NotificationType.PAYMENT_REMINDER, userId: 0 } });
            message = cfg?.value ?? 'Dars toʼlovi boʼyicha qarzdorlikni toʼlang.';
        }

        const data: any[] = [];
        for (const student of group.students) {
            if (!student.parents.length) {
                throw new BadRequestException(`Student ${student.id} has no parents to notify`);
            }

            student.parents.forEach((parent) =>
                data.push({
                    type: NotificationType.PAYMENT_REMINDER,
                    message,
                    parentId: parent.id,
                    studentId: student.id,
                }),
            );
        }

        await this.prisma.notification.createMany({ data });

        return { message: `Queued ${data.length} notifications for ${group.students.length} debtor students` };
    }
}
