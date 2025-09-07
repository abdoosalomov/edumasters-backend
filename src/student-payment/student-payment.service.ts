import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import { FilterStudentPaymentDto } from './dto/filter-student-payment.dto';

@Injectable()
export class StudentPaymentService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateStudentPaymentDto, adminId: number) {
        // Validate admin exists
        const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
        if (!admin) {
            throw new BadRequestException(`Admin with ID ${adminId} not found`);
        }

        const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
        if (!student) throw new BadRequestException(`Student with ID ${dto.studentId} not found`);

        // Validate discount amount (can be any positive value now)
        if (dto.discountAmount && dto.discountAmount < 0) {
            throw new BadRequestException('Discount amount cannot be negative');
        }

        // Check if cheque is closed for today
        const paymentDate = dto.date ? new Date(dto.date) : new Date();
        const isChequeClosed = await this.isChequeClosedForDate(paymentDate);
        if (isChequeClosed) {
            throw new BadRequestException('Cannot add payment: Daily cheque is already closed for this date');
        }

        const payment = await this.prisma.studentPayment.create({
            data: {
                studentId: dto.studentId,
                amount: dto.amount,
                adminId: adminId,
                discountAmount: dto.discountAmount,
                paymentType: dto.paymentType,
                paymentPhoto: dto.paymentPhoto,
                date: dto.date ? new Date(dto.date) : new Date(),
            },
        });

        // Update student's balance
        const netAmount = Number(dto.amount) + Number(dto.discountAmount ?? 0);
        await this.prisma.student.update({
            where: { id: dto.studentId },
            data: {
                balance: { increment: netAmount },
            },
        });

        return { data: payment };
    }

    private async isChequeClosedForDate(date: Date): Promise<boolean> {
        const dayStart = new Date(date);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setUTCHours(23, 59, 59, 999);

        // Simply check if any cheque exists for the date
        const cheque = await this.prisma.cheque.findFirst({
            where: {
                date: {
                    gte: dayStart,
                    lte: dayEnd,
                },
            },
        });
        return !!cheque;
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
        const existingPayment = await this.prisma.studentPayment.findUnique({ 
            where: { id },
            include: { student: true }
        });
        if (!existingPayment) throw new BadRequestException(`Payment with ID ${id} not found`);

        // Check if student is frozen
        if (existingPayment.student.frozen) {
            throw new BadRequestException(`Cannot update payment for frozen student ${existingPayment.studentId}`);
        }

        // Validate discount amount (can be any positive value now)
        if (dto.discountAmount !== undefined && dto.discountAmount < 0) {
            throw new BadRequestException('Discount amount cannot be negative');
        }

        // Calculate old net amount
        const oldNetAmount = Number(existingPayment.amount) + Number(existingPayment.discountAmount ?? 0);

        // Update payment
        const updatedPayment = await this.prisma.studentPayment.update({
            where: { id },
            data: dto,
        });

        // Calculate new net amount
        const newAmount = dto.amount ?? existingPayment.amount;
        const newDiscountAmount = dto.discountAmount ?? existingPayment.discountAmount;
        const newNetAmount = Number(newAmount) + Number(newDiscountAmount ?? 0);

        // Update student balance with the difference
        const balanceDifference = newNetAmount - oldNetAmount;
        if (balanceDifference !== 0) {
            await this.prisma.student.update({
                where: { id: existingPayment.studentId },
                data: {
                    balance: { increment: balanceDifference },
                },
            });
        }

        return { data: updatedPayment };
    }

    async remove(id: number) {
        const existingPayment = await this.prisma.studentPayment.findUnique({ 
            where: { id },
            include: { student: true }
        });
        if (!existingPayment) throw new BadRequestException(`Payment with ID ${id} not found`);

        // Check if student is frozen
        if (existingPayment.student.frozen) {
            throw new BadRequestException(`Cannot delete payment for frozen student ${existingPayment.studentId}`);
        }

        // Calculate net amount to reverse
        const netAmount = Number(existingPayment.amount) + Number(existingPayment.discountAmount ?? 0);

        // Delete payment
        await this.prisma.studentPayment.delete({ where: { id } });

        // Reverse the balance change
        await this.prisma.student.update({
            where: { id: existingPayment.studentId },
            data: {
                balance: { decrement: netAmount },
            },
        });

        return { message: 'Payment deleted successfully' };
    }
}
