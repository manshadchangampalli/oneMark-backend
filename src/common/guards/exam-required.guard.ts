import { CanActivate, ExecutionContext, Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { Request } from 'express';
import { ExamsService } from '../../exams/exams.service';

/**
 * Blocks authenticated users who haven't enrolled in any exam yet.
 * Attach after JwtAuthGuard on any route that needs exam context.
 */
@Injectable()
export class ExamRequiredGuard implements CanActivate {
  constructor(private readonly examsService: ExamsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { id: string } | undefined;
    if (!user) return false;

    const has = await this.examsService.hasAnyExam(user.id);
    if (!has) throw new UnprocessableEntityException({ code: 'EXAM_REQUIRED' });

    return true;
  }
}
