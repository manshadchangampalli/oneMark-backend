import { DailyChallengeService } from './daily-challenge.service';
import { DailyAttemptDto } from './dto/submit-attempt.dto';
export declare class DailyChallengeController {
    private readonly dailyChallengeService;
    constructor(dailyChallengeService: DailyChallengeService);
    getToday(req: any, examId?: string): Promise<{
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
    submitAttempt(req: any, dto: DailyAttemptDto): Promise<{
        attempt: {
            id: string;
            isCorrect: boolean;
            xpAwarded: number;
        };
        isCorrect: boolean;
        correctOptionLabel: string;
        officialExplanation: import("src/generated/prisma/runtime/client").JsonValue;
    }>;
}
