"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const exams_service_1 = require("../exams/exams.service");
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
let PracticeService = class PracticeService {
    prisma;
    examsService;
    constructor(prisma, examsService) {
        this.prisma = prisma;
        this.examsService = examsService;
    }
    async createSession(userId, dto) {
        const examId = await this.examsService.resolveExamId(userId, dto.examId);
        const where = {
            status: 'published',
            questionExams: { some: { examId } },
        };
        if (dto.subjectId)
            where.subjectId = dto.subjectId;
        if (dto.topicId)
            where.topicId = dto.topicId;
        if (dto.difficulty && dto.difficulty !== 'mixed')
            where.difficulty = dto.difficulty;
        const available = await this.prisma.question.findMany({
            where,
            select: { id: true },
        });
        if (available.length === 0) {
            throw new common_1.UnprocessableEntityException('No questions available for this filter');
        }
        const selectedIds = shuffle(available.map((q) => q.id)).slice(0, Math.min(dto.questionCount ?? 10, available.length));
        const count = selectedIds.length;
        const session = await this.prisma.$transaction(async (tx) => {
            const sess = await tx.practiceSession.create({
                data: {
                    userId,
                    examId,
                    mode: dto.mode,
                    subjectId: dto.subjectId ?? null,
                    topicId: dto.topicId ?? null,
                    difficulty: dto.difficulty ?? 'mixed',
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
            const q = byId.get(id);
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
    async getSession(userId, sessionId) {
        const session = await this.prisma.practiceSession.findUnique({
            where: { id: sessionId },
            include: {
                sessionQuestions: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        question: {
                            include: {
                                currentRevision: { select: { id: true, prompt: true } },
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
        if (!session || session.userId !== userId)
            throw new common_1.NotFoundException('Session not found');
        const attemptMap = new Map(session.attempts.map((a) => [a.questionId, a]));
        return {
            id: session.id,
            mode: session.mode,
            examId: session.examId,
            score: session.score,
            total: session.total,
            startedAt: session.startedAt,
            finishedAt: session.finishedAt,
            timeSpentSec: session.timeSpentSec,
            questions: session.sessionQuestions.map((sq) => {
                const attempt = attemptMap.get(sq.questionId);
                return {
                    sortOrder: sq.sortOrder,
                    id: sq.question.id,
                    difficulty: sq.question.difficulty,
                    type: sq.question.type,
                    revision: sq.question.currentRevision,
                    options: sq.question.options,
                    myStatus: attempt ? (attempt.isCorrect ? 'correct' : 'incorrect') : 'unattempted',
                    mySelectedOptionId: attempt?.selectedOptionId ?? null,
                };
            }),
        };
    }
    async submitAttempt(userId, sessionId, dto) {
        const { questionId, selectedOptionId, timeSeconds } = dto;
        const session = await this.prisma.practiceSession.findUnique({
            where: { id: sessionId },
            select: { userId: true, finishedAt: true, score: true },
        });
        if (!session || session.userId !== userId)
            throw new common_1.NotFoundException('Session not found');
        if (session.finishedAt)
            throw new common_1.ConflictException('Session is already finished');
        const sq = await this.prisma.sessionQuestion.findUnique({
            where: { sessionId_questionId: { sessionId, questionId } },
        });
        if (!sq)
            throw new common_1.NotFoundException('Question not in session');
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
        const question = await this.prisma.question.findUnique({
            where: { id: questionId },
            include: {
                currentRevision: { select: { id: true, correctOptionLabel: true, xpReward: true } },
                options: { select: { id: true, label: true } },
            },
        });
        if (!question?.currentRevision)
            throw new common_1.NotFoundException('Question has no revision');
        let isCorrect = false;
        if (selectedOptionId) {
            const opt = question.options.find((o) => o.id === selectedOptionId);
            if (!opt)
                throw new common_1.NotFoundException('Option not found for this question');
            isCorrect = opt.label === question.currentRevision.correctOptionLabel;
        }
        const xpAwarded = isCorrect ? question.currentRevision.xpReward : 0;
        const { attempt, runningScore } = await this.prisma.$transaction(async (tx) => {
            const a = await tx.attempt.create({
                data: {
                    userId,
                    questionId,
                    questionRevisionId: question.currentRevision.id,
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
            return { attempt: a, runningScore: updated.score };
        });
        return {
            attempt: { id: attempt.id, isCorrect, xpAwarded },
            isCorrect,
            runningScore,
        };
    }
    async finishSession(userId, sessionId) {
        const session = await this.prisma.practiceSession.findUnique({
            where: { id: sessionId },
            include: {
                attempts: {
                    select: {
                        isCorrect: true,
                        xpAwarded: true,
                        question: { select: { topicId: true } },
                    },
                },
            },
        });
        if (!session || session.userId !== userId)
            throw new common_1.NotFoundException('Session not found');
        if (!session.finishedAt) {
            const now = new Date();
            const timeSpentSec = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
            await this.prisma.practiceSession.update({
                where: { id: sessionId },
                data: { finishedAt: now, timeSpentSec },
            });
            session.finishedAt = now;
            session.timeSpentSec = timeSpentSec;
        }
        return this.buildFinishResponse(session);
    }
    async findSessions(userId, limit, cursor) {
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
                exam: { select: { id: true, code: true, label: true } },
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
    buildFinishResponse(session) {
        const accuracy = session.total > 0
            ? Math.round((session.score / session.total) * 10000) / 100
            : 0;
        const byTopicMap = new Map();
        for (const a of session.attempts) {
            const tid = a.question.topicId;
            const curr = byTopicMap.get(tid) ?? { correct: 0, total: 0 };
            byTopicMap.set(tid, {
                correct: curr.correct + (a.isCorrect ? 1 : 0),
                total: curr.total + 1,
            });
        }
        return {
            score: session.score,
            total: session.total,
            accuracy,
            timeSpentSec: session.timeSpentSec,
            byTopic: Array.from(byTopicMap.entries()).map(([topicId, stats]) => ({
                topicId,
                correct: stats.correct,
                total: stats.total,
            })),
            xpAwarded: session.attempts.reduce((sum, a) => sum + a.xpAwarded, 0),
        };
    }
};
exports.PracticeService = PracticeService;
exports.PracticeService = PracticeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        exams_service_1.ExamsService])
], PracticeService);
//# sourceMappingURL=practice.service.js.map