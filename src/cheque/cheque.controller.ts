import { Controller, Get, Post, Query } from '@nestjs/common';
import { ChequeService } from './cheque.service';
import { FilterChequeDto } from './dto/filter-cheque.dto';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Cheques')
@Controller('cheques')
export class ChequeController {
  constructor(private readonly chequeService: ChequeService) {}

  @Post('close-daily')
  @ApiOperation({ summary: "Close today's daily cheques for EVERYONE and send reports" })
  async closeDailyCheque() {
    return this.chequeService.closeDailyCheque();
  }

  @Get()
  @ApiOperation({ summary: 'Get cheques with filters' })
  async findAll(@Query() filter: FilterChequeDto) {
    return this.chequeService.findAll(filter);
  }
}
