import { PrismaService } from 'src/prisma/prisma.service';
import { SalaryType } from '@prisma/client';

/**
 * Utility for consistent shouldPaySalary calculation across all services
 */
export class SalaryCalculationUtil {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate shouldPaySalary for a teacher for a specific time period
   * @param teacherId - Teacher ID
   * @param startDate - Start date of the period
   * @param endDate - End date of the period
   * @param updateDb - Whether to update the database with calculated value (default: true)
   * @returns Calculated shouldPaySalary amount
   */
  async calculateShouldPaySalary(
    teacherId: number,
    startDate: Date,
    endDate: Date,
    updateDb: boolean = true
  ): Promise<number> {
    // Get teacher with groups and ALL students (active and inactive)
    // Teacher should be paid for attendance regardless of student's current status
    const teacher = await this.prisma.employee.findUnique({
      where: { id: teacherId },
      include: {
        groups: {
          include: {
            students: true  // Remove isActive filter - teacher gets paid for ALL students with attendance
          }
        }
      },
    });

    if (!teacher) {
      throw new Error(`Teacher with ID ${teacherId} not found`);
    }

    let totalSalaryOwed = 0;

    if (teacher.salaryType === SalaryType.FIXED) {
      // For FIXED salary: always the full base salary
      totalSalaryOwed = Number(teacher.salary);
    } else if (teacher.salaryType === SalaryType.PER_STUDENT) {
      // For PER_STUDENT: calculate based on unique students with attendance in the period
      const studentIds = teacher.groups.flatMap(group => 
        group.students.map(student => student.id)
      );

      if (studentIds.length > 0) {
        const uniqueStudentsWithAttendance = await this.prisma.attendance.groupBy({
          by: ['studentId'],
          where: {
            studentId: { in: studentIds },
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        totalSalaryOwed = Number(teacher.salary) * uniqueStudentsWithAttendance.length;
      }
    }

    // Calculate already paid amount for the period
    const paidSalaries = await this.prisma.paidSalary.findMany({
      where: {
        teacherId: teacherId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const alreadyPaid = paidSalaries.reduce((total, record) => 
      total + Number(record.payed_amount), 0);

    // shouldPaySalary = remaining amount to pay
    const shouldPaySalary = Math.max(0, totalSalaryOwed - alreadyPaid);

    // Update the shouldPaySalary field in database if requested
    if (updateDb) {
      await this.prisma.employee.update({
        where: { id: teacherId },
        data: { shouldPaySalary: shouldPaySalary },
      });
    }

    return shouldPaySalary;
  }

  /**
   * Calculate shouldPaySalary for current month
   * @param teacherId - Teacher ID
   * @param updateDb - Whether to update the database (default: true)
   */
  async calculateCurrentMonthShouldPaySalary(teacherId: number, updateDb: boolean = true): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return this.calculateShouldPaySalary(teacherId, startOfMonth, endOfMonth, updateDb);
  }
}
