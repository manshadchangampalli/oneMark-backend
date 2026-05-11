import { SubjectsService } from './subjects.service';
export declare class SubjectsController {
    private readonly subjectsService;
    constructor(subjectsService: SubjectsService);
    findAll(req: any, examId?: string): Promise<{
        id: string;
        code: string;
        label: string;
        short: string;
        colorHex: string;
    }[]>;
}
