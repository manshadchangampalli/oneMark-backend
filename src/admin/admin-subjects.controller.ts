import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminSubjectsService } from './admin-subjects.service';

export class CreateSubjectDto {
  code:      string;
  label:     string;
  short:     string;
  colorHex:  string;
  sortOrder?: number;
}

export class UpdateSubjectDto {
  label?:     string;
  short?:     string;
  colorHex?:  string;
  sortOrder?: number;
}

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/subjects')
export class AdminSubjectsController {
  constructor(private readonly service: AdminSubjectsService) {}

  @Get()
  list(
    @Query('examId')          examId?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.service.list({ examId, includeArchived: includeArchived === 'true' });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  create(@Body() dto: CreateSubjectDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Post(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }
}
