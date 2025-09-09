import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsFilterDto } from './dto/statistics-filter.dto';
import { DirectorStatisticsFilterDto } from './dto/director-statistics-filter.dto';
import { SalaryType } from '@prisma/client';
import { SalaryCalculationUtil } from '../common/utils/salary-calculation.util';

@Injectable()
export class StatisticsService {
  private salaryCalculationUtil: SalaryCalculationUtil;

  constructor(private readonly prisma: PrismaService) {
    this.salaryCalculationUtil = new SalaryCalculationUtil(prisma);
  }

  async getStatistics(filter: StatisticsFilterDto) {
    // Teacher ID is required
    if (!filter.teacherId) {
      throw new BadRequestException('Teacher ID is required');
    }

    // Get teacher with their groups and students
    const teacher = await this.prisma.employee.findUnique({
      where: { id: filter.teacherId },
      include: { 
        groups: { 
          include: { 
            students: true  // Remove isActive filter - teacher gets paid for ALL students with attendance
          } 
        } 
      },
    });

    if (!teacher) {
      throw new BadRequestException('Teacher not found');
    }

    // Get all student IDs for this teacher's groups (for salary/attendance calculations)
    const teacherStudentIds = teacher.groups.flatMap(group => 
      group.students.map(student => student.id)
    );

    // Get only active student IDs for counting purposes
    const activeTeacherStudentIds = teacher.groups.flatMap(group => 
      group.students.filter(student => student.isActive).map(student => student.id)
    );

    // Determine the target year and month (default to current month)
    const now = new Date();
    const targetYear = filter.year ?? now.getFullYear();
    const targetMonth = filter.month ?? now.getMonth() + 1; // getMonth() returns 0-11, so +1

    // Create date range for the target month
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1); // month is 0-indexed
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999); // Last day of month

    // 1. Total students count (only active teacher's students)
    const totalStudents = activeTeacherStudentIds.length;

    // 2. Monthly attendance rate in percent (only teacher's students)
    const totalAttendanceRecords = await this.prisma.attendance.count({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        studentId: { in: teacherStudentIds },
      },
    });

    const presentAttendanceRecords = await this.prisma.attendance.count({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        status: 'PRESENT',
        studentId: { in: teacherStudentIds },
      },
    });

    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100) 
      : 0;

    // 3. Monthly newcomers count (only teacher's students)
    const newcomersCount = await this.prisma.student.count({
      where: {
        cameDate: { gte: startOfMonth, lte: endOfMonth },
        isActive: true,
        id: { in: teacherStudentIds },
      },
    });

    // 4. Monthly left count (only teacher's students)
    const leftCount = await this.prisma.student.count({
      where: {
        updatedAt: { gte: startOfMonth, lte: endOfMonth },
        isActive: false,
        id: { in: teacherStudentIds },
      },
    });

    // 5. Calculate paid salary (actual amount paid) for the target month
    const paidSalaryRecords = await this.prisma.paidSalary.findMany({
      where: {
        teacherId: teacher.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });
    
    const paidSalary = paidSalaryRecords.reduce((total, record) => 
      total + Number(record.payed_amount), 0);

    // 6. Calculate and update should pay salary using shared utility
    const shouldPaySalary = await this.salaryCalculationUtil.calculateShouldPaySalary(
      teacher.id, 
      startOfMonth, 
      endOfMonth, 
      true  // Update DB
    );

    // Count active groups for this teacher
    const groupCount = teacher.groups.filter(group => group.isActive).length;

    return {
      data: {
        teacherId: teacher.id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        salaryType: teacher.salaryType,
        baseSalary: Number(teacher.salary),
        totalStudents,
        groupCount,
        attendanceRate,
        newcomersCount,
        leftCount,
        salary: {
          paidSalary,
          shouldPaySalary,
          difference: shouldPaySalary - paidSalary,
          isPaidInFull: paidSalary >= shouldPaySalary,
        },
        year: targetYear,
        month: targetMonth,
        monthName: new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' }),
        dateRange: {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0],
        },
      },
    };
  }

  async getDirectorStatistics(filter: DirectorStatisticsFilterDto) {
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    let isDateFiltered = false;

    // Handle date filtering
    if (filter.fromDate && filter.toDate) {
      const fromDate = new Date(filter.fromDate);
      const toDate = new Date(filter.toDate);
      
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
      }
      
      if (fromDate > toDate) {
        throw new BadRequestException('fromDate cannot be later than toDate');
      }

      // Set time to start and end of day for accurate filtering
      startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      isDateFiltered = true;
    } else {
      // If no dates provided, get current month for should pay calculations
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // 1st day of current month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of current month
    }

    // 1. Get active students count
    const studentsCount = await this.prisma.student.count({
      where: {
        isActive: true,
      },
    });

    // 2. Get teachers count
    const teachersCount = await this.prisma.employee.count({
      where: {
        isActive: true,
        isTeacher: true,
      },
    });

    // 3. Get active groups count
    const groupsCount = await this.prisma.group.count({
      where: {
        isActive: true,
      },
    });

    // 4. Calculate income - if dates provided, filter by dates; otherwise get all-time
    let incomeQuery: any = {};
    if (isDateFiltered) {
      incomeQuery.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const studentPayments = await this.prisma.studentPayment.findMany({
      where: incomeQuery,
      select: {
        amount: true,
        discountAmount: true,
      },
    });

    const income = studentPayments.reduce((total, payment) => {
      const amount = Number(payment.amount);
      const discount = Number(payment.discountAmount || 0);
      return total + (amount - discount);
    }, 0);

    // 5. Calculate outcome - if dates provided, filter by dates; otherwise get all-time
    let outcomeQuery: any = {};
    if (isDateFiltered) {
      outcomeQuery.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const paidSalaries = await this.prisma.paidSalary.findMany({
      where: outcomeQuery,
      select: {
        payed_amount: true,
      },
    });

    const outcome = paidSalaries.reduce((total, salary) => {
      return total + Number(salary.payed_amount);
    }, 0);

    // 6. Get debtors count (students with negative balance, excluding frozen and deleted students)
    const debtorsCount = await this.prisma.student.count({
      where: {
        isActive: true,
        frozen: false,
        isDeleted: false,
        balance: {
          lt: 0,
        },
      },
    });

    // 7. Calculate and update should pay salary for all teachers
    const teachers = await this.prisma.employee.findMany({
      where: {
        isActive: true,
        isTeacher: true,
      },
      include: {
        groups: {
          include: {
            students: true  // Remove isActive filter - teacher gets paid for ALL students with attendance
          }
        }
      },
    });

    let totalShouldPaySalary = 0;

    for (const teacher of teachers) {
      // Get all student IDs for this teacher's groups
      const teacherStudentIds = teacher.groups.flatMap(group => 
        group.students.map(student => student.id)
      );

      // Calculate shouldPaySalary using shared utility
      const shouldPaySalary = await this.salaryCalculationUtil.calculateShouldPaySalary(
        teacher.id,
        startDate,
        endDate,
        true  // Update DB
      );

      totalShouldPaySalary += shouldPaySalary;
    }

    return {
      studentsCount,
      teachersCount,
      groupsCount,
      income: Number(income.toFixed(2)),
      outcome: Number(outcome.toFixed(2)),
      debtorsCount,
      shouldPaySalary: Number(totalShouldPaySalary.toFixed(2)),
      period: isDateFiltered ? `${filter.fromDate} to ${filter.toDate}` : 'All time',
    };
  }
} 