import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatisticsFilterDto } from './dto/statistics-filter.dto';
import { SalaryType } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

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
            students: { where: { isActive: true } } 
          } 
        } 
      },
    });

    if (!teacher) {
      throw new BadRequestException('Teacher not found');
    }

    // Get all student IDs for this teacher's groups
    const teacherStudentIds = teacher.groups.flatMap(group => 
      group.students.map(student => student.id)
    );

    // Determine the target year and month (default to current month)
    const now = new Date();
    const targetYear = filter.year ?? now.getFullYear();
    const targetMonth = filter.month ?? now.getMonth() + 1; // getMonth() returns 0-11, so +1

    // Create date range for the target month
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1); // month is 0-indexed
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999); // Last day of month

    // 1. Total students count (only teacher's students)
    const totalStudents = teacherStudentIds.length;

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

    // 6. Calculate should pay salary (what should be paid) for the target month
    let shouldPaySalary = 0;
    
    if (teacher.salaryType === SalaryType.FIXED) {
      // For FIXED salary: always the full base salary regardless of attendance
      shouldPaySalary = Number(teacher.salary);
      
    } else if (teacher.salaryType === SalaryType.PER_STUDENT) {
      // For PER_STUDENT: calculate based on unique students with attendance in the month
      const uniqueStudentsWithAttendance = await this.prisma.attendance.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: teacherStudentIds },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      });

      shouldPaySalary = Number(teacher.salary) * uniqueStudentsWithAttendance.length;
    }

    return {
      data: {
        teacherId: teacher.id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        salaryType: teacher.salaryType,
        baseSalary: Number(teacher.salary),
        totalStudents,
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
} 