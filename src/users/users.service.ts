import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateUserData = {
  email: string;
  name: string;
  password: string;
  avatarInitial?: string;
  school?: string;
  grade?: string;
  targetExam?: string;
  state?: string;
  district?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, name: true,
        avatarInitial: true, avatarTone: true,
        school: true, grade: true, targetExam: true,
        state: true, district: true, role: true,
        totalXp: true, totalAttempts: true, totalCorrect: true,
        currentStreak: true, longestStreak: true,
        userExams: {
          where: { isPrimary: true },
          select: {
            exam: {
              select: {
                id: true, code: true, label: true, tier: true,
                category: { select: { id: true, code: true, label: true, colorHex: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return null;

    // Derive a clean primaryExam object so the frontend doesn't have to
    // peek into the userExams array or fall back on the legacy
    // user.targetExam string (which can drift out of sync).
    const primaryExam = user.userExams[0]?.exam ?? null;
    const { userExams: _ux, ...rest } = user;
    return { ...rest, primaryExam };
  }

  updateProfile(id: string, data: { name?: string; school?: string | null; grade?: string | null }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.school !== undefined ? { school: data.school } : {}),
        ...(data.grade !== undefined ? { grade: data.grade } : {}),
      },
      select: {
        id: true, email: true, name: true,
        avatarInitial: true, avatarTone: true,
        school: true, grade: true, targetExam: true,
        state: true, district: true, role: true,
        totalXp: true, totalAttempts: true, totalCorrect: true,
        currentStreak: true, longestStreak: true,
      },
    });
  }

  async getActivity(id: string, days: number) {
    const safeDays = Math.min(Math.max(days, 7), 730);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (safeDays - 1));
    since.setUTCHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<{ day: Date; cnt: bigint }[]>`
      SELECT DATE("attemptedAt") AS day, COUNT(*)::bigint AS cnt
      FROM "Attempt"
      WHERE "userId" = ${id}::uuid
        AND "attemptedAt" >= ${since}
      GROUP BY day
      ORDER BY day ASC
    `;

    return rows.map((r) => {
      const count = Number(r.cnt);
      let level = 0;
      if (count >= 25) level = 4;
      else if (count >= 10) level = 3;
      else if (count >= 4) level = 2;
      else if (count >= 1) level = 1;
      return {
        date: r.day.toISOString().slice(0, 10), // YYYY-MM-DD
        count,
        level,
      };
    });
  }

  async getStats(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { totalAttempts: true, totalCorrect: true, currentStreak: true, longestStreak: true },
    });
    if (!user) return { solved: 0, accuracy: 0, streak: 0, longestStreak: 0 };
    return {
      solved: user.totalAttempts,
      accuracy: user.totalAttempts > 0 ? Math.round((user.totalCorrect / user.totalAttempts) * 100) : 0,
      streak: user.currentStreak,
      longestStreak: user.longestStreak,
    };
  }

  create(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }


  updateLastActive(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  // Session management
  findSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId },
    });
  }

  createSession(data: {
    userId: string;
    hashedRefreshToken: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt?: Date;
  }) {
    return this.prisma.userSession.create({ data });
  }

  updateSession(id: string, data: {
    hashedRefreshToken: string;
    lastUsedAt: Date;
    expiresAt?: Date;
  }) {
    return this.prisma.userSession.update({
      where: { id },
      data,
    });
  }

  deleteSession(id: string) {
    return this.prisma.userSession.delete({
      where: { id },
    });
  }

  async getProgress(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        deletedAt:     true,
        totalCorrect:  true,
        totalAttempts: true,
        currentStreak: true,
        totalXp:       true,
        userExams:     { where: { isPrimary: true }, select: { examId: true } },
      },
    });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    const examId = user.userExams[0]?.examId ?? null;
    const examFilter = examId
      ? { userExams: { some: { examId, isPrimary: true } } }
      : {};

    // Rank = (users in scope with higher XP) + 1
    const ahead = await this.prisma.user.count({
      where: { deletedAt: null, totalXp: { gt: user.totalXp }, ...examFilter },
    });

    return {
      solved:   user.totalAttempts,
      accuracy: user.totalAttempts > 0
        ? `${Math.round((user.totalCorrect / user.totalAttempts) * 100)}%`
        : '0%',
      streak: user.currentStreak,
      rank:   ahead + 1,
    };
  }

  /** Per-subject mastery for a user, rolled up from UserTopicStat (one row per user-topic). */
  async getMastery(userId: string) {
    const rows = await this.prisma.$queryRaw<{
      id: string;
      label: string;
      colorHex: string;
      attempted: number;
      correct: number;
    }[]>`
      SELECT
        s.id, s.label, s."colorHex",
        SUM(uts.attempted)::int AS attempted,
        SUM(uts.correct)::int   AS correct
      FROM "UserTopicStat" uts
      JOIN "Topic"   t ON t.id = uts."topicId"
      JOIN "Subject" s ON s.id = t."subjectId"
      WHERE uts."userId" = ${userId}::uuid
      GROUP BY s.id, s.label, s."colorHex"
      ORDER BY attempted DESC
    `;

    return rows.map((r) => ({
      subjectId: r.id,
      label:     r.label,
      colorHex:  r.colorHex,
      attempted: r.attempted,
      correct:   r.correct,
      pct:       r.attempted > 0 ? Math.round((r.correct / r.attempted) * 100) : 0,
    }));
  }

  /** Top users ranked by totalXp, scoped to the requester's primary exam by default. */
  async getLeaderboard(userId: string, scope: 'exam' | 'global' = 'exam', limit = 10) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletedAt: true,
        userExams: { where: { isPrimary: true }, select: { examId: true } },
      },
    });
    if (!me || me.deletedAt) throw new NotFoundException('User not found');

    const examId = scope === 'exam' ? me.userExams[0]?.examId ?? null : null;
    const where = {
      deletedAt: null,
      ...(examId ? { userExams: { some: { examId, isPrimary: true } } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { totalXp: 'desc' },
        take: Math.min(Math.max(limit, 1), 100),
        select: { id: true, name: true, avatarInitial: true, totalXp: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      scope:  examId ? 'exam' : 'global',
      total,
      top: rows.map((u, i) => ({
        rank:          i + 1,
        userId:        u.id,
        name:          u.name,
        avatarInitial: u.avatarInitial,
        xp:            u.totalXp,
        isMe:          u.id === userId,
      })),
    };
  }
}
