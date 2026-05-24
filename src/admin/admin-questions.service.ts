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

/** Same as CreateQuestionInput but every ID can be supplied as a *code*
 *  (subject.code, topic.code, exam.code) — much friendlier for JSON / CSV
 *  uploads, since admins don't know UUIDs by heart. */
export interface BulkRowInput extends Partial<CreateQuestionInput> {
  subjectCode?:  string;
  topicCode?:    string;
  examCodes?:    string[];
  // All the fields from CreateQuestionInput are optional here so we can
  // gracefully report row-level validation issues rather than 400 the
  // whole batch.
}

export interface BulkImportResult {
  total:     number;
  succeeded: number;
  failed:    number;
  rows: Array<
    | { index: number; ok: true;  questionId: string }
    | { index: number; ok: false; error: string }
  >;
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

  /** Bulk import — resolves codes → ids once, then runs the normal create
   *  per row in its own transaction. One bad row never kills the batch. */
  async bulkCreate(adminId: string, rows: BulkRowInput[]): Promise<BulkImportResult> {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('No rows to import');
    }
    if (rows.length > 200) {
      throw new BadRequestException('Cap is 200 rows per request');
    }

    // 1. Collect every unique code referenced across the batch
    const subjectCodes = new Set<string>();
    const topicCodes   = new Set<string>();
    const examCodes    = new Set<string>();
    for (const r of rows) {
      if (r.subjectCode) subjectCodes.add(r.subjectCode);
      if (r.topicCode)   topicCodes.add(r.topicCode);
      r.examCodes?.forEach(c => examCodes.add(c));
    }

    // 2. One round-trip per table to resolve them all
    type CodeRow = { id: string; code: string };
    const [subjects, topics, exams] = await Promise.all([
      subjectCodes.size
        ? this.prisma.subject.findMany({
            where: { code: { in: [...subjectCodes] }, archivedAt: null },
            select: { id: true, code: true },
          })
        : Promise.resolve<CodeRow[]>([]),
      topicCodes.size
        ? this.prisma.topic.findMany({
            where: { code: { in: [...topicCodes] }, archivedAt: null },
            select: { id: true, code: true },
          })
        : Promise.resolve<CodeRow[]>([]),
      examCodes.size
        ? this.prisma.exam.findMany({
            where: { code: { in: [...examCodes] }, archivedAt: null },
            select: { id: true, code: true },
          })
        : Promise.resolve<CodeRow[]>([]),
    ]);
    const subjectByCode = new Map<string, string>(subjects.map(s => [s.code, s.id]));
    const topicByCode   = new Map<string, string>(topics  .map(t => [t.code, t.id]));
    const examByCode    = new Map<string, string>(exams   .map(e => [e.code, e.id]));

    // 3. Process each row independently — collect results
    const result: BulkImportResult = { total: rows.length, succeeded: 0, failed: 0, rows: [] };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        // Resolve codes → ids; row-level error if a code can't be matched
        const subjectId = r.subjectId ?? (r.subjectCode ? subjectByCode.get(r.subjectCode) : undefined);
        const topicId   = r.topicId   ?? (r.topicCode   ? topicByCode  .get(r.topicCode)   : undefined);
        const examIds   = r.examIds ?? r.examCodes?.map(c => {
          const id = examByCode.get(c);
          if (!id) throw new Error(`Unknown exam code: "${c}"`);
          return id;
        });

        if (!subjectId) throw new Error(`Unknown subject (code "${r.subjectCode}" not found)`);
        if (!topicId)   throw new Error(`Unknown topic (code "${r.topicCode}" not found)`);
        if (!examIds || examIds.length === 0) throw new Error('At least one exam required');

        const created = await this.create(adminId, {
          subjectId,
          topicId,
          examIds,
          difficulty:          r.difficulty ?? 'medium',
          type:                r.type ?? 'mcq',
          status:              r.status ?? 'draft',
          xpReward:            r.xpReward,
          prompt:              r.prompt ?? '',
          options:             r.options ?? [],
          correctOptionLabel:  r.correctOptionLabel ?? '',
          officialExplanation: r.officialExplanation ?? null,
        });

        result.rows.push({ index: i, ok: true, questionId: created.id });
        result.succeeded++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.rows.push({ index: i, ok: false, error: message });
        result.failed++;
      }
    }

    return result;
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
