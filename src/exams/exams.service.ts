import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { EnrolExamDto } from './dto/enrol-exam.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /exams — all exams (active first, then inactive); isActive included for frontend disabled state
  findAllActive() {
    return this.prisma.exam.findMany({
      select: { id: true, code: true, label: true, description: true, isActive: true },
      orderBy: [{ isActive: 'desc' }, { label: 'asc' }],
    });
  }

  // GET /me/exams — exams the user is enrolled in
  findUserExams(userId: string) {
    return this.prisma.userExam.findMany({
      where: { userId },
      include: { exam: { select: { id: true, code: true, label: true, description: true } } },
      orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'asc' }],
    });
  }

  // POST /me/exams — enrol in an exam
  async enrol(userId: string, dto: EnrolExamDto) {
    const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
    if (!exam || !exam.isActive) throw new NotFoundException('Exam not found');

    const existing = await this.prisma.userExam.findUnique({
      where: { userId_examId: { userId, examId: dto.examId } },
    });
    if (existing) throw new BadRequestException('Already enrolled in this exam');

    const totalExams = await this.prisma.userExam.count({ where: { userId } });
    const makePrimary = dto.isPrimary === true || totalExams === 0;

    return this.prisma.$transaction(async (tx) => {
      if (makePrimary) {
        await tx.userExam.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
      }
      return tx.userExam.create({
        data: { userId, examId: dto.examId, isPrimary: makePrimary },
        include: { exam: { select: { id: true, code: true, label: true } } },
      });
    });
  }

  // PATCH /me/exams/:examId — switch primary exam
  async setPrimary(userId: string, examId: string) {
    const enrolment = await this.prisma.userExam.findUnique({
      where: { userId_examId: { userId, examId } },
    });
    if (!enrolment) throw new NotFoundException('Not enrolled in this exam');
    if (enrolment.isPrimary) return enrolment;

    return this.prisma.$transaction(async (tx) => {
      await tx.userExam.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
      const updated = await tx.userExam.update({
        where: { userId_examId: { userId, examId } },
        data: { isPrimary: true },
        include: { exam: { select: { id: true, code: true, label: true } } },
      });
      // Keep user.targetExam in sync so /auth/me reflects the switch
      await tx.user.update({ where: { id: userId }, data: { targetExam: updated.exam.code } });
      return updated;
    });
  }

  // DELETE /me/exams/:examId — leave an exam
  async leave(userId: string, examId: string) {
    const enrolment = await this.prisma.userExam.findUnique({
      where: { userId_examId: { userId, examId } },
    });
    if (!enrolment) throw new NotFoundException('Not enrolled in this exam');

    const totalExams = await this.prisma.userExam.count({ where: { userId } });
    if (totalExams === 1) {
      throw new UnprocessableEntityException('Cannot leave your only exam. Enrol in another first.');
    }

    await this.prisma.userExam.delete({ where: { userId_examId: { userId, examId } } });

    if (enrolment.isPrimary) {
      const next = await this.prisma.userExam.findFirst({
        where: { userId },
        orderBy: { enrolledAt: 'asc' },
      });
      if (next) {
        await this.prisma.userExam.update({
          where: { userId_examId: { userId, examId: next.examId } },
          data: { isPrimary: true },
        });
      }
    }
  }

  // used by ExamRequiredGuard
  hasAnyExam(userId: string) {
    return this.prisma.userExam.count({ where: { userId } }).then((n) => n > 0);
  }

  // resolves examId for content APIs: explicit param > primary > error
  async resolveExamId(userId: string, examIdParam?: string): Promise<string> {
    if (examIdParam) {
      const enrolment = await this.prisma.userExam.findUnique({
        where: { userId_examId: { userId, examId: examIdParam } },
      });
      if (!enrolment) throw new BadRequestException('Not enrolled in the requested exam');
      return examIdParam;
    }

    const primary = await this.prisma.userExam.findFirst({
      where: { userId, isPrimary: true },
    });
    if (!primary) throw new UnprocessableEntityException({ code: 'EXAM_REQUIRED' });

    return primary.examId;
  }
}
