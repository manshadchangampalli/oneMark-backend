import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookmarksService } from './bookmarks.service';

export class AddBookmarkDto {
  questionId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  // GET /bookmarks?limit=&cursor=  → full rows for the bookmarks screen
  @Get()
  list(
    @Req() req,
    @Query('limit')  limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const user = (req as Request).user as { id: string };
    const parsed = limit ? parseInt(limit, 10) : 20;
    return this.bookmarks.list(user.id, Number.isFinite(parsed) ? parsed : 20, cursor);
  }

  // GET /bookmarks/ids  → just the question ids, for the client-side Set
  @Get('ids')
  listIds(@Req() req) {
    const user = (req as Request).user as { id: string };
    return this.bookmarks.listIds(user.id);
  }

  // POST /bookmarks  { questionId }  → idempotent add
  @Post()
  @HttpCode(HttpStatus.OK)
  add(@Req() req, @Body() dto: AddBookmarkDto) {
    const user = (req as Request).user as { id: string };
    return this.bookmarks.add(user.id, dto.questionId);
  }

  // DELETE /bookmarks/:questionId  → idempotent remove
  @Delete(':questionId')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req, @Param('questionId') questionId: string) {
    const user = (req as Request).user as { id: string };
    return this.bookmarks.remove(user.id, questionId);
  }
}
