import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmployeeRoleService } from './employee-role.service';
import { EmployeeRoleController } from './employee-role.controller';

@Module({
    imports: [PrismaModule],
    controllers: [EmployeeRoleController],
    providers: [EmployeeRoleService],
    exports: [EmployeeRoleService],
})
export class EmployeeRoleModule {}
