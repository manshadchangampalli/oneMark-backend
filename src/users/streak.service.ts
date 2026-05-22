import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bumps the user's streak based on an activity occurring at `when`.
   *  Same UTC day: no-op. Next UTC day: ++ . Larger gap: reset to 1. */
  async bump(userId: string, when: Date) {
    const today = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()));
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, lastStreakDate: true },
    });
    if (!user) return;

    const last = user.lastStreakDate
      ? new Date(Date.UTC(
          user.lastStreakDate.getUTCFullYear(),
          user.lastStreakDate.getUTCMonth(),
          user.lastStreakDate.getUTCDate(),
        ))
      : null;

    let nextStreak: number;
    if (!last) {
      nextStreak = 1;
    } else {
      const diffDays = Math.round((today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 0)      return;
      else if (diffDays === 1) nextStreak = user.currentStreak + 1;
      else                     nextStreak = 1;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak:  nextStreak,
        longestStreak:  Math.max(user.longestStreak, nextStreak),
        lastStreakDate: today,
      },
    });
  }
}
