import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamRequiredGuard } from '../common/guards/exam-required.guard';
import { SubjectsService } from './subjects.service';

@UseGuards(JwtAuthGuard, ExamRequiredGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  findAll(@Req() req, @Query('examId') examId?: string) {
    const user = (req as Request).user as { id: string };
    return this.subjectsService.findForExam(user.id, examId);
  }
}
