import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamRequiredGuard } from '../common/guards/exam-required.guard';
import { DailyChallengeService } from './daily-challenge.service';
import { DailyAttemptDto } from './dto/submit-attempt.dto';

@UseGuards(JwtAuthGuard, ExamRequiredGuard)
@Controller('daily-challenge')
export class DailyChallengeController {
  constructor(private readonly dailyChallengeService: DailyChallengeService) {}

  // GET /daily-challenge?examId=
  // Returns today's question. Auto-creates the challenge if admin hasn't set one yet.
  // Before attempt: options shown, correct answer hidden.
  // After attempt:  correct option + official explanation revealed.
  @Get()
  getToday(@Req() req, @Query('examId') examId?: string) {
    const user = (req as Request).user as { id: string };
    return this.dailyChallengeService.getToday(user.id, examId);
  }

  // POST /daily-challenge/start
  // Records when the user first opens the question. Idempotent — startedAt never overwrites.
  @Post('start')
  @HttpCode(HttpStatus.OK)
  recordStart(@Req() req, @Query('examId') examId?: string) {
    const user = (req as Request).user as { id: string };
    return this.dailyChallengeService.recordStart(user.id, examId);
  }

  // POST /daily-challenge/attempt
  // One attempt per user per day. Returns 409 if already attempted.
  @Post('attempt')
  @HttpCode(HttpStatus.CREATED)
  submitAttempt(@Req() req, @Body() dto: DailyAttemptDto) {
    const user = (req as Request).user as { id: string };
    return this.dailyChallengeService.submitAttempt(user.id, dto);
  }

  // GET /daily-challenge/:id/top-solvers
  @Get(':id/top-solvers')
  topSolvers(
    @Req() req,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const user = (req as Request).user as { id: string };
    const parsed = limit ? parseInt(limit, 10) : 5;
    return this.dailyChallengeService.getTopSolvers(id, user.id, Number.isFinite(parsed) ? parsed : 5);
  }
}
