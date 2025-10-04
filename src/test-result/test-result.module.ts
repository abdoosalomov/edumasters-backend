import { Module } from '@nestjs/common';
import { TestResultService } from './test-result.service';
import { TestResultController } from './test-result.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [NotificationModule],
    providers: [TestResultService],
    controllers: [TestResultController],
})
export class TestResultModule {}
