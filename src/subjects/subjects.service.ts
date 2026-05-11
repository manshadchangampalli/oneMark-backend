import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly examsService: ExamsService,
  ) {}

  async findForExam(userId: string, examIdParam?: string) {
    const examId = await this.examsService.resolveExamId(userId, examIdParam);

    const rows = await this.prisma.subjectExam.findMany({
      where: { examId },
      include: {
        subject: {
          select: { id: true, code: true, label: true, short: true, colorHex: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return rows.map((r) => r.subject);
  }
}
