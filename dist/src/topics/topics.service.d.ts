import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';
export declare class TopicsService {
    private readonly prisma;
    private readonly examsService;
    constructor(prisma: PrismaService, examsService: ExamsService);
    findForSubject(userId: string, subjectId: string, examIdParam?: string): Promise<{
        id: string;
        code: string;
        label: string;
        sortOrder: number;
    }[]>;
}
