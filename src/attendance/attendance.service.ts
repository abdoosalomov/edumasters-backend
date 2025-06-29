import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';

@Injectable()
export class AttendanceService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateAttendanceDto) {
        const student = await this.prisma.student.findUnique({ where: { id: data.studentId } });
        if (!student) throw new BadRequestException(`Student with ID ${data.studentId} not found`);

        const group = await this.prisma.group.findUnique({ where: { id: data.groupId } });
        if (!group) throw new BadRequestException(`Group with ID ${data.groupId} not found`);

        const attendance = await this.prisma.attendance.create({
            data: {
                ...data,
                date: data.date ? new Date(data.date) : new Date(),
            },
        });

        return { data: attendance };
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
