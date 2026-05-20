import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamRequiredGuard } from '../common/guards/exam-required.guard';
import { TopicsService } from './topics.service';

@UseGuards(JwtAuthGuard, ExamRequiredGuard)
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  // GET /topics/progress?limit=4
  @Get('progress')
  getProgress(
    @Req() req,
    @Query('limit') limit?: string,
    @Query('examId') examId?: string,
  ) {
    const user = (req as Request).user as { id: string };
    return this.topicsService.getProgress(user.id, examId, limit ? parseInt(limit) : 4);
  }

  // GET /subjects/:subjectId/topics (keep nested route working)
  @Get('subjects/:subjectId')
  findAll(
    @Req() req,
    @Param('subjectId') subjectId: string,
    @Query('examId') examId?: string,
  ) {
    const user = (req as Request).user as { id: string };
    return this.topicsService.findForSubject(user.id, subjectId, examId);
  }
}
