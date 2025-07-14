import { Injectable } from '@nestjs/common';
import { CreatePaidSalaryDto } from './dto/create-paid-salary.dto';
import { UpdatePaidSalaryDto } from './dto/update-paid-salary.dto';

@Injectable()
export class PaidSalaryService {
  create(createPaidSalaryDto: CreatePaidSalaryDto) {
    return 'This action adds a new paidSalary';
  }

  findAll() {
    return `This action returns all paidSalary`;
  }

  findOne(id: number) {
    return `This action returns a #${id} paidSalary`;
  }

  update(id: number, updatePaidSalaryDto: UpdatePaidSalaryDto) {
    return `This action updates a #${id} paidSalary`;
  }

  remove(id: number) {
    return `This action removes a #${id} paidSalary`;
  }
}
