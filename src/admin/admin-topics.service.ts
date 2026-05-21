import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTopicDto, UpdateTopicDto } from './admin-topics.controller';

@Injectable()
export class AdminTopicsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ subjectId, includeArchived }: { subjectId?: string; includeArchived: boolean }) {
    const where: Record<string, unknown> = {};
    if (subjectId) where.subjectId = subjectId;
    if (!includeArchived) where.archivedAt = null;

    const rows = await this.prisma.topic.findMany({
      where,
      orderBy: [{ archivedAt: 'asc' }, { subjectId: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
      select: {
        id: true, code: true, label: true, sortOrder: true, questionCount: true,
        archivedAt: true, createdAt: true,
        subject: { select: { id: true, label: true, colorHex: true } },
        _count: { select: { questions: true, topicExams: true } },
      },
    });
    return rows.map(r => ({
      ...r,
      questions: r._count.questions,
      exams:     r._count.topicExams,
      _count:    undefined,
    }));
  }

  async detail(id: string) {
    const t = await this.prisma.topic.findUnique({
      where: { id },
      select: {
        id: true, code: true, label: true, sortOrder: true, questionCount: true,
        archivedAt: true, createdAt: true,
        subject: { select: { id: true, label: true, colorHex: true } },
        _count: { select: { questions: true, topicExams: true, userTopicStats: true } },
      },
    });
    if (!t) throw new NotFoundException('Topic not found');
    return { ...t, _count: undefined, counts: t._count };
  }

  async create(dto: CreateTopicDto) {
    if (!dto.subjectId || !dto.code?.trim() || !dto.label?.trim()) {
      throw new BadRequestException('subjectId, code, and label are required');
    }
    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject) throw new BadRequestException('Subject not found');

    const existing = await this.prisma.topic.findUnique({
      where: { subjectId_code: { subjectId: dto.subjectId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Topic code already exists for this subject');

    return this.prisma.topic.create({
      data: {
        subjectId: dto.subjectId,
        code:      dto.code.trim(),
        label:     dto.label.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateTopicDto) {
    const t = await this.prisma.topic.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Topic not found');

    return this.prisma.topic.update({
      where: { id },
      data: {
        ...(dto.label !== undefined     ? { label: dto.label.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async archive(id: string) {
    const t = await this.prisma.topic.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Topic not found');
    return this.prisma.topic.update({ where: { id }, data: { archivedAt: new Date() } });
  }

  async unarchive(id: string) {
    const t = await this.prisma.topic.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Topic not found');
    return this.prisma.topic.update({ where: { id }, data: { archivedAt: null } });
  }
}
