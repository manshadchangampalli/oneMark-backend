import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnrolExamDto } from './dto/enrol-exam.dto';
import { ExamsService } from './exams.service';

// GET /exams — public
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  findAll() {
    return this.examsService.findAllActive();
  }
}

// /me/exams — all require auth
@UseGuards(JwtAuthGuard)
@Controller('me/exams')
export class MyExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  findMine(@Req() req) {
    const user = (req as Request).user as { id: string };
    return this.examsService.findUserExams(user.id);
  }

  @Post()
  enrol(@Req() req, @Body() dto: EnrolExamDto) {
    const user = (req as Request).user as { id: string };
    return this.examsService.enrol(user.id, dto);
  }

  @Patch(':examId')
  @HttpCode(HttpStatus.OK)
  setPrimary(@Req() req, @Param('examId') examId: string) {
    const user = (req as Request).user as { id: string };
    return this.examsService.setPrimary(user.id, examId);
  }

  @Delete(':examId')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@Req() req, @Param('examId') examId: string) {
    const user = (req as Request).user as { id: string };
    return this.examsService.leave(user.id, examId);
  }
}
