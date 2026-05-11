import { QuestionsService } from './questions.service';
export declare class QuestionsController {
    private readonly questionsService;
    constructor(questionsService: QuestionsService);
    findOne(req: any, id: string): Promise<{
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
    findMany(req: any, examId?: string, subjectId?: string, topicId?: string, difficulty?: string, limit?: string, cursor?: string): Promise<{
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
