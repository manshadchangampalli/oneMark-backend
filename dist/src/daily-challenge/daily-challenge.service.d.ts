import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { DailyAttemptDto } from './dto/submit-attempt.dto';
export declare class DailyChallengeService {
    private readonly prisma;
    private readonly examsService;
    constructor(prisma: PrismaService, examsService: ExamsService);
    private today;
    getToday(userId: string, examIdParam?: string): Promise<{
        id: string;
        date: Date;
        totalSolvers: number;
        question: {
            id: string;
            difficulty: import("src/generated/prisma").$Enums.QuestionDifficulty;
            type: "mcq";
            xpReward: number;
            revision: Record<string, unknown>;
            options: {
                sub: string | null;
                id: string;
                label: string;
                sortOrder: number;
                text: string;
            }[];
        };
        myAttempt: {
            id: string;
            selectedOptionId: string | null;
            isCorrect: boolean;
            xpAwarded: number;
        } | null;
    }>;
    submitAttempt(userId: string, dto: DailyAttemptDto): Promise<{
        attempt: {
            id: string;
            isCorrect: boolean;
            xpAwarded: number;
        };
        isCorrect: boolean;
        correctOptionLabel: string;
        officialExplanation: import("src/generated/prisma/runtime/client").JsonValue;
    }>;
    setChallenge(examId: string, questionId: string, date?: Date): Promise<{
        id: string;
        createdAt: Date;
        examId: string;
        questionId: string;
        date: Date;
        totalSolvers: number;
    }>;
}
