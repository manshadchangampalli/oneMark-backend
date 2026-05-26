import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminExamsService } from './admin-exams.service';

export class CreateExamDto {
  code:        string;
  label:       string;
  categoryId:  string;        // required — every exam belongs to one category
  tier?:       string;        // optional — '10th Level' | '+2 Level' | 'Degree Level' | null
  description?: string;
  isActive?:   boolean;
}

export class UpdateExamDto {
  label?:       string;
  categoryId?:  string;
  tier?:        string | null;
  description?: string;
  isActive?:    boolean;
}

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/exams')
export class AdminExamsController {
  constructor(private readonly service: AdminExamsService) {}

  @Get()
  list(@Query('includeArchived') includeArchived?: string) {
    return this.service.list({ includeArchived: includeArchived === 'true' });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  create(@Body() dto: CreateExamDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
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
