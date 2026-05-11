import { EnrolExamDto } from './dto/enrol-exam.dto';
import { ExamsService } from './exams.service';
export declare class ExamsController {
    private readonly examsService;
    constructor(examsService: ExamsService);
    findAll(): import("src/generated/prisma").Prisma.PrismaPromise<{
        id: string;
        code: string;
        label: string;
        description: string | null;
    }[]>;
}
export declare class MyExamsController {
    private readonly examsService;
    constructor(examsService: ExamsService);
    findMine(req: any): import("src/generated/prisma").Prisma.PrismaPromise<({
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
    enrol(req: any, dto: EnrolExamDto): Promise<{
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
    setPrimary(req: any, examId: string): Promise<{
        examId: string;
        userId: string;
        isPrimary: boolean;
        enrolledAt: Date;
    }>;
    leave(req: any, examId: string): Promise<void>;
}
