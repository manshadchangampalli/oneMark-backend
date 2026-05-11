import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import type { SignupDto } from './dto/signup.dto';
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    private readonly config;
    constructor(users: UsersService, jwt: JwtService, config: ConfigService);
    validateUser(email: string, password: string): Promise<{
        id: string;
        email: string | null;
        name: string;
        password: string | null;
        avatarInitial: string | null;
        avatarTone: import("src/generated/prisma").$Enums.AvatarTone;
        school: string | null;
        grade: string | null;
        targetExam: string | null;
        lastActiveAt: Date | null;
        emailVerifiedAt: Date | null;
        role: import("src/generated/prisma").$Enums.UserRole;
        isSuspended: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    getMe(userId: string): Promise<{
        id: string;
        email: string | null;
        name: string;
        password: string | null;
        avatarInitial: string | null;
        avatarTone: import("src/generated/prisma").$Enums.AvatarTone;
        school: string | null;
        grade: string | null;
        targetExam: string | null;
        lastActiveAt: Date | null;
        emailVerifiedAt: Date | null;
        role: import("src/generated/prisma").$Enums.UserRole;
        isSuspended: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    signup(dto: SignupDto, metadata?: {
        userAgent?: string;
        ipAddress?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    login(userId: string, email: string, metadata?: {
        userAgent?: string;
        ipAddress?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(userId: string, email: string, rawRefreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, rawRefreshToken?: string): Promise<void>;
    private issueTokens;
}
