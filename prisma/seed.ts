import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Create a Teacher
  const teacher = await prisma.teacher.create({
    data: {
      username: 'john.doe1',
      password: 'securepassword123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      salary: 1000.0,
      salaryType: 'FIXED',
      role: 'TEACHER',
    },
  });

  // Create a Group
  const group = await prisma.group.create({
    data: {
      title: 'Math Group A',
      dayType: 'ODD',
      subject: 'Mathematics',
      teacherId: teacher.id,
    },
  });

  // Create a Student
  const student = await prisma.student.create({
    data: {
      firstName: 'Alice',
      lastName: 'Smith',
      phoneNumber: '+1987654321',
      cameDate: new Date(),
      balance: 150.0,
      groupId: group.id,
    },
  });

  // Create a Parent for the student
  await prisma.parent.create({
    data: {
      studentId: student.id,
      telegramId: 'alice_parent_telegram',
    },
  });

  // Create a Test
  const test = await prisma.test.create({
    data: {
      title: 'Midterm Exam',
      groupId: group.id,
      totalQuestions: 50,
    },
  });

  // Create a TestResult
  await prisma.testResult.create({
    data: {
      studentId: student.id,
      testId: test.id,
      correctAnswers: 42,
    },
  });

  // Create Attendance
  await prisma.attendance.create({
    data: {
      studentId: student.id,
      groupId: group.id,
      status: 'PRESENT',
      performance: 'GOOD',
    },
  });

  // PaidSalary for Teacher
  await prisma.paidSalary.create({
    data: {
      teacherId: teacher.id,
      payed_amount: 1000.0,
    },
  });

  // StudentPayment
  await prisma.studentPayment.create({
    data: {
      studentId: student.id,
      paymentType: 'CASH',
      amount: 150.0,
      discountAmount: 0,
    },
  });
}

main()
  .then(() => {
    console.log('🌱 Seeding completed');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
