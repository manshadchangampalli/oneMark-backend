import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
export declare class PracticeService {
    private readonly prisma;
    private readonly examsService;
    constructor(prisma: PrismaService, examsService: ExamsService);
    createSession(userId: string, dto: CreateSessionDto): Promise<{
        session: {
            id: string;
            mode: import("src/generated/prisma").$Enums.SessionMode;
            examId: string;
            questionCount: number;
            timeLimitSec: number | null;
            startedAt: Date;
        };
        questions: {
            id: string;
            difficulty: import("src/generated/prisma").$Enums.QuestionDifficulty;
            type: "mcq";
            xpReward: number;
            revision: {
                id: string;
                prompt: string;
            } | null;
            options: {
                sub: string | null;
                id: string;
                label: string;
                sortOrder: number;
                text: string;
            }[];
        }[];
    }>;
    getSession(userId: string, sessionId: string): Promise<{
        id: string;
        mode: import("src/generated/prisma").$Enums.SessionMode;
        examId: string;
        score: number;
        total: number;
        startedAt: Date;
        finishedAt: Date | null;
        timeSpentSec: number;
        questions: {
            sortOrder: number;
            id: string;
            difficulty: import("src/generated/prisma").$Enums.QuestionDifficulty;
            type: "mcq";
            revision: {
                id: string;
                prompt: string;
            } | null;
            options: {
                sub: string | null;
                id: string;
                label: string;
                sortOrder: number;
                text: string;
            }[];
            myStatus: string;
            mySelectedOptionId: string | null;
        }[];
    }>;
    submitAttempt(userId: string, sessionId: string, dto: SubmitAttemptDto): Promise<{
        attempt: {
            id: string;
            isCorrect: boolean;
            xpAwarded: number;
        };
        isCorrect: boolean;
        runningScore: number;
    }>;
    finishSession(userId: string, sessionId: string): Promise<{
        score: number;
        total: number;
        accuracy: number;
        timeSpentSec: number;
        byTopic: {
            topicId: string;
            correct: number;
            total: number;
        }[];
        xpAwarded: number;
    }>;
    findSessions(userId: string, limit: number, cursor?: string): Promise<{
        data: {
            accuracy: number | null;
            id: string;
            exam: {
                id: string;
                code: string;
                label: string;
            };
            difficulty: import("src/generated/prisma").$Enums.SessionDifficulty;
            mode: import("src/generated/prisma").$Enums.SessionMode;
            questionCount: number;
            startedAt: Date;
            finishedAt: Date | null;
            score: number;
            total: number;
            timeSpentSec: number;
        }[];
        nextCursor: string | null;
    }>;
    private buildFinishResponse;
}
