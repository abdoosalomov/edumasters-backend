import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import { FilterStudentPaymentDto } from './dto/filter-student-payment.dto';

@Injectable()
export class StudentPaymentService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateStudentPaymentDto, employeeId: number) {
        const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
        if (!student) throw new BadRequestException(`Student with ID ${dto.studentId} not found`);

        const payment = await this.prisma.studentPayment.create({
            data: {
                studentId: dto.studentId,
                amount: dto.amount,
                employeeId: employeeId,
                discountAmount: dto.discountAmount,
                paymentType: dto.paymentType,
                paymentPhoto: dto.paymentPhoto,
                date: dto.date ? new Date(dto.date) : new Date(),
            },
        });

        // Update student's balance
        const netAmount = dto.amount - (dto.discountAmount ?? 0);
        await this.prisma.student.update({
            where: { id: dto.studentId },
            data: {
                balance: { increment: netAmount },
            },
        });

        return { data: payment };
    }

    async findAll(filter: FilterStudentPaymentDto) {
        const { page, limit, studentId, date } = filter;

        const where: any = {};
        if (studentId) where.studentId = studentId;

        if (date) {
            const dayStart = new Date(date);
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setUTCHours(23, 59, 59, 999);
            where.date = { gte: dayStart, lte: dayEnd };
        }

        const total = await this.prisma.studentPayment.count({ where });

        // Get aggregation totals
        const totals = await this.prisma.studentPayment.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });

        const cashTotal = await this.prisma.studentPayment.aggregate({
            where: { ...where, paymentType: 'CASH' },
            _sum: {
                amount: true,
            },
        });

        const cardTotal = await this.prisma.studentPayment.aggregate({
            where: { ...where, paymentType: 'CARD' },
            _sum: {
                amount: true,
            },
        });

        const payments = await this.prisma.studentPayment.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                student: true,
            },
            orderBy: {
                date: 'desc',
            },
        });

        return {
            data: payments,
            totals: {
                total: Number(totals._sum.amount || 0),
                cash: Number(cashTotal._sum.amount || 0),
                card: Number(cardTotal._sum.amount || 0),
            },
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const payment = await this.prisma.studentPayment.findUnique({
            where: { id },
            include: { student: true },
        });

        if (!payment) throw new BadRequestException(`Payment with ID ${id} not found`);
        return { data: payment };
    }

    async update(id: number, dto: UpdateStudentPaymentDto) {
        const exists = await this.prisma.studentPayment.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`Payment with ID ${id} not found`);

        const updated = await this.prisma.studentPayment.update({
            where: { id },
            data: dto,
        });

        return { data: updated };
    }

    async remove(id: number) {
        const exists = await this.prisma.studentPayment.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`Payment with ID ${id} not found`);

        await this.prisma.studentPayment.delete({ where: { id } });

        return { message: 'Payment deleted successfully' };
    }
}
