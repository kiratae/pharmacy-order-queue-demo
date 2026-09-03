import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.unit.findMany({ orderBy: { id: 'asc' } });
  }
}
