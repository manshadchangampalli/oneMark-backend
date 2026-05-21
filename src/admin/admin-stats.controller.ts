import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const [totalQuestions, totalUsers, totalExams, totalSessions] = await Promise.all([
      this.prisma.question.count({ where: { status: { not: 'archived' } } }),
      this.prisma.user.count(),
      this.prisma.exam.count({ where: { archivedAt: null } }),
      this.prisma.practiceSession.count(),
    ]);
    return { totalQuestions, totalUsers, totalExams, totalSessions };
  }
}
