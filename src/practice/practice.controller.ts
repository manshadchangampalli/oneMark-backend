import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamRequiredGuard } from '../common/guards/exam-required.guard';
import { PracticeService } from './practice.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@UseGuards(JwtAuthGuard)
@Controller('practice/sessions')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  // POST /practice/sessions — create a new session (draws questions from pool)
  @UseGuards(ExamRequiredGuard)
  @Post()
  createSession(@Req() req, @Body() dto: CreateSessionDto) {
    const user = (req as Request).user as { id: string };
    return this.practiceService.createSession(user.id, dto);
  }

  // GET /practice/sessions — list user's sessions (newest first)
  @Get()
  findSessions(
    @Req() req,
    @Query('limit')  limit = '20',
    @Query('cursor') cursor?: string,
  ) {
    const user = (req as Request).user as { id: string };
    return this.practiceService.findSessions(user.id, parseInt(limit, 10), cursor);
  }

  // GET /practice/sessions/:id — session state + all questions with myStatus
  @Get(':id')
  getSession(@Req() req, @Param('id') id: string) {
    const user = (req as Request).user as { id: string };
    return this.practiceService.getSession(user.id, id);
  }

  // POST /practice/sessions/:id/attempts — submit an answer
  @Post(':id/attempts')
  @HttpCode(HttpStatus.CREATED)
  submitAttempt(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    const user = (req as Request).user as { id: string };
    return this.practiceService.submitAttempt(user.id, id, dto);
  }

  // POST /practice/sessions/:id/finish — close the session and get summary
  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  finishSession(@Req() req, @Param('id') id: string) {
    const user = (req as Request).user as { id: string };
    return this.practiceService.finishSession(user.id, id);
  }
}
