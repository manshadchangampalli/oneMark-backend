import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { StreakService } from '../users/streak.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly examsService: ExamsService,
    private readonly streakService: StreakService,
  ) {}

  async createSession(userId: string, dto: CreateSessionDto) {
    const { sessionExamId, poolExamIds } = await this.resolveExamPool(userId, dto.examId);

    const needed = dto.questionCount ?? 10;
    let selectedIds: string[];

    if (dto.mode === 'bookmark') {
      // Bookmark practice — pull from the user's own bookmarked questions.
      // Ignore subject/topic/difficulty filters (bookmarks are already user-curated).
      const bookmarked = await this.prisma.bookmark.findMany({
        where: { userId, question: { status: 'published' } },
        orderBy: { createdAt: 'desc' },
        select: { questionId: true },
      });
      if (bookmarked.length === 0) {
        throw new UnprocessableEntityException('You have no bookmarks to practice');
      }
      selectedIds = shuffle(bookmarked.map((b) => b.questionId)).slice(
        0,
        Math.min(needed, bookmarked.length),
      );
    } else {
      const baseWhere: Record<string, unknown> = {
        status: 'published',
        questionExams: { some: { examId: { in: poolExamIds } } },
      };
      if (dto.subjectId) baseWhere.subjectId = dto.subjectId;
      if (dto.topicId) baseWhere.topicId = dto.topicId;
      if (dto.difficulty && dto.difficulty !== 'mixed') baseWhere.difficulty = dto.difficulty;

      // Prefer questions the user hasn't attempted yet
      const attemptedIds = await this.prisma.attempt.findMany({
        where: { userId, question: { questionExams: { some: { examId: { in: poolExamIds } } } } },
        select: { questionId: true },
        distinct: ['questionId'],
      });
      const excludeIds = attemptedIds.map((a) => a.questionId);

      const freshPool = await this.prisma.question.findMany({
        where: { ...baseWhere, ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}) },
        select: { id: true },
      });

      // Fall back to full pool if not enough fresh questions
      const pool = freshPool.length >= needed
        ? freshPool
        : await this.prisma.question.findMany({ where: baseWhere, select: { id: true } });

      if (pool.length === 0) {
        throw new UnprocessableEntityException('No questions available for this filter');
      }

      selectedIds = shuffle(pool.map((q) => q.id)).slice(
        0,
        Math.min(needed, pool.length),
      );
    }

    const count = selectedIds.length;

    const session = await this.prisma.$transaction(async (tx) => {
      const sess = await tx.practiceSession.create({
        data: {
          userId,
          examId: sessionExamId,
          mode: dto.mode,
          subjectId: dto.subjectId ?? null,
          topicId: dto.topicId ?? null,
          difficulty: (dto.difficulty as any) ?? 'mixed',
          questionCount: count,
          timeLimitSec: dto.timeLimitSec ?? null,
          total: count,
        },
      });

      await tx.sessionQuestion.createMany({
        data: selectedIds.map((id, i) => ({
          sessionId: sess.id,
          questionId: id,
          sortOrder: i + 1,
        })),
      });

      return sess;
    });

    const questions = await this.prisma.question.findMany({
      where: { id: { in: selectedIds } },
      include: {
        currentRevision: { select: { id: true, prompt: true } },
        options: {
          select: { id: true, label: true, text: true, sub: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const byId = new Map(questions.map((q) => [q.id, q]));
    const orderedQuestions = selectedIds.map((id) => {
      const q = byId.get(id)!;
      return {
        id: q.id,
        difficulty: q.difficulty,
        type: q.type,
        xpReward: q.xpReward,
        revision: q.currentRevision
          ? { id: q.currentRevision.id, prompt: q.currentRevision.prompt }
          : null,
        options: q.options,
      };
    });

    return {
      session: {
        id: session.id,
        mode: session.mode,
        examId: session.examId,
        questionCount: session.questionCount,
        timeLimitSec: session.timeLimitSec,
        startedAt: session.startedAt,
      },
      questions: orderedQuestions,
    };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        sessionQuestions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            question: {
              include: {
                currentRevision: {
                  select: {
                    id: true,
                    prompt: true,
                    correctOptionLabel: true,
                    officialExplanation: true,
                  },
                },
                options: {
                  select: { id: true, label: true, text: true, sub: true, sortOrder: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
        attempts: {
          select: { questionId: true, isCorrect: true, selectedOptionId: true, xpAwarded: true },
        },
      },
    });

    if (!session || session.userId !== userId) throw new NotFoundException('Session not found');

    const attemptMap = new Map(session.attempts.map((a) => [a.questionId, a]));

    return {
      session: {
        id: session.id,
        mode: session.mode,
        examId: session.examId,
        questionCount: session.total,
        timeLimitSec: session.timeLimitSec,
        startedAt: session.startedAt,
      },
      score: session.score,
      total: session.total,
      finishedAt: session.finishedAt,
      timeSpentSec: session.timeSpentSec,
      questions: session.sessionQuestions.map((sq) => {
        const attempt = attemptMap.get(sq.questionId);
        const rev = sq.question.currentRevision;
        return {
          sortOrder: sq.sortOrder,
          id: sq.question.id,
          difficulty: sq.question.difficulty,
          type: sq.question.type,
          xpReward: sq.question.xpReward,
          // Only reveal correct answer + explanation for attempted questions
          revision: rev
            ? {
                id: rev.id,
                prompt: rev.prompt,
                ...(attempt
                  ? {
                      correctOptionLabel: rev.correctOptionLabel,
                      officialExplanation: rev.officialExplanation,
                    }
                  : {}),
              }
            : null,
          options: sq.question.options,
          myStatus: attempt ? (attempt.isCorrect ? 'correct' : 'incorrect') : 'unattempted',
          mySelectedOptionId: attempt?.selectedOptionId ?? null,
          myXpAwarded: attempt?.xpAwarded ?? null,
        };
      }),
    };
  }

  async submitAttempt(userId: string, sessionId: string, dto: SubmitAttemptDto) {
    const { questionId, selectedOptionId, timeSeconds } = dto;

    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, finishedAt: true, score: true },
    });

    if (!session || session.userId !== userId) throw new NotFoundException('Session not found');
    if (session.finishedAt) throw new ConflictException('Session is already finished');

    // Verify question belongs to session (uses the unique index)
    const sq = await this.prisma.sessionQuestion.findUnique({
      where: { sessionId_questionId: { sessionId, questionId } },
    });
    if (!sq) throw new NotFoundException('Question not in session');

    // Idempotent: return existing attempt
    const existing = await this.prisma.attempt.findFirst({
      where: { sessionId, userId, questionId },
    });
    if (existing) {
      return {
        attempt: { id: existing.id, isCorrect: existing.isCorrect, xpAwarded: existing.xpAwarded },
        isCorrect: existing.isCorrect,
        runningScore: session.score,
      };
    }

    // Load question + revision to verify correctness
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        currentRevision: { select: { id: true, correctOptionLabel: true, officialExplanation: true, xpReward: true } },
        options: { select: { id: true, label: true } },
      },
    });
    if (!question?.currentRevision) throw new NotFoundException('Question has no revision');

    let isCorrect = false;
    if (selectedOptionId) {
      const opt = question.options.find((o) => o.id === selectedOptionId);
      if (!opt) throw new NotFoundException('Option not found for this question');
      isCorrect = opt.label === question.currentRevision.correctOptionLabel;
    }

    const xpAwarded = isCorrect ? question.currentRevision.xpReward : 0;

    const { attempt, runningScore } = await this.prisma.$transaction(async (tx) => {
      const a = await tx.attempt.create({
        data: {
          userId,
          questionId,
          questionRevisionId: question.currentRevision!.id,
          sessionId,
          selectedOptionId: selectedOptionId ?? null,
          isCorrect,
          timeSeconds,
          xpAwarded,
        },
      });

      const updated = await tx.practiceSession.update({
        where: { id: sessionId },
        data: { score: { increment: isCorrect ? 1 : 0 } },
        select: { score: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          totalAttempts: { increment: 1 },
          totalCorrect:  { increment: isCorrect ? 1 : 0 },
          totalXp:       { increment: xpAwarded },
        },
      });

      await tx.userTopicStat.upsert({
        where: { userId_topicId: { userId, topicId: question.topicId } },
        create: { userId, topicId: question.topicId, attempted: 1, correct: isCorrect ? 1 : 0 },
        update: {
          attempted:       { increment: 1 },
          correct:         { increment: isCorrect ? 1 : 0 },
          lastAttemptedAt: new Date(),
        },
      });

      return { attempt: a, runningScore: updated.score };
    });

    return {
      attempt: { id: attempt.id, isCorrect, xpAwarded },
      isCorrect,
      correctOptionLabel: question.currentRevision.correctOptionLabel,
      officialExplanation: question.currentRevision.officialExplanation,
      runningScore,
    };
  }

  async finishSession(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        attempts: {
          select: {
            isCorrect: true,
            xpAwarded: true,
            question: {
              select: {
                topicId: true,
                topic: { select: { label: true } },
              },
            },
          },
        },
      },
    });

    if (!session || session.userId !== userId) throw new NotFoundException('Session not found');

    if (!session.finishedAt) {
      const now = new Date();
      const timeSpentSec = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

      await this.prisma.practiceSession.update({
        where: { id: sessionId },
        data: { finishedAt: now, timeSpentSec },
      });

      session.finishedAt = now;
      session.timeSpentSec = timeSpentSec;

      await this.streakService.bump(userId, now);
    }

    return this.buildFinishResponse(session as typeof session & { timeSpentSec: number });
  }

  async findSessions(userId: string, limit: number, cursor?: string) {
    const take = Math.min(limit, 50);

    const rows = await this.prisma.practiceSession.findMany({
      where: { userId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        mode: true,
        difficulty: true,
        questionCount: true,
        score: true,
        total: true,
        timeSpentSec: true,
        startedAt: true,
        finishedAt: true,
        exam:    { select: { id: true, code: true, label: true } },
        subject: { select: { id: true, label: true } },
        topic:   { select: { id: true, label: true } },
      },
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;

    return {
      data: data.map((s) => ({
        ...s,
        accuracy: s.total > 0 ? Math.round((s.score / s.total) * 10000) / 100 : null,
      })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  /**
   * Decides which exam IDs to draw questions from.
   *
   * - If `explicitExamId` is provided → precise mode: just that one exam
   *   (used when the UI lets the user say "only LDC questions").
   * - Otherwise → broad mode: the user's primary exam PLUS all sibling
   *   exams in the same category+tier (e.g. a Police aspirant gets
   *   questions tagged for LDC / LGS / VEO / Fireman too, since the
   *   10th-Level syllabus is shared).
   *
   * `sessionExamId` is what we store on the PracticeSession row so each
   * session is still attributed to a single exam; `poolExamIds` is the
   * filter used to actually pick questions.
   */
  private async resolveExamPool(
    userId: string,
    explicitExamId?: string,
  ): Promise<{ sessionExamId: string; poolExamIds: string[] }> {
    // Precise mode — caller asked for a specific exam
    if (explicitExamId) {
      const enrolment = await this.prisma.userExam.findUnique({
        where: { userId_examId: { userId, examId: explicitExamId } },
      });
      if (!enrolment) {
        throw new UnprocessableEntityException({ code: 'EXAM_REQUIRED' });
      }
      return { sessionExamId: explicitExamId, poolExamIds: [explicitExamId] };
    }

    // Broad mode — primary exam + same-tier siblings
    const primary = await this.prisma.userExam.findFirst({
      where: { userId, isPrimary: true },
      include: { exam: { select: { id: true, tier: true, categoryId: true } } },
    });
    if (!primary) {
      throw new UnprocessableEntityException({ code: 'EXAM_REQUIRED' });
    }

    const { tier, categoryId } = primary.exam;
    if (!tier || !categoryId) {
      // No tier metadata → fall back to single-exam pool
      return { sessionExamId: primary.examId, poolExamIds: [primary.examId] };
    }

    const siblings = await this.prisma.exam.findMany({
      where: { categoryId, tier, archivedAt: null, isActive: true },
      select: { id: true },
    });
    const poolIds = siblings.length > 0 ? siblings.map((s) => s.id) : [primary.examId];

    return { sessionExamId: primary.examId, poolExamIds: poolIds };
  }

  private buildFinishResponse(session: {
    score: number;
    total: number;
    timeSpentSec: number;
    attempts: {
      isCorrect: boolean;
      xpAwarded: number;
      question: { topicId: string; topic: { label: string } | null };
    }[];
  }) {
    const accuracy = session.total > 0
      ? Math.round((session.score / session.total) * 10000) / 100
      : 0;

    const byTopicMap = new Map<string, { label: string; correct: number; total: number }>();
    for (const a of session.attempts) {
      const tid = a.question.topicId;
      const label = a.question.topic?.label ?? 'Unknown topic';
      const curr = byTopicMap.get(tid) ?? { label, correct: 0, total: 0 };
      byTopicMap.set(tid, {
        label,
        correct: curr.correct + (a.isCorrect ? 1 : 0),
        total: curr.total + 1,
      });
    }

    return {
      score: session.score,
      total: session.total,
      accuracy,
      timeSpentSec: session.timeSpentSec,
      // Sorted weakest-first so the UI naturally surfaces "practice these again"
      byTopic: Array.from(byTopicMap.entries())
        .map(([topicId, s]) => ({
          topicId,
          label:   s.label,
          correct: s.correct,
          total:   s.total,
          pct:     s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        }))
        .sort((a, b) => a.pct - b.pct),
      xpAwarded: session.attempts.reduce((sum, a) => sum + a.xpAwarded, 0),
    };
  }
}
