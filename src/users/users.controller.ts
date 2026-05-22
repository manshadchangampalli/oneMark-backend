import { Body, Controller, Get, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

export class UpdateMeDto {
  name?: string;
  school?: string | null;
  grade?: string | null;
}

@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) { }

  @Patch()
  update(@Req() req, @Body() dto: UpdateMeDto) {
    const user = (req as Request).user as { id: string };
    return this.users.updateProfile(user.id, dto);
  }

  @Get('stats')
  stats(@Req() req) {
    const user = (req as Request).user as { id: string };
    return this.users.getStats(user.id);
  }

  @Get('activity')
  activity(@Req() req, @Query('days') days?: string) {
    const user = (req as Request).user as { id: string };
    const parsed = days ? parseInt(days, 10) : 365;
    return this.users.getActivity(user.id, Number.isFinite(parsed) ? parsed : 365);
  }

  @Get('progress')
  progress(@Req() req) {
    const user = (req as Request).user as { id: string };
    return this.users.getProgress(user.id);
  }
}
