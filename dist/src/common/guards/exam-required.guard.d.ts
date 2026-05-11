import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ExamsService } from '../../exams/exams.service';
export declare class ExamRequiredGuard implements CanActivate {
    private readonly examsService;
    constructor(examsService: ExamsService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
