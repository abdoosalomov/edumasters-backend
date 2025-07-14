import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';
import { StudentModule } from './student/student.module';
import { ParentModule } from './parent/parent.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TestModule } from './test/test.module';
import { TestResultModule } from './test-result/test-result.module';
import { StudentPaymentModule } from './student-payment/student-payment.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { FileModule } from './file/file.module';
import { PaidSalaryModule } from './paid-salary/paid-salary.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'), // 🔥 this always works
            serveRoot: '/uploads',
        }),
        PrismaModule,
        AuthModule,
        GroupModule,
        StudentModule,
        ParentModule,
        AttendanceModule,
        TestModule,
        TestResultModule,
        StudentPaymentModule,
        FileModule,
        PaidSalaryModule,
        EmployeeModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
