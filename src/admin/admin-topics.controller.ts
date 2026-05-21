import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminTopicsService } from './admin-topics.service';

export class CreateTopicDto {
  subjectId:  string;
  code:       string;
  label:      string;
  sortOrder?: number;
}

export class UpdateTopicDto {
  label?:     string;
  sortOrder?: number;
}

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/topics')
export class AdminTopicsController {
  constructor(private readonly service: AdminTopicsService) {}

  @Get()
  list(
    @Query('subjectId')        subjectId?: string,
    @Query('includeArchived')  includeArchived?: string,
  ) {
    return this.service.list({
      subjectId,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  create(@Body() dto: CreateTopicDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
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
