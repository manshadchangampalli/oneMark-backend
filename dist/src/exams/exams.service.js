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
exports.ExamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ExamsService = class ExamsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAllActive() {
        return this.prisma.exam.findMany({
            where: { isActive: true },
            select: { id: true, code: true, label: true, description: true },
            orderBy: { label: 'asc' },
        });
    }
    findUserExams(userId) {
        return this.prisma.userExam.findMany({
            where: { userId },
            include: { exam: { select: { id: true, code: true, label: true, description: true } } },
            orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'asc' }],
        });
    }
    async enrol(userId, dto) {
        const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
        if (!exam || !exam.isActive)
            throw new common_1.NotFoundException('Exam not found');
        const existing = await this.prisma.userExam.findUnique({
            where: { userId_examId: { userId, examId: dto.examId } },
        });
        if (existing)
            throw new common_1.BadRequestException('Already enrolled in this exam');
        const totalExams = await this.prisma.userExam.count({ where: { userId } });
        const makePrimary = dto.isPrimary === true || totalExams === 0;
        return this.prisma.$transaction(async (tx) => {
            if (makePrimary) {
                await tx.userExam.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
            }
            return tx.userExam.create({
                data: { userId, examId: dto.examId, isPrimary: makePrimary },
                include: { exam: { select: { id: true, code: true, label: true } } },
            });
        });
    }
    async setPrimary(userId, examId) {
        const enrolment = await this.prisma.userExam.findUnique({
            where: { userId_examId: { userId, examId } },
        });
        if (!enrolment)
            throw new common_1.NotFoundException('Not enrolled in this exam');
        if (enrolment.isPrimary)
            return enrolment;
        return this.prisma.$transaction(async (tx) => {
            await tx.userExam.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
            return tx.userExam.update({
                where: { userId_examId: { userId, examId } },
                data: { isPrimary: true },
                include: { exam: { select: { id: true, code: true, label: true } } },
            });
        });
    }
    async leave(userId, examId) {
        const enrolment = await this.prisma.userExam.findUnique({
            where: { userId_examId: { userId, examId } },
        });
        if (!enrolment)
            throw new common_1.NotFoundException('Not enrolled in this exam');
        const totalExams = await this.prisma.userExam.count({ where: { userId } });
        if (totalExams === 1) {
            throw new common_1.UnprocessableEntityException('Cannot leave your only exam. Enrol in another first.');
        }
        await this.prisma.userExam.delete({ where: { userId_examId: { userId, examId } } });
        if (enrolment.isPrimary) {
            const next = await this.prisma.userExam.findFirst({
                where: { userId },
                orderBy: { enrolledAt: 'asc' },
            });
            if (next) {
                await this.prisma.userExam.update({
                    where: { userId_examId: { userId, examId: next.examId } },
                    data: { isPrimary: true },
                });
            }
        }
    }
    hasAnyExam(userId) {
        return this.prisma.userExam.count({ where: { userId } }).then((n) => n > 0);
    }
    async resolveExamId(userId, examIdParam) {
        if (examIdParam) {
            const enrolment = await this.prisma.userExam.findUnique({
                where: { userId_examId: { userId, examId: examIdParam } },
            });
            if (!enrolment)
                throw new common_1.BadRequestException('Not enrolled in the requested exam');
            return examIdParam;
        }
        const primary = await this.prisma.userExam.findFirst({
            where: { userId, isPrimary: true },
        });
        if (!primary)
            throw new common_1.UnprocessableEntityException({ code: 'EXAM_REQUIRED' });
        return primary.examId;
    }
};
exports.ExamsService = ExamsService;
exports.ExamsService = ExamsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExamsService);
//# sourceMappingURL=exams.service.js.map