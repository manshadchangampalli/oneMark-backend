import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ListParams {
  subjectId?:  string;
  topicId?:    string;
  status?:     'draft' | 'published' | 'archived';
  difficulty?: 'easy' | 'medium' | 'hard';
  search?:     string;
  limit:       number;
  cursor?:     string;
}

@Injectable()
export class AdminQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(p: ListParams) {
    const take = Math.min(Math.max(p.limit, 1), 100);

    const where: Record<string, unknown> = {};
    if (p.subjectId)  where.subjectId  = p.subjectId;
    if (p.topicId)    where.topicId    = p.topicId;
    if (p.status)     where.status     = p.status;
    if (p.difficulty) where.difficulty = p.difficulty;
    if (p.search?.trim()) {
      where.currentRevision = {
        is: { prompt: { contains: p.search.trim(), mode: 'insensitive' } },
      };
    }

    const rows = await this.prisma.question.findMany({
      where,
      take: take + 1,
      ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id:           true,
        difficulty:   true,
        status:       true,
        xpReward:     true,
        successRate:  true,
        createdAt:    true,
        subject:         { select: { id: true, label: true, colorHex: true } },
        topic:           { select: { id: true, label: true } },
        currentRevision: { select: { prompt: true, version: true } },
        _count:          { select: { attempts: true } },
      },
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;

    return {
      data: data.map(q => ({
        id:          q.id,
        prompt:      q.currentRevision?.prompt ?? '(no revision)',
        version:     q.currentRevision?.version ?? null,
        subject:     q.subject,
        topic:       q.topic,
        difficulty:  q.difficulty,
        status:      q.status,
        xpReward:    q.xpReward,
        successRate: q.successRate,
        totalAttempts: q._count.attempts,
        createdAt:   q.createdAt,
      })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  async detail(id: string) {
    const q = await this.prisma.question.findUnique({
      where: { id },
      select: {
        id:             true,
        difficulty:     true,
        type:           true,
        status:         true,
        xpReward:       true,
        successRate:    true,
        avgTimeSeconds: true,
        createdAt:      true,
        updatedAt:      true,
        subject:        { select: { id: true, label: true, colorHex: true } },
        topic:          { select: { id: true, label: true } },
        currentRevision: {
          select: {
            id: true, version: true, prompt: true,
            correctOptionLabel: true, officialExplanation: true,
            difficulty: true, xpReward: true, createdAt: true,
          },
        },
        options: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, label: true, text: true, sub: true, sortOrder: true },
        },
        questionExams: { select: { exam: { select: { id: true, code: true, label: true } } } },
        _count:        { select: { attempts: true, revisions: true } },
      },
    });

    if (!q) throw new NotFoundException('Question not found');

    return {
      ...q,
      exams: q.questionExams.map(qe => qe.exam),
      questionExams: undefined,
      totalAttempts: q._count.attempts,
      revisionCount: q._count.revisions,
      _count: undefined,
    };
  }
}
