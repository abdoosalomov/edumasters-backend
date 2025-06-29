import { Module } from '@nestjs/common';
import { TestResultService } from './test-result.service';
import { TestResultController } from './test-result.controller';

@Module({
    providers: [TestResultService],
    controllers: [TestResultController],
})
export class TestResultModule {}
