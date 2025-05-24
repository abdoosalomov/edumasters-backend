import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateTeacherDto, LoginDto } from './dto/teacher.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CreateAdminDto } from './dto/admin.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
    ) {}

    async addTeacher(dto: CreateTeacherDto) {
        const existing = await this.checkUsername(dto.username, 'teacher');
        if (existing) {
            throw new BadRequestException('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const teacher = await this.prisma.teacher.create({
            data: {
                ...dto,
                password: hashedPassword,
            },
        });

        return { message: 'Registered successfully', data: teacher };
    }

    async changeTeacherStatus(isActive: boolean, teacherId: number) {
        await this.prisma.teacher.update({
            where: {
                id: teacherId,
            },
            data: {
                isActive,
            },
        });
    }

    async loginTeacher(dto: LoginDto) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { username: dto.username },
        });

        if (!teacher || !(await bcrypt.compare(dto.password, teacher.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.jwt.sign({ sub: teacher.id, role: teacher.role });

        return {
            accessToken: token,
            teacher: {
                id: teacher.id,
                username: teacher.username,
                role: teacher.role,
            },
        };
    }

    async registerAdmin(dto: CreateAdminDto) {
        const existing = await this.checkUsername(dto.username, 'admin');

        if (existing) {
            throw new BadRequestException('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const admin = await this.prisma.admin.create({
            data: {
                name: dto.name,
                username: dto.username,
                password: hashedPassword,
            },
        });

        return { message: 'Admin registered successfully', data: admin };
    }

    async loginAdmin(dto: LoginDto) {
        const admin = await this.prisma.admin.findUnique({
            where: { username: dto.username },
        });

        if (!admin || !(await bcrypt.compare(dto.password, admin.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.jwt.sign({ sub: admin.id, role: 'admin', superadmin: admin.superadmin });

        return {
            accessToken: token,
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                superadmin: admin.superadmin,
            },
        };
    }

    async checkUsername(username: string, model: 'teacher' | 'admin') {
        switch (model) {
            case 'teacher':
                return !!(await this.prisma.teacher.findUnique({ where: { username: username } }));
            case 'admin':
                return !!(await this.prisma.admin.findUnique({ where: { username: username } }));
            default:
                throw new UnauthorizedException('Invalid username or password');
        }
    }
}
