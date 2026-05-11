import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';
export declare class SubjectsService {
    private readonly prisma;
    private readonly examsService;
    constructor(prisma: PrismaService, examsService: ExamsService);
    findForExam(userId: string, examIdParam?: string): Promise<{
        id: string;
        code: string;
        label: string;
        short: string;
        colorHex: string;
    }[]>;
}
