import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Req() req, @Body() dto: SignupDto, @Res({ passthrough: true }) res) {
    const metadata = {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    };
    const tokens = await this.authService.signup(dto, metadata);
    this.setRefreshCookie(res as Response, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req, @Res({ passthrough: true }) res) {
    const user = (req as Request).user as { id: string; email: string };
    const metadata = {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    };
    const tokens = await this.authService.login(user.id, user.email, metadata);
    this.setRefreshCookie(res as Response, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req, @Res({ passthrough: true }) res) {
    const user = (req as Request).user as { id: string; email: string; refreshToken: string };
    const tokens = await this.authService.refresh(user.id, user.email, user.refreshToken);
    this.setRefreshCookie(res as Response, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req, @Res({ passthrough: true }) res) {
    const user = (req as Request).user as { id: string };
    const refreshToken = req.cookies?.['refresh_token'];
    await this.authService.logout(user.id, refreshToken);
    (res as Response).clearCookie('refresh_token');
    return { message: 'Logged out' };
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req) {
    const user = (req as Request).user as { id: string };
    return this.authService.getMe(user.id);
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
