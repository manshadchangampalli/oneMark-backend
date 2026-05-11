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
exports.SubjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const exams_service_1 = require("../exams/exams.service");
let SubjectsService = class SubjectsService {
    prisma;
    examsService;
    constructor(prisma, examsService) {
        this.prisma = prisma;
        this.examsService = examsService;
    }
    async findForExam(userId, examIdParam) {
        const examId = await this.examsService.resolveExamId(userId, examIdParam);
        const rows = await this.prisma.subjectExam.findMany({
            where: { examId },
            include: {
                subject: {
                    select: { id: true, code: true, label: true, short: true, colorHex: true },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        return rows.map((r) => r.subject);
    }
};
exports.SubjectsService = SubjectsService;
exports.SubjectsService = SubjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        exams_service_1.ExamsService])
], SubjectsService);
//# sourceMappingURL=subjects.service.js.map