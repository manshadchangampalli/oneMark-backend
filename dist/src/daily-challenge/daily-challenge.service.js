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
exports.DailyChallengeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const exams_service_1 = require("../exams/exams.service");
const QUESTION_INCLUDE = {
    currentRevision: {
        select: {
            id: true,
            prompt: true,
            difficulty: true,
            xpReward: true,
        },
    },
    options: {
        select: { id: true, label: true, text: true, sub: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
    },
};
let DailyChallengeService = class DailyChallengeService {
    prisma;
    examsService;
    constructor(prisma, examsService) {
        this.prisma = prisma;
        this.examsService = examsService;
    }
    today() {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
    async getToday(userId, examIdParam) {
        const examId = await this.examsService.resolveExamId(userId, examIdParam);
        const date = this.today();
        let challenge = await this.prisma.dailyChallenge.findUnique({
            where: { date_examId: { date, examId } },
            include: { question: { include: QUESTION_INCLUDE } },
        });
        if (!challenge) {
            const available = await this.prisma.question.findMany({
                where: { status: 'published', questionExams: { some: { examId } } },
                select: { id: true },
            });
            if (available.length === 0)
                throw new common_1.NotFoundException('No questions available for this exam');
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
        let revisionForClient = {
            id: q.currentRevision?.id,
            prompt: q.currentRevision?.prompt,
            difficulty: q.currentRevision?.difficulty,
            xpReward: q.currentRevision?.xpReward,
        };
        if (myAttempt) {
            const fullRevision = await this.prisma.questionRevision.findUnique({
                where: { id: q.currentRevision.id },
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
    async submitAttempt(userId, dto) {
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
        if (!challenge)
            throw new common_1.NotFoundException('No daily challenge for today — call GET /daily-challenge first to initialise it');
        const existing = await this.prisma.attempt.findFirst({
            where: { userId, dailyChallengeId: challenge.id },
            select: { id: true, isCorrect: true, xpAwarded: true, selectedOptionId: true },
        });
        if (existing) {
            throw new common_1.ConflictException({
                code: 'ALREADY_ATTEMPTED',
                message: 'You have already attempted today\'s challenge',
                attempt: existing,
            });
        }
        const question = challenge.question;
        if (!question.currentRevision)
            throw new common_1.NotFoundException('Question has no published revision');
        let isCorrect = false;
        if (dto.selectedOptionId) {
            const opt = question.options.find((o) => o.id === dto.selectedOptionId);
            if (!opt)
                throw new common_1.NotFoundException('Option not found for this question');
            isCorrect = opt.label === question.currentRevision.correctOptionLabel;
        }
        const xpAwarded = isCorrect ? question.currentRevision.xpReward + 20 : 0;
        const attempt = await this.prisma.$transaction(async (tx) => {
            const a = await tx.attempt.create({
                data: {
                    userId,
                    questionId: challenge.questionId,
                    questionRevisionId: question.currentRevision.id,
                    dailyChallengeId: challenge.id,
                    selectedOptionId: dto.selectedOptionId ?? null,
                    isCorrect,
                    timeSeconds: dto.timeSeconds,
                    xpAwarded,
                },
            });
            await tx.dailyChallenge.update({
                where: { id: challenge.id },
                data: { totalSolvers: { increment: 1 } },
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
    async setChallenge(examId, questionId, date) {
        const targetDate = date ?? this.today();
        return this.prisma.dailyChallenge.upsert({
            where: { date_examId: { date: targetDate, examId } },
            create: { date: targetDate, examId, questionId },
            update: { questionId },
        });
    }
};
exports.DailyChallengeService = DailyChallengeService;
exports.DailyChallengeService = DailyChallengeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        exams_service_1.ExamsService])
], DailyChallengeService);
//# sourceMappingURL=daily-challenge.service.js.map