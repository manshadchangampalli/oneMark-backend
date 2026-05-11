import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(req: any, dto: SignupDto, res: any): Promise<{
        accessToken: string;
    }>;
    login(req: any, res: any): Promise<{
        accessToken: string;
    }>;
    refresh(req: any, res: any): Promise<{
        accessToken: string;
    }>;
    logout(req: any, res: any): Promise<{
        message: string;
    }>;
    getMe(req: any): Promise<{
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
    private setRefreshCookie;
}
