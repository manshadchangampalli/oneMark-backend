import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.password) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  async getMe(userId: string) {
    return this.users.findById(userId);
  }

  async signup(dto: SignupDto, metadata?: { userAgent?: string; ipAddress?: string }) {
    console.log("🚀 ~ AuthService ~ signup ~ dto:", dto)
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);
    const avatarInitial = dto.name.trim()[0].toUpperCase();

    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      password: hashed,
      avatarInitial,
      school: dto.school,
      grade: dto.grade,
      targetExam: dto.targetExam,
      state: dto.state,
      district: dto.district,
    });

    return this.issueTokens(user.id, user.email!, metadata);
  }

  async login(userId: string, email: string, metadata?: { userAgent?: string; ipAddress?: string }) {
    return this.issueTokens(userId, email, metadata);
  }
  async refresh(userId: string, email: string, rawRefreshToken: string) {
    // Find the session matching the current refresh token
    const sessions = await this.users.findSessions(userId);
    const sessionMatches = await Promise.all(
      sessions.map(async (s) => ({
        session: s,
        isMatch: await bcrypt.compare(rawRefreshToken, s.hashedRefreshToken),
      })),
    );

    const currentSession = sessionMatches.find((m) => m.isMatch)?.session;

    if (!currentSession) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if session has expired
    if (currentSession.expiresAt && currentSession.expiresAt < new Date()) {
      await this.users.deleteSession(currentSession.id);
      throw new UnauthorizedException('Session expired');
    }

    // Issue new tokens and update this specific session
    return this.issueTokens(userId, email, undefined, currentSession.id);
  }

  async logout(userId: string, rawRefreshToken?: string) {
    if (!rawRefreshToken) return;

    const sessions = await this.users.findSessions(userId);
    for (const session of sessions) {
      const isMatch = await bcrypt.compare(rawRefreshToken, session.hashedRefreshToken);
      if (isMatch) {
        await this.users.deleteSession(session.id);
        break;
      }
    }
  }

  private async issueTokens(
    userId: string,
    email: string,
    metadata?: { userAgent?: string; ipAddress?: string },
    sessionId?: string,
  ) {
    const payload = { sub: userId, email };

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
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    if (sessionId) {
      // Update existing session (refresh)
      await this.users.updateSession(sessionId, {
        hashedRefreshToken,
        lastUsedAt: new Date(),
        expiresAt,
      });
    } else {
      // Create new session (login/signup)
      await this.users.createSession({
        userId,
        hashedRefreshToken,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        expiresAt,
      });
    }

    return { accessToken, refreshToken };
  }
}
