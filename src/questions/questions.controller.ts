import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamRequiredGuard } from '../common/guards/exam-required.guard';
import { QuestionsService } from './questions.service';

@UseGuards(JwtAuthGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  // GET /questions/:id — no exam scoping; any enrolled user can view any question
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const user = (req as Request).user as { id: string };
    return this.questionsService.findOne(user.id, id);
  }

  // GET /questions?subjectId=&topicId=&difficulty=&examId=&limit=&cursor=
  // ExamRequiredGuard ensures the user has at least one exam
  @UseGuards(ExamRequiredGuard)
  @Get()
  findMany(
    @Req() req,
    @Query('examId')     examId?: string,
    @Query('subjectId')  subjectId?: string,
    @Query('topicId')    topicId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('limit')      limit = '20',
    @Query('cursor')     cursor?: string,
  ) {
    const user = (req as Request).user as { id: string };
    return this.questionsService.findMany(
      user.id,
      examId,
      subjectId,
      topicId,
      difficulty,
      parseInt(limit, 10),
      cursor,
    );
  }
}
