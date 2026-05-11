import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { DailyAttemptDto } from './dto/submit-attempt.dto';

// Question fields returned to the client (without correct answer)
const QUESTION_INCLUDE = {
  currentRevision: {
    select: {
      id: true,
      prompt: true,
      difficulty: true,
      xpReward: true,
      // correctOptionLabel and officialExplanation omitted — revealed after attempt
    },
  },
  options: {
    select: { id: true, label: true, text: true, sub: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

@Injectable()
export class DailyChallengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly examsService: ExamsService,
  ) {}

  private today(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  async getToday(userId: string, examIdParam?: string) {
    const examId = await this.examsService.resolveExamId(userId, examIdParam);
    const date = this.today();

    let challenge = await this.prisma.dailyChallenge.findUnique({
      where: { date_examId: { date, examId } },
      include: { question: { include: QUESTION_INCLUDE } },
    });

    // Auto-create if no challenge set for today
    if (!challenge) {
      const available = await this.prisma.question.findMany({
        where: { status: 'published', questionExams: { some: { examId } } },
        select: { id: true },
      });
      if (available.length === 0) throw new NotFoundException('No questions available for this exam');

      const picked = available[Math.floor(Math.random() * available.length)];
      challenge = await this.prisma.dailyChallenge.create({
        data: { date, examId, questionId: picked.id },
        include: { question: { include: QUESTION_INCLUDE } },
      });
    }

    const myAttempt = await this.prisma.attempt.findFirst({
      where: { userId, dailyChallengeId: challenge.id },
      select: { id: true, isCorrect: true, selectedOptionId: true, xpAwarded: true },
    });

    const q = challenge.question;

    // Only reveal correct answer + explanation after the user has attempted
    let revisionForClient: Record<string, unknown> = {
      id: q.currentRevision?.id,
      prompt: q.currentRevision?.prompt,
      difficulty: q.currentRevision?.difficulty,
      xpReward: q.currentRevision?.xpReward,
    };

    if (myAttempt) {
      // Load full revision (with explanation) for the reveal
      const fullRevision = await this.prisma.questionRevision.findUnique({
        where: { id: q.currentRevision!.id },
        select: { correctOptionLabel: true, officialExplanation: true },
      });
      revisionForClient = {
        ...revisionForClient,
        correctOptionLabel: fullRevision?.correctOptionLabel,
        officialExplanation: fullRevision?.officialExplanation,
      };
    }

    return {
      id: challenge.id,
      date: challenge.date,
      totalSolvers: challenge.totalSolvers,
      question: {
        id: q.id,
        difficulty: q.difficulty,
        type: q.type,
        xpReward: q.xpReward,
        revision: revisionForClient,
        options: q.options,
      },
      myAttempt: myAttempt ?? null,
    };
  }

  async submitAttempt(userId: string, dto: DailyAttemptDto) {
    const examId = await this.examsService.resolveExamId(userId, dto.examId);
    const date = this.today();

    const challenge = await this.prisma.dailyChallenge.findUnique({
      where: { date_examId: { date, examId } },
      include: {
        question: {
          include: {
            currentRevision: { select: { id: true, correctOptionLabel: true, xpReward: true, officialExplanation: true } },
            options: { select: { id: true, label: true } },
          },
        },
      },
    });

    if (!challenge) throw new NotFoundException('No daily challenge for today — call GET /daily-challenge first to initialise it');

    // Idempotency check — one attempt per user per challenge
    const existing = await this.prisma.attempt.findFirst({
      where: { userId, dailyChallengeId: challenge.id },
      select: { id: true, isCorrect: true, xpAwarded: true, selectedOptionId: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_ATTEMPTED',
        message: 'You have already attempted today\'s challenge',
        attempt: existing,
      });
    }

    const question = challenge.question;
    if (!question.currentRevision) throw new NotFoundException('Question has no published revision');

    let isCorrect = false;
    if (dto.selectedOptionId) {
      const opt = question.options.find((o) => o.id === dto.selectedOptionId);
      if (!opt) throw new NotFoundException('Option not found for this question');
      isCorrect = opt.label === question.currentRevision.correctOptionLabel;
    }

    // Daily challenge gives +20 XP bonus on top of the question's base reward
    const xpAwarded = isCorrect ? question.currentRevision.xpReward + 20 : 0;

    const attempt = await this.prisma.$transaction(async (tx) => {
      const a = await tx.attempt.create({
        data: {
          userId,
          questionId: challenge.questionId,
          questionRevisionId: question.currentRevision!.id,
          dailyChallengeId: challenge.id,
          selectedOptionId: dto.selectedOptionId ?? null,
          isCorrect,
          timeSeconds: dto.timeSeconds,
          xpAwarded,
        },
      });

      await tx.dailyChallenge.update({
        where: { id: challenge.id },
        data: { totalSolvers: { increment: 1 } }, // count all attempts, not just correct
      });

      return a;
    });

    return {
      attempt: { id: attempt.id, isCorrect, xpAwarded },
      isCorrect,
      correctOptionLabel: question.currentRevision.correctOptionLabel,
      officialExplanation: question.currentRevision.officialExplanation,
    };
  }

  // Admin: set or overwrite today's (or any date's) challenge for an exam
  async setChallenge(examId: string, questionId: string, date?: Date) {
    const targetDate = date ?? this.today();

    return this.prisma.dailyChallenge.upsert({
      where: { date_examId: { date: targetDate, examId } },
      create: { date: targetDate, examId, questionId },
      update: { questionId },
    });
  }
}
