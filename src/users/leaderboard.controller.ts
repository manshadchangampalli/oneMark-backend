import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly users: UsersService) {}

  // GET /leaderboard?scope=exam|global&limit=10
  @Get()
  list(
    @Req() req,
    @Query('scope') scope?: 'exam' | 'global',
    @Query('limit') limit?: string,
  ) {
    const user = (req as Request).user as { id: string };
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.users.getLeaderboard(
      user.id,
      scope === 'global' ? 'global' : 'exam',
      Number.isFinite(parsedLimit) ? parsedLimit : 10,
    );
  }
}
