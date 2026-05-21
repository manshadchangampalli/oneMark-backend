import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ListParams {
  search?:    string;
  suspended?: boolean;
  limit:      number;
  cursor?:    string;
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(p: ListParams) {
    const take = Math.min(Math.max(p.limit, 1), 100);

    const where: Record<string, unknown> = {};
    if (p.suspended !== undefined) where.isSuspended = p.suspended;
    if (p.search?.trim()) {
      const s = p.search.trim();
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { name:  { contains: s, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.user.findMany({
      where,
      take: take + 1,
      ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id:            true,
        email:         true,
        name:          true,
        targetExam:    true,
        totalXp:       true,
        totalAttempts: true,
        totalCorrect:  true,
        isSuspended:   true,
        createdAt:     true,
        lastActiveAt:  true,
      },
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;

    return {
      data: data.map(u => ({
        ...u,
        accuracy: u.totalAttempts > 0
          ? Math.round((u.totalCorrect / u.totalAttempts) * 10000) / 100
          : null,
      })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  async detail(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id:              true,
        email:           true,
        name:            true,
        avatarInitial:   true,
        school:          true,
        grade:           true,
        targetExam:      true,
        state:           true,
        district:        true,
        totalXp:         true,
        totalAttempts:   true,
        totalCorrect:    true,
        lastActiveAt:    true,
        emailVerifiedAt: true,
        isSuspended:     true,
        role:            true,
        createdAt:       true,
        userExams: { select: { exam: { select: { id: true, code: true, label: true } }, isPrimary: true } },
      },
    });

    if (!u) throw new NotFoundException('User not found');

    return {
      ...u,
      accuracy: u.totalAttempts > 0
        ? Math.round((u.totalCorrect / u.totalAttempts) * 10000) / 100
        : null,
      exams: u.userExams.map(ue => ({ ...ue.exam, isPrimary: ue.isPrimary })),
      userExams: undefined,
    };
  }
}
