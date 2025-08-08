import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from 'src/config/config.service';
import { CreateChequeDto } from './dto/create-cheque.dto';
import { UpdateChequeDto } from './dto/update-cheque.dto';
import { FilterChequeDto } from './dto/filter-cheque.dto';

@Injectable()
export class ChequeService {
  private readonly logger = new Logger(ChequeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateChequeDto, adminId: number) {
    const chequeDate = dto.date ? new Date(dto.date) : new Date();
    const dayStart = new Date(chequeDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(chequeDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // Check if cheque already exists for this admin and date
    const existingCheque = await this.prisma.cheque.findFirst({
      where: {
        adminId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    if (existingCheque) {
      throw new BadRequestException('Cheque already exists for this date');
    }

    // Get all student payments for this date
    const studentPayments = await this.prisma.studentPayment.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        student: true,
        adminId: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calculate totals
    const totalAmount = studentPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const cashTotal = studentPayments
      .filter(payment => payment.paymentType === 'CASH')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const cardTotal = studentPayments
      .filter(payment => payment.paymentType === 'CARD')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Generate report
    const report = this.generateChequeReport(studentPayments, {
      totalAmount,
      cashTotal,
      cardTotal,
      date: chequeDate,
    });

    // Create cheque
    const cheque = await this.prisma.cheque.create({
      data: {
        adminId,
        date: chequeDate,
        report,
      },
      include: {
        admin: true,
      },
    });

    // Send to telegram if CHEQUE_SEND_ID is configured
    await this.sendChequeToTelegram(cheque, studentPayments);

    return { data: cheque };
  }

  async closeDailyCheque(adminId: number) {
    const today = new Date();
    const dayStart = new Date(today);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(today);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // Check if cheque already exists for today
    const existingCheque = await this.prisma.cheque.findFirst({
      where: {
        adminId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    if (existingCheque) {
      throw new BadRequestException('Daily cheque already closed for today');
    }

    // Get all student payments for today
    const studentPayments = await this.prisma.studentPayment.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        student: true,
        adminId: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calculate totals
    const totalAmount = studentPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const cashTotal = studentPayments
      .filter(payment => payment.paymentType === 'CASH')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const cardTotal = studentPayments
      .filter(payment => payment.paymentType === 'CARD')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Generate report
    const report = this.generateChequeReport(studentPayments, {
      totalAmount,
      cashTotal,
      cardTotal,
      date: today,
    });

    // Create cheque
    const cheque = await this.prisma.cheque.create({
      data: {
        adminId,
        date: today,
        report,
      },
      include: {
        admin: true,
      },
    });

    // Send to telegram if CHEQUE_SEND_ID is configured
    await this.sendChequeToTelegram(cheque, studentPayments);

    return { data: cheque };
  }

  async findAll(filter: FilterChequeDto) {
    const { page = 1, limit = 10, date, adminId } = filter;

    const where: any = {};
    if (adminId) where.adminId = adminId;

    if (date) {
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setUTCHours(23, 59, 59, 999);
      where.date = { gte: dayStart, lte: dayEnd };
    }

    const total = await this.prisma.cheque.count({ where });

    const cheques = await this.prisma.cheque.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        admin: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return {
      data: cheques,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const cheque = await this.prisma.cheque.findUnique({
      where: { id },
      include: {
        admin: true,
      },
    });

    if (!cheque) {
      throw new BadRequestException(`Cheque with ID ${id} not found`);
    }

    return { data: cheque };
  }

  async update(id: number, dto: UpdateChequeDto) {
    const exists = await this.prisma.cheque.findUnique({ where: { id } });
    if (!exists) {
      throw new BadRequestException(`Cheque with ID ${id} not found`);
    }

    const cheque = await this.prisma.cheque.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        report: dto.report,
      },
      include: {
        admin: true,
      },
    });

    return { data: cheque };
  }

  async remove(id: number) {
    const exists = await this.prisma.cheque.findUnique({ where: { id } });
    if (!exists) {
      throw new BadRequestException(`Cheque with ID ${id} not found`);
    }

    await this.prisma.cheque.delete({ where: { id } });

    return { message: 'Cheque deleted successfully' };
  }

  async isChequeClosedForDate(date: Date, adminId?: number): Promise<boolean> {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const where: any = {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    };

    if (adminId) {
      where.adminId = adminId;
    }

    const cheque = await this.prisma.cheque.findFirst({ where });
    return !!cheque;
  }

  async closeChequeAutomatically() {
    const today = new Date();
    const dayStart = new Date(today);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(today);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // Get all admins
    const admins = await this.prisma.admin.findMany({
      where: { isActive: true },
    });

    for (const admin of admins) {
      try {
        // Check if cheque already exists for this admin and today
        const existingCheque = await this.prisma.cheque.findFirst({
          where: {
            adminId: admin.id,
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        });

        if (existingCheque) {
          continue; // Cheque already exists for this admin
        }

        // Get all student payments for today
        const studentPayments = await this.prisma.studentPayment.findMany({
          where: {
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          include: {
            student: true,
            adminId: true,
          },
          orderBy: {
            date: 'asc',
          },
        });

        if (studentPayments.length === 0) {
          continue; // No payments for today
        }

        // Calculate totals
        const totalAmount = studentPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const cashTotal = studentPayments
          .filter(payment => payment.paymentType === 'CASH')
          .reduce((sum, payment) => sum + Number(payment.amount), 0);
        const cardTotal = studentPayments
          .filter(payment => payment.paymentType === 'CARD')
          .reduce((sum, payment) => sum + Number(payment.amount), 0);

        // Generate report
        const report = this.generateChequeReport(studentPayments, {
          totalAmount,
          cashTotal,
          cardTotal,
          date: today,
        });

        // Create cheque
        const cheque = await this.prisma.cheque.create({
          data: {
            adminId: admin.id,
            date: today,
            report,
          },
          include: {
            admin: true,
          },
        });

        // Send to telegram
        await this.sendChequeToTelegram(cheque, studentPayments);

        this.logger.log(`Auto-closed cheque for admin ${admin.name} on ${today.toDateString()}`);
      } catch (error) {
        this.logger.error(`Failed to auto-close cheque for admin ${admin.name}: ${error.message}`);
      }
    }
  }

  private generateChequeReport(studentPayments: any[], totals: any): string {
    const { totalAmount, cashTotal, cardTotal, date } = totals;
    
    let report = `📊 KUNLIK HISOBOT\n`;
    report += `📅 Sana: ${date.toLocaleDateString('uz-UZ')}\n`;
    report += `⏰ Vaqt: ${date.toLocaleTimeString('uz-UZ')}\n\n`;
    
    report += `💰 JAMI:\n`;
    report += `• Umumiy summa: ${totalAmount.toLocaleString()} so'm\n`;
    report += `• Naqd pul: ${cashTotal.toLocaleString()} so'm\n`;
    report += `• Plastik karta: ${cardTotal.toLocaleString()} so'm\n\n`;
    
    report += `📋 TO'LOVLAR TAFSILOTI:\n`;
    report += `Jami to'lovlar: ${studentPayments.length} ta\n\n`;
    
    if (studentPayments.length > 0) {
      report += `📝 TO'LOVLAR RO'YXATI:\n`;
      studentPayments.forEach((payment, index) => {
        const discountText = payment.discountAmount ? ` (Chegirma: ${payment.discountAmount} so'm)` : '';
        report += `${index + 1}. ${payment.student.firstName} ${payment.student.lastName}\n`;
        report += `   Summa: ${payment.amount} so'm${discountText}\n`;
        report += `   Turi: ${payment.paymentType === 'CASH' ? 'Naqd pul' : 'Plastik karta'}\n`;
        report += `   Vaqt: ${payment.date.toLocaleTimeString('uz-UZ')}\n\n`;
      });
    }
    
    return report;
  }

  private async sendChequeToTelegram(cheque: any, studentPayments: any[]) {
    try {
      // Get CHEQUE_SEND_ID from config
      const configResult = await this.configService.findByKey('CHEQUE_SEND_ID');
      if (!configResult.data) {
        this.logger.warn('CHEQUE_SEND_ID not configured, skipping telegram send');
        return;
      }

      const telegramId = configResult.data.value;
      
      // Import telegram bot dynamically to avoid circular dependencies
      const { sendMessage } = await import('../bot');
      
      await sendMessage({ message: cheque.report, chatId: telegramId });
      this.logger.log(`Cheque sent to telegram ID: ${telegramId}`);
    } catch (error) {
      this.logger.error(`Failed to send cheque to telegram: ${error.message}`);
    }
  }
}
