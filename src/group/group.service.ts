import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { FilterGroupDto, OrderDirection } from './dto/filter-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupDayType } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { DebtorNotificationDto } from './dto/debtor-notification.dto';
import { parseTashkentDate, getTashkentDayOfWeek, getTashkentDateString } from '../common/utils/timezone.util';

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
                    where: { isActive: true, frozen: false },
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
        // Parse date in Tashkent timezone (UTC+5)
        const targetDate = parseTashkentDate(date);
        const dayOfWeek = getTashkentDayOfWeek(targetDate);
        let dayType: GroupDayType | null = null;
        if (dayOfWeek === 0) return { data: [] }; // Sunday
        else if (dayOfWeek % 2 === 0) dayType = GroupDayType.EVEN;
        else dayType = GroupDayType.ODD;

        // Check if teacher exists
        const teacher = await this.prisma.employee.findUnique({
            where: { id: teacherId },
            select: { id: true, firstName: true, lastName: true, isActive: true, isTeacher: true }
        });
        
        if (!teacher) {
            console.log(`❌ Teacher with ID ${teacherId} not found`);
            return { data: [], message: `Teacher with ID ${teacherId} not found` };
        }

        console.log(`👨‍🏫 Teacher found: ${teacher.firstName} ${teacher.lastName}, Active: ${teacher.isActive}, IsTeacher: ${teacher.isTeacher}`);

        // Get groups that were created before or on the target date
        // This ensures groups only appear after they are created
        // We need to compare dates at the day level, not exact timestamps
        const targetDateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const targetDateEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
        
        // Debug logging
        console.log(`🔍 Debug: Date=${date}, TeacherId=${teacherId}, TargetDate=${targetDate.toISOString()}, DayOfWeek=${dayOfWeek}, DayType=${dayType}`);
        console.log(`🌍 Timezone Debug: Tashkent date: ${targetDate.toDateString()}, Timezone: Asia/Tashkent (UTC+5), Current time: ${new Date().toISOString()}`);
        console.log(`📅 Date Range: ${targetDateStart.toISOString()} to ${targetDateEnd.toISOString()}`);
        
        const groups = await this.prisma.group.findMany({
            where: {
                teacherId,
                dayType,
                isActive: true,
                // Only include groups that were created before or on the target date
                createdAt: { lte: targetDateEnd },
            },
            include: {
                students: { where: { isActive: true } },
            },
        });

        console.log(`📊 Found ${groups.length} groups for teacher ${teacherId} with dayType ${dayType} (for date ${date})`);
        console.log(`🔍 Note: Groups created after ${date} are automatically excluded from results`);
        groups.forEach(group => {
            const createdBeforeTarget = group.createdAt <= targetDateEnd;
            console.log(`  - Group: ${group.title} (ID: ${group.id}), Created: ${group.createdAt.toISOString().split('T')[0]}, Valid for ${date}: ${createdBeforeTarget}, Students: ${group.students.length}`);
        });

        // Determine lesson status for each group based on attendance records
        // Reuse the already defined targetDateStart and targetDateEnd variables
        
        const result = await Promise.all(groups.map(async (group) => {
            // Check if there's any attendance record for this group on the target date
            const attendanceExists = await this.prisma.attendance.findFirst({
                where: {
                    groupId: group.id,
                    date: {
                        gte: targetDateStart,
                        lte: targetDateEnd,
                    },
                },
            });
            
            let status = 'upcoming';
            if (attendanceExists) {
                // If attendance exists, the lesson happened (completed)
                status = 'completed';
            } else {
                // Check if the target date is in the past (using Tashkent timezone)
                const todayStr = getTashkentDateString(); // YYYY-MM-DD format in Tashkent timezone
                
                console.log(`📅 Date comparison for group ${group.id}: target="${date}", today="${todayStr}", isPast=${date < todayStr}`);
                
                if (date < todayStr) {
                    // If target date is yesterday or older with no attendance, mark as missed
                    status = 'missed';
                } else {
                    // If target date is today or future, mark as upcoming
                    status = 'upcoming';
                }
            }
            
            return { ...group, lessonStatus: status };
        }));
        
        return { data: result };
    }

    private todayIs(): GroupDayType | null {
        const today = getTashkentDayOfWeek();
        if (today === 0) return null;
        if (today % 2 === 0) return GroupDayType.EVEN;
        else return GroupDayType.ODD;
    }

    async notifyDebtors(groupId: number, dto: DebtorNotificationDto) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                students: {
                    where: { isActive: true, frozen: false, balance: { lt: 0 } },
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
        const minBalance = ((await this.prisma.config.findFirst({where: {key: 'MIN_STUDENT_BALANCE'}, select: {value: true}}))?.value ?? '-500000');
        const formattedMinBalance = new Intl.NumberFormat('de-DE').format(Number(minBalance));;

        for (const student of group.students) {
            if (!student.parents.length) {
                throw new BadRequestException(`Student ${student.id} has no parents to notify`);
            }

            student.parents.forEach((parent) =>
                data.push({
                    type: NotificationType.PAYMENT_REMINDER,
                    message: message.replace('{{STUDENT_NAME}}', student.firstName + ' ' + student.lastName)
                                    .replace('{{STUDENT_BALANCE}}', new Intl.NumberFormat('de-DE').format(Number(student.balance)))
                                    .replace('{{MIN_BALANCE}}', formattedMinBalance),
                    telegramId: parent.telegramId,
                }),
            );
        }

        await this.prisma.notification.createMany({ data });

        return { message: `Queued ${data.length} notifications for ${group.students.length} debtor students` };
    }
}
