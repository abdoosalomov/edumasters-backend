import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { FilterConfigDto } from './dto/filter-config.dto';

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateConfigDto) {
    // Check if config with same key and userId already exists
    const exists = await this.prisma.config.findFirst({
      where: {
        key: dto.key,
        userId: dto.userId ?? 0,
      },
    });

    if (exists) {
      throw new BadRequestException(`Config with key '${dto.key}' already exists for this user`);
    }

    const config = await this.prisma.config.create({
      data: {
        key: dto.key,
        value: dto.value,
        userId: dto.userId ?? 0,
      },
    });

    return { data: config };
  }

  async findAll(filter: FilterConfigDto) {
    const { page, limit, key, userId } = filter;

    const where: any = {};
    if (key) {
      where.key = { contains: key, mode: 'insensitive' };
    }
    if (userId !== undefined) {
      where.userId = userId;
    }

    const total = await this.prisma.config.count({ where });

    const configs = await this.prisma.config.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: configs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const config = await this.prisma.config.findUnique({
      where: { id },
    });

    if (!config) {
      throw new BadRequestException(`Config with ID ${id} not found`);
    }

    return { data: config };
  }

  async findByKey(key: string, userId: number = 0) {
    const config = await this.prisma.config.findFirst({
      where: { key, userId },
    });

    return { data: config };
  }

  async update(id: number, dto: UpdateConfigDto) {
    const exists = await this.prisma.config.findUnique({ where: { id } });
    if (!exists) {
      throw new BadRequestException(`Config with ID ${id} not found`);
    }

    // If key is being updated, check for conflicts
    if (dto.key && dto.key !== exists.key) {
      const keyExists = await this.prisma.config.findFirst({
        where: {
          key: dto.key,
          userId: dto.userId ?? exists.userId,
          id: { not: id },
        },
      });

      if (keyExists) {
        throw new BadRequestException(`Config with key '${dto.key}' already exists for this user`);
      }
    }

    const updated = await this.prisma.config.update({
      where: { id },
      data: dto,
    });

    return { data: updated };
  }

  async remove(id: number) {
    const exists = await this.prisma.config.findUnique({ where: { id } });
    if (!exists) {
      throw new BadRequestException(`Config with ID ${id} not found`);
    }

    await this.prisma.config.delete({ where: { id } });

    return { message: 'Config deleted successfully' };
  }
} 