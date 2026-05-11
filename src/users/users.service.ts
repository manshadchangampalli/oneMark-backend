import { Injectable } from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  }

  create(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }


  updateLastActive(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  // Session management
  findSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId },
    });
  }

  createSession(data: {
    userId: string;
    hashedRefreshToken: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt?: Date;
  }) {
    return this.prisma.userSession.create({ data });
  }

  updateSession(id: string, data: {
    hashedRefreshToken: string;
    lastUsedAt: Date;
    expiresAt?: Date;
  }) {
    return this.prisma.userSession.update({
      where: { id },
      data,
    });
  }

  deleteSession(id: string) {
    return this.prisma.userSession.delete({
      where: { id },
    });
  }
}
