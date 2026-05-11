import { PrismaService } from '../prisma/prisma.service';
import type { EnrolExamDto } from './dto/enrol-exam.dto';
export declare class ExamsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAllActive(): import("src/generated/prisma").Prisma.PrismaPromise<{
        id: string;
        code: string;
        label: string;
        description: string | null;
    }[]>;
    findUserExams(userId: string): import("src/generated/prisma").Prisma.PrismaPromise<({
        exam: {
            id: string;
            code: string;
            label: string;
            description: string | null;
        };
    } & {
        examId: string;
        userId: string;
        isPrimary: boolean;
        enrolledAt: Date;
    })[]>;
    enrol(userId: string, dto: EnrolExamDto): Promise<{
        exam: {
            id: string;
            code: string;
            label: string;
        };
    } & {
        examId: string;
        userId: string;
        isPrimary: boolean;
        enrolledAt: Date;
    }>;
    setPrimary(userId: string, examId: string): Promise<{
        examId: string;
        userId: string;
        isPrimary: boolean;
        enrolledAt: Date;
    }>;
    leave(userId: string, examId: string): Promise<void>;
    hasAnyExam(userId: string): Promise<boolean>;
    resolveExamId(userId: string, examIdParam?: string): Promise<string>;
}
