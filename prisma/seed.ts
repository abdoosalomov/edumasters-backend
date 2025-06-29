import {
    PrismaClient,
    AttendanceStatus,
    PerformanceStatus,
    GroupDayType,
    PaymentType,
    SalaryType,
    TeacherRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Clear tables (optional, for idempotency)
    await prisma.testResult.deleteMany();
    await prisma.test.deleteMany();
    await prisma.studentPayment.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.parent.deleteMany();
    await prisma.student.deleteMany();
    await prisma.group.deleteMany();
    await prisma.paidSalary.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.admin.deleteMany();

    // Admin
    const admin = await prisma.admin.create({
        data: {
            name: 'Admin',
            username: 'admin',
            password: '123456', // in production: hash this
            isActive: true,
            superadmin: true,
        },
    });

    // Teachers
    const teacher1 = await prisma.teacher.create({
        data: {
            username: 'teacher1',
            password: 'pass1',
            firstName: 'Alice',
            lastName: 'Johnson',
            phoneNumber: '+998901112233',
            salary: 1500.0,
            salaryType: SalaryType.FIXED,
            role: TeacherRole.TEACHER,
            isActive: true,
        },
    });

    const teacher2 = await prisma.teacher.create({
        data: {
            username: 'teacher2',
            password: 'pass2',
            firstName: 'Bob',
            lastName: 'Smith',
            phoneNumber: '+998907778899',
            salary: 2000.0,
            salaryType: SalaryType.PER_STUDENT,
            role: TeacherRole.DIRECTOR,
            isActive: true,
        },
    });

    // Groups
    const group1 = await prisma.group.create({
        data: {
            title: 'Math A',
            dayType: GroupDayType.ODD,
            subject: 'Math',
            teacherId: teacher1.id,
            price: 250.0,
        },
    });

    const group2 = await prisma.group.create({
        data: {
            title: 'Physics B',
            dayType: GroupDayType.EVEN,
            subject: 'Physics',
            teacherId: teacher2.id,
            price: 300.0,
        },
    });

    // Students + Parents
    const student1 = await prisma.student.create({
        data: {
            groupId: group1.id,
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '+998900000001',
            cameDate: new Date('2024-01-01'),
            balance: 100,
        },
    });

    const student2 = await prisma.student.create({
        data: {
            groupId: group2.id,
            firstName: 'Jane',
            lastName: 'Smith',
            phoneNumber: '+998900000002',
            cameDate: new Date('2024-02-01'),
            balance: -50,
        },
    });

    await prisma.parent.createMany({
        data: [
            {
                studentId: student1.id,
                telegramId: 'tg_001',
            },
            {
                studentId: student2.id,
                telegramId: 'tg_002',
            },
        ],
    });

    // Attendances
    await prisma.attendance.createMany({
        data: [
            {
                studentId: student1.id,
                groupId: group1.id,
                status: AttendanceStatus.PRESENT,
                performance: PerformanceStatus.GOOD,
                date: new Date(),
            },
            {
                studentId: student2.id,
                groupId: group2.id,
                status: AttendanceStatus.ABSENT,
                performance: PerformanceStatus.BAD,
                date: new Date(),
            },
        ],
    });

    // Payments
    await prisma.studentPayment.create({
        data: {
            studentId: student1.id,
            paymentType: PaymentType.CASH,
            amount: 250.0,
            discountAmount: 0,
        },
    });

    // Paid Salaries
    await prisma.paidSalary.create({
        data: {
            teacherId: teacher1.id,
            payed_amount: 1500,
        },
    });

    // Tests
    const test1 = await prisma.test.create({
        data: {
            groupId: group1.id,
            title: 'Algebra Test',
            totalQuestions: 10,
        },
    });

    const test2 = await prisma.test.create({
        data: {
            groupId: group2.id,
            title: 'Mechanics Quiz',
            totalQuestions: 15,
        },
    });

    // Test Results
    await prisma.testResult.createMany({
        data: [
            {
                studentId: student1.id,
                testId: test1.id,
                correctAnswers: 8,
            },
            {
                studentId: student2.id,
                testId: test2.id,
                correctAnswers: 12,
            },
        ],
    });

    console.log('🌱 Seed completed without faker.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
