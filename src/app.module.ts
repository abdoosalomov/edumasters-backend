import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';
import { StudentModule } from './student/student.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ParentModule } from './parent/parent.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        GroupModule,
        StudentModule,
        // BillingModule,
        ScheduleModule.forRoot({}),
        ParentModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
