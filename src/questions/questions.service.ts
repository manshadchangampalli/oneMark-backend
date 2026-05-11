import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly examsService: ExamsService,
  ) {}

  async findOne(userId: string, questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId, status: 'published' },
      include: {
        subject: { select: { id: true, code: true, label: true, colorHex: true } },
        topic:   { select: { id: true, code: true, label: true } },
        currentRevision: {
          select: {
            id: true,
            version: true,
            prompt: true,
            difficulty: true,
            xpReward: true,
            // correctOptionLabel deliberately excluded — revealed only after attempt
          },
        },
        options: {
          select: { id: true, label: true, text: true, sub: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!question) throw new NotFoundException('Question not found');

    const lastAttempt = await this.prisma.attempt.findFirst({
      where: { userId, questionId },
      orderBy: { attemptedAt: 'desc' },
      select: { isCorrect: true, id: true },
    });
    const myStatus: 'unattempted' | 'correct' | 'incorrect' = lastAttempt
      ? lastAttempt.isCorrect ? 'correct' : 'incorrect'
      : 'unattempted';

    return {
      id:            question.id,
      subject:       question.subject,
      topic:         question.topic,
      difficulty:    question.difficulty,
      type:          question.type,
      xpReward:      question.currentRevision?.xpReward ?? question.xpReward,
      successRate:   question.successRate,
      avgTimeSeconds:question.avgTimeSeconds,
      revision: question.currentRevision
        ? { id: question.currentRevision.id, version: question.currentRevision.version, prompt: question.currentRevision.prompt }
        : null,
      options: question.options,
      myStatus,
    };
  }

  async findMany(
    userId: string,
    examIdParam: string | undefined,
    subjectId: string | undefined,
    topicId: string | undefined,
    difficulty: string | undefined,
    limit: number,
    cursor: string | undefined,
  ) {
    const examId = await this.examsService.resolveExamId(userId, examIdParam);

    const where: Record<string, unknown> = {
      status: 'published',
      questionExams: { some: { examId } },
    };
    if (subjectId) where.subjectId = subjectId;
    if (topicId) where.topicId = topicId;
    if (difficulty) where.difficulty = difficulty;

    const take = Math.min(limit, 50);
    const rows = await this.prisma.question.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        difficulty: true,
        type: true,
        xpReward: true,
        successRate: true,
        subjectId: true,
        topicId: true,
        currentRevision: { select: { prompt: true } },
      },
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;

    return {
      data: data.map((q) => ({
        id:           q.id,
        subjectId:    q.subjectId,
        topicId:      q.topicId,
        difficulty:   q.difficulty,
        type:         q.type,
        xpReward:     q.xpReward,
        successRate:  q.successRate,
        prompt:       q.currentRevision?.prompt ?? '',
      })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }
}
