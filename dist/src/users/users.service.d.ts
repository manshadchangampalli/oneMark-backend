import { PrismaService } from '../prisma/prisma.service';
type CreateUserData = {
    email: string;
    name: string;
    password: string;
    avatarInitial?: string;
    school?: string;
    grade?: string;
    targetExam?: string;
    state?: string;
    district?: string;
};
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): import("src/generated/prisma").Prisma.Prisma__UserClient<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        email: string | null;
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
    } | null, null, import("src/generated/prisma/runtime/client").DefaultArgs, import("src/generated/prisma").Prisma.PrismaClientOptions>;
    findById(id: string): import("src/generated/prisma").Prisma.Prisma__UserClient<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        email: string | null;
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
    } | null, null, import("src/generated/prisma/runtime/client").DefaultArgs, import("src/generated/prisma").Prisma.PrismaClientOptions>;
    create(data: CreateUserData): import("src/generated/prisma").Prisma.Prisma__UserClient<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        email: string | null;
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
    }, never, import("src/generated/prisma/runtime/client").DefaultArgs, import("src/generated/prisma").Prisma.PrismaClientOptions>;
    updateLastActive(id: string): import("src/generated/prisma").Prisma.Prisma__UserClient<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        email: string | null;
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
    }, never, import("src/generated/prisma/runtime/client").DefaultArgs, import("src/generated/prisma").Prisma.PrismaClientOptions>;
    findSessions(userId: string): import("src/generated/prisma").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        userId: string;
        hashedRefreshToken: string;
        userAgent: string | null;
        ipAddress: string | null;
        lastUsedAt: Date;
        expiresAt: Date | null;
    }[]>;
    createSession(data: {
        userId: string;
        hashedRefreshToken: string;
        userAgent?: string;
        ipAddress?: string;
        expiresAt?: Date;
    }): import("src/generated/prisma").Prisma.Prisma__UserSessionClient<{
        id: string;
        createdAt: Date;
        userId: string;
        hashedRefreshToken: string;
        userAgent: string | null;
        ipAddress: string | null;
        lastUsedAt: Date;
        expiresAt: Date | null;
    }, never, import("src/generated/prisma/runtime/client").DefaultArgs, import("src/generated/prisma").Prisma.PrismaClientOptions>;
    updateSession(id: string, data: {
        hashedRefreshToken: string;
        lastUsedAt: Date;
        expiresAt?: Date;
    }): import("src/generated/prisma").Prisma.Prisma__UserSessionClient<{
        id: string;
        createdAt: Date;
        userId: string;
        hashedRefreshToken: string;
        userAgent: string | null;
        ipAddress: string | null;
        lastUsedAt: Date;
        expiresAt: Date | null;
    }, never, import("src/generated/prisma/runtime/client").DefaultArgs, import("src/generated/prisma").Prisma.PrismaClientOptions>;
    deleteSession(id: string): import("src/generated/prisma").Prisma.Prisma__UserSessionClient<{
        id: string;
        createdAt: Date;
        userId: string;
        hashedRefreshToken: string;
        userAgent: string | null;
        ipAddress: string | null;
        lastUsedAt: Date;
        expiresAt: Date | null;
    }, never, import("src/generated/prisma/runtime/client").DefaultArgs, import("src/generated/prisma").Prisma.PrismaClientOptions>;
}
export {};
