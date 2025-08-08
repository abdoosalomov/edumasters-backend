import { Module } from '@nestjs/common';
import { ChequeService } from './cheque.service';
import { ChequeController } from './cheque.controller';
import { AppConfigModule } from '../config/config.module';

@Module({
  imports: [AppConfigModule],
  controllers: [ChequeController],
  providers: [ChequeService],
  exports: [ChequeService],
})
export class ChequeModule {}
