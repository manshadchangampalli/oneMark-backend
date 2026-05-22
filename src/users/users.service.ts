import { Injectable } from '@nestjs/common';
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

  findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
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

  async getStats(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { totalAttempts: true, totalCorrect: true, currentStreak: true, longestStreak: true },
    });
    if (!user) return { solved: 0, accuracy: 0, streak: 0, longestStreak: 0 };
    return {
      solved:        user.totalAttempts,
      accuracy:      user.totalAttempts > 0 ? Math.round((user.totalCorrect / user.totalAttempts) * 100) : 0,
      streak:        user.currentStreak,
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
}
