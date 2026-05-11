import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';
export declare class QuestionsService {
    private readonly prisma;
    private readonly examsService;
    constructor(prisma: PrismaService, examsService: ExamsService);
    findOne(userId: string, questionId: string): Promise<{
        id: string;
        subject: {
            id: string;
            code: string;
            label: string;
            colorHex: string;
        };
        topic: {
            id: string;
            code: string;
            label: string;
        };
        difficulty: import("src/generated/prisma").$Enums.QuestionDifficulty;
        type: "mcq";
        xpReward: number;
        successRate: import("@prisma/client-runtime-utils").Decimal | null;
        avgTimeSeconds: number | null;
        revision: {
            id: string;
            version: number;
            prompt: string;
        } | null;
        options: {
            sub: string | null;
            id: string;
            label: string;
            sortOrder: number;
            text: string;
        }[];
        myStatus: "unattempted" | "correct" | "incorrect";
    }>;
    findMany(userId: string, examIdParam: string | undefined, subjectId: string | undefined, topicId: string | undefined, difficulty: string | undefined, limit: number, cursor: string | undefined): Promise<{
        data: {
            id: string;
            subjectId: string;
            topicId: string;
            difficulty: import("src/generated/prisma").$Enums.QuestionDifficulty;
            type: "mcq";
            xpReward: number;
            successRate: import("@prisma/client-runtime-utils").Decimal | null;
            prompt: string;
        }[];
        nextCursor: string | null;
    }>;
}
