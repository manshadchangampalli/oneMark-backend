import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
declare const LocalStrategy_base: new (...args: [] | [options: import("passport-local").IStrategyOptionsWithRequest] | [options: import("passport-local").IStrategyOptions]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class LocalStrategy extends LocalStrategy_base {
    private readonly authService;
    constructor(authService: AuthService);
    validate(email: string, password: string): Promise<{
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
    }>;
}
export {};
