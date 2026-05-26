import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateExamDto, UpdateExamDto } from './admin-exams.controller';

@Injectable()
export class AdminExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ includeArchived }: { includeArchived: boolean }) {
    const rows = await this.prisma.exam.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: [{ archivedAt: 'asc' }, { isActive: 'desc' }, { label: 'asc' }],
      select: {
        id: true, code: true, label: true, description: true, isActive: true,
        archivedAt: true, createdAt: true,
        _count: { select: { userExams: true, subjectExams: true, topicExams: true } },
      },
    });
    return rows.map(r => ({
      ...r,
      users:    r._count.userExams,
      subjects: r._count.subjectExams,
      topics:   r._count.topicExams,
      _count:   undefined,
    }));
  }

  async detail(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      select: {
        id: true, code: true, label: true, description: true, isActive: true,
        archivedAt: true, createdAt: true,
        _count: { select: { userExams: true, subjectExams: true, topicExams: true, questionExams: true } },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return { ...exam, _count: undefined, counts: exam._count };
  }

  async create(dto: CreateExamDto) {
    if (!dto.code?.trim() || !dto.label?.trim()) {
      throw new BadRequestException('Code and label are required');
    }
    if (!dto.categoryId) {
      throw new BadRequestException('Category is required');
    }
    const [existing, category] = await Promise.all([
      this.prisma.exam.findUnique({ where: { code: dto.code } }),
      this.prisma.examCategory.findFirst({ where: { id: dto.categoryId, archivedAt: null } }),
    ]);
    if (existing) throw new ConflictException('Exam code already exists');
    if (!category) throw new BadRequestException('Category not found or archived');

    return this.prisma.exam.create({
      data: {
        code:        dto.code.trim(),
        label:       dto.label.trim(),
        categoryId:  dto.categoryId,
        tier:        dto.tier?.trim() || null,
        description: dto.description?.trim() || null,
        isActive:    dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateExamDto) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');

    return this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.label !== undefined       ? { label: dto.label.trim() } : {}),
        ...(dto.categoryId !== undefined  ? { categoryId: dto.categoryId } : {}),
        ...(dto.tier !== undefined        ? { tier: dto.tier?.trim() || null } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.isActive !== undefined    ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async archive(id: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');
    return this.prisma.exam.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });
  }

  async unarchive(id: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');
    return this.prisma.exam.update({
      where: { id },
      data: { archivedAt: null },
    });
  }
}
