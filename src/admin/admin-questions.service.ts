import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OptionInput {
  label: string;
  text:  string;
  sub?:  string | null;
}

export interface CreateQuestionInput {
  subjectId:           string;
  topicId:             string;
  examIds:             string[];
  difficulty:          'easy' | 'medium' | 'hard';
  type?:               'mcq';
  status?:             'draft' | 'published';
  xpReward?:           number;
  prompt:              string;
  options:             OptionInput[];
  correctOptionLabel:  string;
  officialExplanation?: { steps: string[] } | null;
}

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

  async create(adminId: string, dto: CreateQuestionInput) {
    await this.validateCreate(dto);

    const status   = dto.status   ?? 'draft';
    const type     = dto.type     ?? 'mcq';
    const xpReward = dto.xpReward ?? 50;
    const explanation = dto.officialExplanation ?? null;

    const questionId = await this.prisma.$transaction(async (tx) => {
      // 1. Question shell — currentRevisionId set later (circular FK)
      const q = await tx.question.create({
        data: {
          subjectId:  dto.subjectId,
          topicId:    dto.topicId,
          difficulty: dto.difficulty,
          type,
          status,
          xpReward,
          createdBy:  adminId,
        },
        select: { id: true },
      });

      // 2. First revision (version 1)
      const rev = await tx.questionRevision.create({
        data: {
          questionId:          q.id,
          version:             1,
          prompt:              dto.prompt.trim(),
          correctOptionLabel:  dto.correctOptionLabel,
          officialExplanation: explanation as any, // JSON column
          difficulty:          dto.difficulty,
          xpReward,
        },
        select: { id: true },
      });

      // 3. Link the revision as current
      await tx.question.update({
        where: { id: q.id },
        data:  { currentRevisionId: rev.id },
      });

      // 4. Options (use sortOrder = index + 1 so reordering later is cleaner)
      await tx.questionOption.createMany({
        data: dto.options.map((opt, i) => ({
          questionId: q.id,
          label:      opt.label,
          text:       opt.text.trim(),
          sub:        opt.sub?.trim() || null,
          sortOrder:  i + 1,
        })),
      });

      // 5. Exam tagging
      await tx.questionExam.createMany({
        data: dto.examIds.map((examId) => ({ questionId: q.id, examId })),
      });

      return q.id;
    });

    // Return full detail so the client can use it directly
    return this.detail(questionId);
  }

  /** All the rules in one place. Throws BadRequest with a clear message. */
  private async validateCreate(dto: CreateQuestionInput) {
    if (!dto.prompt?.trim()) throw new BadRequestException('Prompt is required');
    if (!dto.options || dto.options.length < 2 || dto.options.length > 6) {
      throw new BadRequestException('Provide between 2 and 6 options');
    }
    if (!dto.examIds || dto.examIds.length === 0) {
      throw new BadRequestException('Pick at least one exam');
    }

    // Unique non-empty labels + every option has text
    const labels = new Set<string>();
    for (const opt of dto.options) {
      if (!opt.label?.trim()) throw new BadRequestException('Each option needs a label');
      if (!opt.text?.trim())  throw new BadRequestException(`Option ${opt.label} needs text`);
      if (labels.has(opt.label)) throw new BadRequestException(`Duplicate option label: ${opt.label}`);
      labels.add(opt.label);
    }
    if (!labels.has(dto.correctOptionLabel)) {
      throw new BadRequestException('Correct option label must match one of the options');
    }

    // FK existence + topic-belongs-to-subject + exams exist
    const [subject, topic, examCount] = await Promise.all([
      this.prisma.subject.findFirst({ where: { id: dto.subjectId, archivedAt: null }, select: { id: true } }),
      this.prisma.topic.findFirst({
        where: { id: dto.topicId, archivedAt: null },
        select: { id: true, subjectId: true },
      }),
      this.prisma.exam.count({ where: { id: { in: dto.examIds }, archivedAt: null } }),
    ]);

    if (!subject) throw new BadRequestException('Subject not found or archived');
    if (!topic)   throw new BadRequestException('Topic not found or archived');
    if (topic.subjectId !== dto.subjectId) {
      throw new BadRequestException('Topic does not belong to the chosen subject');
    }
    if (examCount !== dto.examIds.length) {
      throw new BadRequestException('One or more exams are invalid or archived');
    }

    if (dto.xpReward !== undefined && (dto.xpReward < 0 || dto.xpReward > 10_000)) {
      throw new BadRequestException('xpReward must be between 0 and 10000');
    }
  }
}
