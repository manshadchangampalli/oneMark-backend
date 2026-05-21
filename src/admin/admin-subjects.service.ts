import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSubjectDto, UpdateSubjectDto } from './admin-subjects.controller';

@Injectable()
export class AdminSubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ examId, includeArchived }: { examId?: string; includeArchived: boolean }) {
    const rows = await this.prisma.subject.findMany({
      where: {
        ...(includeArchived ? {} : { archivedAt: null }),
        ...(examId ? { subjectExams: { some: { examId } } } : {}),
      },
      orderBy: [{ archivedAt: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
      select: {
        id: true, code: true, label: true, short: true, colorHex: true, sortOrder: true,
        archivedAt: true, createdAt: true,
        _count: { select: { topics: true, questions: true, subjectExams: true } },
      },
    });
    return rows.map(r => ({
      ...r,
      topics:    r._count.topics,
      questions: r._count.questions,
      exams:     r._count.subjectExams,
      _count:    undefined,
    }));
  }

  async detail(id: string) {
    const s = await this.prisma.subject.findUnique({
      where: { id },
      select: {
        id: true, code: true, label: true, short: true, colorHex: true, sortOrder: true,
        archivedAt: true, createdAt: true,
        _count: { select: { topics: true, questions: true, subjectExams: true } },
      },
    });
    if (!s) throw new NotFoundException('Subject not found');
    return { ...s, _count: undefined, counts: s._count };
  }

  async create(dto: CreateSubjectDto) {
    if (!dto.code?.trim() || !dto.label?.trim() || !dto.short?.trim() || !dto.colorHex?.trim()) {
      throw new BadRequestException('Code, label, short, and colorHex are required');
    }
    const existing = await this.prisma.subject.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Subject code already exists');

    return this.prisma.subject.create({
      data: {
        code:      dto.code.trim(),
        label:     dto.label.trim(),
        short:     dto.short.trim(),
        colorHex:  dto.colorHex.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const s = await this.prisma.subject.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Subject not found');

    return this.prisma.subject.update({
      where: { id },
      data: {
        ...(dto.label !== undefined     ? { label: dto.label.trim() } : {}),
        ...(dto.short !== undefined     ? { short: dto.short.trim() } : {}),
        ...(dto.colorHex !== undefined  ? { colorHex: dto.colorHex.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async archive(id: string) {
    const s = await this.prisma.subject.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Subject not found');
    return this.prisma.subject.update({ where: { id }, data: { archivedAt: new Date() } });
  }

  async unarchive(id: string) {
    const s = await this.prisma.subject.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Subject not found');
    return this.prisma.subject.update({ where: { id }, data: { archivedAt: null } });
  }
}
