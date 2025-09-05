import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { FilterEmployeeDto } from './dto/filter-employee.dto';
import { GroupDayType, SalaryType } from '@prisma/client';

@Injectable()
export class EmployeeService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateEmployeeDto) {
        // Check if role exists
        const roleExists = await this.prisma.employeeRole.findUnique({
            where: { id: data.roleId },
        });
        if (!roleExists) {
            throw new BadRequestException('Role not found');
        }

        // Check if username already exists
        const existingEmployee = await this.prisma.employee.findUnique({
            where: { username: data.username },
        });
        if (existingEmployee) {
            throw new BadRequestException('Username already exists');
        }

        const result = await this.prisma.employee.create({
            data,
            include: {
                role: true,
                paidSalaries: true,
                groups: true,
            },
        });

        return { data: result };
    }

    async findAll(filter: FilterEmployeeDto) {
        const { page = 1, limit = 10, search, roleId, isActive, isTeacher, salaryType, orderBy, order } = filter;

        const where: any = {};

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (typeof isActive === 'string') {
            where.isActive = isActive === 'true';
        }

        if (typeof isTeacher === 'string') {
            where.isTeacher = isTeacher === 'true';
        }

        if (roleId) {
            where.roleId = roleId;
        }

        if (salaryType) {
            where.salaryType = salaryType;
        }

        const total = await this.prisma.employee.count({ where });

        const employees = await this.prisma.employee.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                role: true,
                paidSalaries: true,
                groups: {
                    include: {
                        students: { where: { isActive: true } },
                    },
                },
            },
            orderBy: {
                [orderBy ?? 'createdAt']: order ?? 'desc',
            },
        });

        // Calculate should pay salary and current month paid salary for each employee
        const employeesWithSalaryCalculation = await Promise.all(
            employees.map(async (employee) => {
                const shouldPaySalary = await this.calculateShouldPaySalary(employee.id);
                const currentMonthPaid = await this.getCurrentMonthPaidSalary(employee.id);
                const groupsCount = employee.groups.length;
                const studentsCount = employee.groups.reduce((total, group) => total + group.students.length, 0);
                return {
                    ...employee,
                    shouldPaySalary,
                    currentMonthPaid,
                    groupsCount,
                    studentsCount,
                };
            }),
        );

        return {
            data: employeesWithSalaryCalculation,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
            include: {
                role: true,
                paidSalaries: {
                    orderBy: { date: 'desc' },
                },
                groups: {
                    include: {
                        students: { where: { isActive: true } },
                        tests: true,
                    },
                },
            },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const shouldPaySalary = await this.calculateShouldPaySalary(id);
        const currentMonthPaid = await this.getCurrentMonthPaidSalary(id);
        const groupsCount = employee.groups.length;
        const studentsCount = employee.groups.reduce((total, group) => total + group.students.length, 0);

        return {
            data: {
                ...employee,
                shouldPaySalary,
                currentMonthPaid,
                groupsCount,
                studentsCount,
            },
        };
    }

    async update(id: number, data: UpdateEmployeeDto) {
        // Check if employee exists
        const existingEmployee = await this.prisma.employee.findUnique({
            where: { id },
        });
        if (!existingEmployee) {
            throw new NotFoundException('Employee not found');
        }

        // Check if role exists if roleId is being updated
        if (data.roleId) {
            const roleExists = await this.prisma.employeeRole.findUnique({
                where: { id: data.roleId },
            });
            if (!roleExists) {
                throw new BadRequestException('Role not found');
            }
        }

        // Check if username already exists if username is being updated
        if (data.username) {
            const existingEmployeeWithUsername = await this.prisma.employee.findFirst({
                where: {
                    username: data.username,
                    id: { not: id },
                },
            });
            if (existingEmployeeWithUsername) {
                throw new BadRequestException('Username already exists');
            }
        }

        const result = await this.prisma.employee.update({
            where: { id },
            data,
            include: {
                role: true,
                paidSalaries: true,
                groups: true,
            },
        });

        return { data: result };
    }

    async remove(id: number, force: boolean = false) {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        if (force) {
            await this.prisma.employee.delete({ where: { id } });
        } else {
            await this.prisma.employee.update({
                where: { id },
                data: { isActive: false },
            });
        }

        return { message: 'Employee removed successfully' };
    }

    async calculateShouldPaySalary(employeeId: number): Promise<number> {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                groups: {
                    include: {
                        students: { where: { isActive: true } },
                    },
                },
            },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        let shouldPaySalary = 0;

        if (employee.salaryType === SalaryType.FIXED) {
            // For FIXED salary: always the full base salary
            shouldPaySalary = Number(employee.salary);
        } else if (employee.salaryType === SalaryType.PER_STUDENT) {
            // For PER_STUDENT: calculate based on unique students with attendance in current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            const studentIds = employee.groups.flatMap(group => 
                group.students.map(student => student.id)
            );

            if (studentIds.length > 0) {
                const uniqueStudentsWithAttendance = await this.prisma.attendance.groupBy({
                    by: ['studentId'],
                    where: {
                        studentId: { in: studentIds },
                        date: {
                            gte: startOfMonth,
                            lte: endOfMonth,
                        },
                    },
                });

                shouldPaySalary = Number(employee.salary) * uniqueStudentsWithAttendance.length;
            }
        }

        // Update the shouldPaySalary field in database
        await this.prisma.employee.update({
            where: { id: employeeId },
            data: { shouldPaySalary: shouldPaySalary },
        });

        return shouldPaySalary;
    }

    async getCurrentMonthPaidSalary(employeeId: number): Promise<number> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const paidSalaries = await this.prisma.paidSalary.findMany({
            where: {
                teacherId: employeeId,
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
        });

        return paidSalaries.reduce((total, paidSalary) => total + Number(paidSalary.payed_amount), 0);
    }

    async getSalaryHistory(employeeId: number) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                paidSalaries: {
                    orderBy: { date: 'desc' },
                },
                groups: {
                    include: {
                        students: { where: { isActive: true } },
                    },
                },
            },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const shouldPaySalary = await this.calculateShouldPaySalary(employeeId);
        const currentMonthPaid = await this.getCurrentMonthPaidSalary(employeeId);
        const totalPaid = employee.paidSalaries.reduce((total, paidSalary) => total + Number(paidSalary.payed_amount), 0);

        return {
            data: {
                employee: {
                    id: employee.id,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    salary: employee.salary,
                    salaryType: employee.salaryType,
                },
                currentMonth: {
                    shouldPay: shouldPaySalary,
                    paid: currentMonthPaid,
                },
                totalPaid,
                paidSalaries: employee.paidSalaries,
                totalStudents: employee.groups.reduce((total, group) => total + group.students.length, 0),
            },
        };
    }

    async getSalaryReport(year: number, month: number) {
        if (!year || !month) {
            throw new Error('Year and month are required');
        }
        if (month < 1 || month > 12) {
            throw new Error('Month must be between 1 and 12');
        }
        if (year < 2020) {
            throw new Error('Year must be 2020 or later');
        }
        // Calculate start and end of the month
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        // Get all employees with their groups and paid salaries for the month
        const employees = await this.prisma.employee.findMany({
            include: {
                groups: {
                    include: { students: { where: { isActive: true } } },
                },
            },
        });

        // For each employee, calculate shouldPay and paid for the month
        const perStudent: any[] = [];
        const fixed: any[] = [];
        let total = 0;

        for (const emp of employees) {
            // Calculate should pay salary
            let shouldPay = 0;
            let salaryPerStudent: number | null = null;
            
            if (emp.salaryType === 'PER_STUDENT') {
                // Calculate based on attendance records for the target month
                const studentIds = emp.groups.flatMap(group => 
                    group.students.map(student => student.id)
                );

                if (studentIds.length > 0) {
                    const uniqueStudentsWithAttendance = await this.prisma.attendance.groupBy({
                        by: ['studentId'],
                        where: {
                            studentId: { in: studentIds },
                            date: {
                                gte: startOfMonth,
                                lte: endOfMonth,
                            },
                        },
                    });

                    shouldPay = Number(emp.salary) * uniqueStudentsWithAttendance.length;
                }
                salaryPerStudent = Number(emp.salary);
            } else if (emp.salaryType === 'FIXED') {
                shouldPay = Number(emp.salary);
            }

            // Update the shouldPaySalary field in database
            await this.prisma.employee.update({
                where: { id: emp.id },
                data: { shouldPaySalary: shouldPay },
            });

            // Calculate paid this month
            const paidSalaries = await this.prisma.paidSalary.findMany({
                where: {
                    teacherId: emp.id,
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });
            const paid = paidSalaries.reduce((sum, ps) => sum + Number(ps.payed_amount), 0);

            total += shouldPay;

            const empData = {
                id: emp.id,
                firstName: emp.firstName,
                lastName: emp.lastName,
                salaryPerStudent,
                monthlySalary: shouldPay,
                paid,
                shouldPay,
            };

            if (emp.salaryType === 'PER_STUDENT') {
                perStudent.push(empData);
            } else if (emp.salaryType === 'FIXED') {
                fixed.push(empData);
            }
        }

        return {
            data: {
                perStudent,
                fixed,
                total,
            },
        };
    }

    async getTeacherHomeScreen(employeeId: number) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                role: true,
                groups: { include: { students: { where: { isActive: true } } } },
            },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const today = new Date();
        const dayNumber = today.getDate();
        const todayType: GroupDayType = dayNumber % 2 === 0 ? 'EVEN' : 'ODD';

        const lessonsToday = employee.groups
            .filter((group) => group.dayType === todayType)
            .map((group) => {
                return {
                    id: group.id,
                    groupName: group.title,
                    time: group.time,
                    studentsCount: group.students.length,
                };
            })
            .sort((a, b) => {
                const getStartMinutes = (timeStr: string) => {
                    const startTime = timeStr.split(' - ')[0];
                    const [hours, minutes] = startTime.split(':').map(Number);
                    return hours * 60 + minutes;
                };
                if (a.time && b.time) {
                    return getStartMinutes(a.time) - getStartMinutes(b.time);
                }
                return 0;
            });

        return {
            data: {
                firstName: employee.firstName,
                lastName: employee.lastName,
                groupsCount: employee.groups.length,
                studentsCount: employee.groups.reduce((total, group) => total + group.students.length, 0),
                role: employee.role.name,
                lessonsToday: lessonsToday,
            },
        };
    }
}
