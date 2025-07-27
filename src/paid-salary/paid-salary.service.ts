import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaidSalaryDto } from './dto/create-paid-salary.dto';
import { UpdatePaidSalaryDto } from './dto/update-paid-salary.dto';

@Injectable()
export class PaidSalaryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaidSalaryDto) {
    // Validate teacher exists
    const teacher = await this.prisma.employee.findUnique({ where: { id: dto.teacherId } });
    if (!teacher) throw new BadRequestException('Teacher not found');
    // Create paid salary
    const paidSalary = await this.prisma.paidSalary.create({
      data: {
        teacherId: dto.teacherId,
        payed_amount: dto.payed_amount,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
    return { data: paidSalary };
  }

  async findAll() {
    const records = await this.prisma.paidSalary.findMany({
      include: { teacher: true },
      orderBy: { date: 'desc' },
    });
    return { data: records };
  }

  async findOne(id: number) {
    const record = await this.prisma.paidSalary.findUnique({
      where: { id },
      include: { teacher: true },
    });
    if (!record) throw new NotFoundException('Paid salary record not found');
    return { data: record };
  }

  async update(id: number, dto: UpdatePaidSalaryDto) {
    const record = await this.prisma.paidSalary.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Paid salary record not found');
    if (dto.teacherId) {
      const teacher = await this.prisma.employee.findUnique({ where: { id: dto.teacherId } });
      if (!teacher) throw new BadRequestException('Teacher not found');
    }
    const updated = await this.prisma.paidSalary.update({
      where: { id },
      data: {
        teacherId: dto.teacherId ?? undefined,
        payed_amount: dto.payed_amount ?? undefined,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
    return { data: updated };
  }

  async remove(id: number) {
    const record = await this.prisma.paidSalary.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Paid salary record not found');
    await this.prisma.paidSalary.delete({ where: { id } });
    return { message: 'Paid salary record deleted' };
  }
}
