import { TopicsService } from './topics.service';
export declare class TopicsController {
    private readonly topicsService;
    constructor(topicsService: TopicsService);
    findAll(req: any, subjectId: string, examId?: string): Promise<{
        id: string;
        code: string;
        label: string;
        sortOrder: number;
    }[]>;
}
