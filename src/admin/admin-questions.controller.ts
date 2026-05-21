import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminQuestionsService } from './admin-questions.service';

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
}
