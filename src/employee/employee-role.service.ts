import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeRoleDto } from './dto/create-employee-role.dto';
import { UpdateEmployeeRoleDto } from './dto/update-employee-role.dto';
import { FilterEmployeeRoleDto } from './dto/filter-employee-role.dto';

@Injectable()
export class EmployeeRoleService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateEmployeeRoleDto) {
        const exists = await this.prisma.employeeRole.findUnique({ where: { name: dto.name } });
        if (exists) throw new BadRequestException('Role name already exists');
        const role = await this.prisma.employeeRole.create({ data: dto });
        return { data: role };
    }

    async findAll(filter: FilterEmployeeRoleDto) {
        const { page = 1, limit = 10, search, orderBy, order } = filter;
        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const total = await this.prisma.employeeRole.count({ where });
        const roles = await this.prisma.employeeRole.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                [orderBy ?? 'createdAt']: order ?? 'desc',
            },
        });
        return {
            data: roles,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const role = await this.prisma.employeeRole.findUnique({ where: { id } });
        if (!role) throw new NotFoundException('Role not found');
        return { data: role };
    }

    async update(id: number, dto: UpdateEmployeeRoleDto) {
        const role = await this.prisma.employeeRole.findUnique({ where: { id } });
        if (!role) throw new NotFoundException('Role not found');
        if (dto.name && dto.name !== role.name) {
            const exists = await this.prisma.employeeRole.findUnique({ where: { name: dto.name } });
            if (exists) throw new BadRequestException('Role name already exists');
        }
        const updated = await this.prisma.employeeRole.update({ where: { id }, data: dto });
        return { data: updated };
    }

    async remove(id: number) {
        const role = await this.prisma.employeeRole.findUnique({ where: { id } });
        if (!role) throw new NotFoundException('Role not found');
        await this.prisma.employeeRole.delete({ where: { id } });
        return { data: true };
    }
}
