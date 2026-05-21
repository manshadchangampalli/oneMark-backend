import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateAdmin(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.isActive) return null;
    const valid = await bcrypt.compare(password, admin.password);
    return valid ? admin : null;
  }

  async getMe(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true, lastLoginAt: true, createdAt: true },
    });
    if (!admin) throw new UnauthorizedException('Admin not found');
    return admin;
  }

  async login(adminId: string, email: string, metadata?: { userAgent?: string; ipAddress?: string }) {
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { lastLoginAt: new Date() },
    });
    return this.issueTokens(adminId, email, metadata);
  }

  async refresh(adminId: string, email: string, rawRefreshToken: string) {
    const sessions = await this.prisma.adminSession.findMany({ where: { adminId } });

    let currentSession: typeof sessions[number] | undefined;
    for (const s of sessions) {
      if (await bcrypt.compare(rawRefreshToken, s.hashedRefreshToken)) {
        currentSession = s;
        break;
      }
    }

    if (!currentSession) throw new UnauthorizedException('Invalid refresh token');
    if (currentSession.expiresAt && currentSession.expiresAt < new Date()) {
      await this.prisma.adminSession.delete({ where: { id: currentSession.id } });
      throw new UnauthorizedException('Session expired');
    }

    return this.issueTokens(adminId, email, undefined, currentSession.id);
  }

  async logout(adminId: string, rawRefreshToken?: string) {
    if (!rawRefreshToken) return;
    const sessions = await this.prisma.adminSession.findMany({ where: { adminId } });
    for (const s of sessions) {
      if (await bcrypt.compare(rawRefreshToken, s.hashedRefreshToken)) {
        await this.prisma.adminSession.delete({ where: { id: s.id } });
        break;
      }
    }
  }

  private async issueTokens(
    adminId: string,
    email: string,
    metadata?: { userAgent?: string; ipAddress?: string },
    sessionId?: string,
  ) {
    const payload = { sub: adminId, email, kind: 'admin' as const };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow('JWT_ACCESS_EXPIRES_IN'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    if (sessionId) {
      await this.prisma.adminSession.update({
        where: { id: sessionId },
        data: { hashedRefreshToken, lastUsedAt: new Date(), expiresAt },
      });
    } else {
      await this.prisma.adminSession.create({
        data: {
          adminId,
          hashedRefreshToken,
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress,
          expiresAt,
        },
      });
    }

    return { accessToken, refreshToken };
  }
}
