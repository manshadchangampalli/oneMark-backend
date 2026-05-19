import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  getStates() {
    return this.prisma.state.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  getDistricts(stateId: string) {
    return this.prisma.district.findMany({
      where: { stateId },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
