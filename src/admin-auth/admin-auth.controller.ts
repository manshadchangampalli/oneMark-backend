import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminJwtRefreshGuard } from './guards/admin-jwt-refresh.guard';
import { AdminLocalAuthGuard } from './guards/admin-local-auth.guard';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @UseGuards(AdminLocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req, @Res({ passthrough: true }) res) {
    const admin = (req as Request).user as { id: string; email: string };
    const metadata = { userAgent: req.get('user-agent'), ipAddress: req.ip };
    const tokens = await this.authService.login(admin.id, admin.email, metadata);
    this.setRefreshCookie(res as Response, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(AdminJwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req, @Res({ passthrough: true }) res) {
    const admin = (req as Request).user as { id: string; email: string; refreshToken: string };
    const tokens = await this.authService.refresh(admin.id, admin.email, admin.refreshToken);
    this.setRefreshCookie(res as Response, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req, @Res({ passthrough: true }) res) {
    const admin = (req as Request).user as { id: string };
    const refreshToken = req.cookies?.['admin_refresh_token'];
    await this.authService.logout(admin.id, refreshToken);
    (res as Response).clearCookie('admin_refresh_token');
    return { message: 'Logged out' };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    const admin = (req as Request).user as { id: string };
    return this.authService.getMe(admin.id);
  }

  private setRefreshCookie(res: Response, token: string) {
    const prod = process.env.NODE_ENV === 'production';
    res.cookie('admin_refresh_token', token, {
      httpOnly: true,
      secure: prod,
      sameSite: prod ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
