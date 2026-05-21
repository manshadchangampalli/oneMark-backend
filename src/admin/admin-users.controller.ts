import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminUsersService } from './admin-users.service';

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  // GET /admin/users?search=&suspended=&limit=&cursor=
  @Get()
  list(
    @Query('search')    search?:    string,
    @Query('suspended') suspended?: string,
    @Query('limit')     limit = '20',
    @Query('cursor')    cursor?:    string,
  ) {
    return this.service.list({
      search,
      suspended: suspended === undefined ? undefined : suspended === 'true',
      limit: parseInt(limit, 10),
      cursor,
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
