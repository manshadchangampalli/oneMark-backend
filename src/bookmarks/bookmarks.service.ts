import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Fast: just the ids — for the client-side Set */
  async listIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { questionId: true },
    });
    return rows.map(r => r.questionId);
  }

  /** Full rows for the bookmarks screen — paginated, includes question preview */
  async list(userId: string, limit: number, cursor?: string) {
    const take = Math.min(Math.max(limit, 1), 50);

    const rows = await this.prisma.bookmark.findMany({
      where: { userId },
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      ...(cursor
        ? { cursor: { userId_questionId: { userId, questionId: cursor } }, skip: 1 }
        : {}),
      select: {
        questionId: true,
        createdAt:  true,
        question: {
          select: {
            id:         true,
            difficulty: true,
            xpReward:   true,
            subject:    { select: { id: true, label: true, colorHex: true } },
            topic:      { select: { id: true, label: true } },
            currentRevision: { select: { prompt: true } },
          },
        },
      },
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;

    return {
      data: data.map((b) => ({
        questionId: b.questionId,
        createdAt:  b.createdAt,
        prompt:     b.question.currentRevision?.prompt ?? '(no prompt)',
        difficulty: b.question.difficulty,
        xpReward:   b.question.xpReward,
        subject:    b.question.subject,
        topic:      b.question.topic,
      })),
      nextCursor: hasMore ? data[data.length - 1].questionId : null,
    };
  }

  /** Idempotent add — composite PK + upsert means safe to call repeatedly. */
  async add(userId: string, questionId: string) {
    // Verify the question exists; cleaner error than FK violation
    const q = await this.prisma.question.findUnique({ where: { id: questionId }, select: { id: true } });
    if (!q) throw new NotFoundException('Question not found');

    await this.prisma.bookmark.upsert({
      where:  { userId_questionId: { userId, questionId } },
      create: { userId, questionId },
      update: {}, // no-op — already bookmarked
    });
    return { questionId, bookmarked: true };
  }

  /** Idempotent remove */
  async remove(userId: string, questionId: string) {
    await this.prisma.bookmark.deleteMany({ where: { userId, questionId } });
    return { questionId, bookmarked: false };
  }
}
