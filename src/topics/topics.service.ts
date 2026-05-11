import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';

@Injectable()
export class TopicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly examsService: ExamsService,
  ) {}

  async findForSubject(userId: string, subjectId: string, examIdParam?: string) {
    const examId = await this.examsService.resolveExamId(userId, examIdParam);

    // verify subject exists and belongs to this exam
    const subjectExam = await this.prisma.subjectExam.findUnique({
      where: { subjectId_examId: { subjectId, examId } },
    });
    if (!subjectExam) throw new NotFoundException('Subject not found in this exam');

    const rows = await this.prisma.topicExam.findMany({
      where: {
        examId,
        topic: { subjectId },
      },
      include: {
        topic: {
          select: { id: true, code: true, label: true, sortOrder: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return rows.map((r) => r.topic);
  }
}
