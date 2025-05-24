import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, GroupModule],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
