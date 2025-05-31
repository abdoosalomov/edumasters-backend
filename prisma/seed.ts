// prisma/seed.ts
import {
    AttendanceStatus,
    GroupDayType,
    PaymentType,
    PerformanceStatus,
    PrismaClient,
    SalaryType,
    TeacherRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Seed Admins
    await prisma.admin.createMany({
        data: [
            { name: 'Admin One', username: 'admin1', password: 'securepass1', isActive: true, superadmin: true },
            { name: 'Admin Two', username: 'admin2', password: 'securepass2', isActive: true, superadmin: false },
        ],
    });

    // Seed Teachers
    const teacher1 = await prisma.teacher.create({
        data: {
            username: 'teach1',
            password: 'pass1',
            firstName: 'Alice',
            lastName: 'Smith',
            phoneNumber: '+998901234567',
            salary: 1200000,
            salaryType: SalaryType.FIXED,
            role: TeacherRole.TEACHER,
            isActive: true,
        },
    });

    // Seed Groups
    const group1 = await prisma.group.create({
        data: {
            title: 'Math Group A',
            dayType: GroupDayType.ODD,
            subject: 'Mathematics',
            teacherId: teacher1.id,
            isActive: true,
            price: 250000,
        },
    });

    // Seed Students
    const student1 = await prisma.student.create({
        data: {
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '+998901112233',
            cameDate: new Date('2024-01-15'),
            balance: -50000,
            isActive: true,
            groupId: group1.id,
        },
    });

    const student2 = await prisma.student.create({
        data: {
            firstName: 'Jane',
            lastName: 'Roe',
            phoneNumber: '+998907654321',
            cameDate: new Date('2024-02-10'),
            balance: 150000,
            isActive: true,
            groupId: group1.id,
        },
    });

    // Seed Parents
    await prisma.parent.create({
        data: {
            studentId: student1.id,
            telegramId: '123456789',
        },
    });

    // Seed Attendances
    await prisma.attendance.createMany({
        data: [
            {
                studentId: student1.id,
                groupId: group1.id,
                status: AttendanceStatus.PRESENT,
                performance: PerformanceStatus.GOOD,
            },
            {
                studentId: student2.id,
                groupId: group1.id,
                status: AttendanceStatus.ABSENT,
                performance: PerformanceStatus.BAD,
            },
        ],
    });

    // Seed Test
    const test1 = await prisma.test.create({
        data: {
            title: 'Midterm Exam',
            groupId: group1.id,
            totalQuestions: 20,
        },
    });

    // Seed Test Results
    await prisma.testResult.createMany({
        data: [
            {
                studentId: student1.id,
                testId: test1.id,
                correctAnswers: 18,
            },
            {
                studentId: student2.id,
                testId: test1.id,
                correctAnswers: 15,
            },
        ],
    });

    // Seed Student Payments
    await prisma.studentPayment.create({
        data: {
            studentId: student2.id,
            paymentType: PaymentType.CARD,
            amount: 250000,
            discountAmount: 0,
            paymentPhoto: null,
        },
    });

    // Seed Paid Salary
    await prisma.paidSalary.create({
        data: {
            teacherId: teacher1.id,
            payed_amount: 1200000,
        },
    });

    console.log('Database seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
