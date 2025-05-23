import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super();
        // super({
        //   log: [
        //     { level: 'query', emit: 'event' },
        //     { level: 'info', emit: 'event' },
        //     { level: 'warn', emit: 'event' },
        //     { level: 'error', emit: 'event' },
        //   ],
        // });
        //
        // this.$on('query', (e) => {
        //   this.logger.debug(`Query: ${e.query}`);
        //   this.logger.debug(`Params: ${e.params}`);
        //   this.logger.debug(`Duration: ${e.duration}ms`);
        // });
        //
        // this.$on('info', (e) => {
        //   this.logger.log(e.message);
        // });
        //
        // this.$on('warn', (e) => {
        //   this.logger.warn(e.message);
        // });
        //
        // this.$on('error', (e) => {
        //   this.logger.error(e.message);
        // });
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
        this.logger.log('Prisma connected');
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
        this.logger.log('Prisma disconnected');
    }
}
