import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AdminJwtPayload } from './admin-jwt.strategy';

@Injectable()
export class AdminJwtRefreshStrategy extends PassportStrategy(Strategy, 'admin-jwt-refresh') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['admin_refresh_token'] ?? null,
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: AdminJwtPayload) {
    if (payload.kind !== 'admin') throw new UnauthorizedException('Invalid token');
    const refreshToken = req.cookies?.['admin_refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');
    return { id: payload.sub, email: payload.email, refreshToken };
  }
}
