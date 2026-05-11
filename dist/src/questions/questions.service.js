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
exports.QuestionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const exams_service_1 = require("../exams/exams.service");
let QuestionsService = class QuestionsService {
    prisma;
    examsService;
    constructor(prisma, examsService) {
        this.prisma = prisma;
        this.examsService = examsService;
    }
    async findOne(userId, questionId) {
        const question = await this.prisma.question.findUnique({
            where: { id: questionId, status: 'published' },
            include: {
                subject: { select: { id: true, code: true, label: true, colorHex: true } },
                topic: { select: { id: true, code: true, label: true } },
                currentRevision: {
                    select: {
                        id: true,
                        version: true,
                        prompt: true,
                        difficulty: true,
                        xpReward: true,
                    },
                },
                options: {
                    select: { id: true, label: true, text: true, sub: true, sortOrder: true },
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });
        if (!question)
            throw new common_1.NotFoundException('Question not found');
        const lastAttempt = await this.prisma.attempt.findFirst({
            where: { userId, questionId },
            orderBy: { attemptedAt: 'desc' },
            select: { isCorrect: true, id: true },
        });
        const myStatus = lastAttempt
            ? lastAttempt.isCorrect ? 'correct' : 'incorrect'
            : 'unattempted';
        return {
            id: question.id,
            subject: question.subject,
            topic: question.topic,
            difficulty: question.difficulty,
            type: question.type,
            xpReward: question.currentRevision?.xpReward ?? question.xpReward,
            successRate: question.successRate,
            avgTimeSeconds: question.avgTimeSeconds,
            revision: question.currentRevision
                ? { id: question.currentRevision.id, version: question.currentRevision.version, prompt: question.currentRevision.prompt }
                : null,
            options: question.options,
            myStatus,
        };
    }
    async findMany(userId, examIdParam, subjectId, topicId, difficulty, limit, cursor) {
        const examId = await this.examsService.resolveExamId(userId, examIdParam);
        const where = {
            status: 'published',
            questionExams: { some: { examId } },
        };
        if (subjectId)
            where.subjectId = subjectId;
        if (topicId)
            where.topicId = topicId;
        if (difficulty)
            where.difficulty = difficulty;
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
                id: q.id,
                subjectId: q.subjectId,
                topicId: q.topicId,
                difficulty: q.difficulty,
                type: q.type,
                xpReward: q.xpReward,
                successRate: q.successRate,
                prompt: q.currentRevision?.prompt ?? '',
            })),
            nextCursor: hasMore ? data[data.length - 1].id : null,
        };
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        exams_service_1.ExamsService])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map