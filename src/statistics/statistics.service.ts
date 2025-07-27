import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatisticsFilterDto } from './dto/statistics-filter.dto';
import { SalaryType } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics(filter: StatisticsFilterDto) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // 1. Total students count (all active students)
    const totalStudents = await this.prisma.student.count({
      where: { isActive: true },
    });

    // 2. Today's attendance rate in percent
    const totalAttendanceRecords = await this.prisma.attendance.count({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    const presentAttendanceRecords = await this.prisma.attendance.count({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        status: 'PRESENT',
      },
    });

    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100) 
      : 0;

    // 3. Today's newcomers count
    const newcomersCount = await this.prisma.student.count({
      where: {
        cameDate: { gte: startOfDay, lte: endOfDay },
        isActive: true,
      },
    });

    // 4. Today's left count
    const leftCount = await this.prisma.student.count({
      where: {
        updatedAt: { gte: startOfDay, lte: endOfDay },
        isActive: false,
      },
    });

    // 5. Teacher salary for this month (if teacherId provided)
    let teacherSalary = 0;
    if (filter.teacherId) {
      const teacher = await this.prisma.employee.findUnique({
        where: { id: filter.teacherId },
        include: { groups: { include: { students: { where: { isActive: true } } } } },
      });

      if (teacher) {
        if (teacher.salaryType === SalaryType.FIXED) {
          teacherSalary = Number(teacher.salary);
        } else if (teacher.salaryType === SalaryType.PER_STUDENT) {
          // Count active students, excluding those who joined in last 14 days
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

          const eligibleStudents = teacher.groups.reduce((total, group) => {
            const eligibleInGroup = group.students.filter(student => 
              student.cameDate < fourteenDaysAgo
            ).length;
            return total + eligibleInGroup;
          }, 0);

          teacherSalary = Number(teacher.salary) * eligibleStudents;
        }
      }
    }

    return {
      data: {
        totalStudents,
        attendanceRate,
        newcomersCount,
        leftCount,
        teacherSalary,
        date: today.toISOString().split('T')[0], // YYYY-MM-DD format
      },
    };
  }
} 