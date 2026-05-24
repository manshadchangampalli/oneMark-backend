import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminQuestionsService, type CreateQuestionInput, type BulkRowInput } from './admin-questions.service';

export class CreateQuestionDto implements CreateQuestionInput {
  subjectId:           string;
  topicId:             string;
  examIds:             string[];
  difficulty:          'easy' | 'medium' | 'hard';
  type?:               'mcq';
  status?:             'draft' | 'published';
  xpReward?:           number;
  prompt:              string;
  options:             { label: string; text: string; sub?: string | null }[];
  correctOptionLabel:  string;
  officialExplanation?: { steps: string[] } | null;
}

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/questions')
export class AdminQuestionsController {
  constructor(private readonly service: AdminQuestionsService) {}

  // GET /admin/questions?subjectId=&topicId=&status=&difficulty=&search=&limit=&cursor=
  @Get()
  list(
    @Query('subjectId')  subjectId?:  string,
    @Query('topicId')    topicId?:    string,
    @Query('status')     status?:     'draft' | 'published' | 'archived',
    @Query('difficulty') difficulty?: 'easy' | 'medium' | 'hard',
    @Query('search')     search?:     string,
    @Query('limit')      limit = '20',
    @Query('cursor')     cursor?:     string,
  ) {
    return this.service.list({
      subjectId, topicId, status, difficulty, search,
      limit: parseInt(limit, 10),
      cursor,
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  create(@Req() req, @Body() dto: CreateQuestionDto) {
    const admin = (req as Request).user as { id: string };
    return this.service.create(admin.id, dto);
  }

  // POST /admin/questions/bulk  { questions: BulkRowInput[] }
  @Post('bulk')
  bulkCreate(@Req() req, @Body() body: { questions: BulkRowInput[] }) {
    const admin = (req as Request).user as { id: string };
    return this.service.bulkCreate(admin.id, body?.questions ?? []);
  }
}
