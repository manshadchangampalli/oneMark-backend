"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    users;
    jwt;
    config;
    constructor(users, jwt, config) {
        this.users = users;
        this.jwt = jwt;
        this.config = config;
    }
    async validateUser(email, password) {
        const user = await this.users.findByEmail(email);
        if (!user || !user.password)
            return null;
        const valid = await bcrypt.compare(password, user.password);
        return valid ? user : null;
    }
    async getMe(userId) {
        return this.users.findById(userId);
    }
    async signup(dto, metadata) {
        const existing = await this.users.findByEmail(dto.email);
        if (existing)
            throw new common_1.ConflictException('Email already in use');
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
        return this.issueTokens(user.id, user.email, metadata);
    }
    async login(userId, email, metadata) {
        return this.issueTokens(userId, email, metadata);
    }
    async refresh(userId, email, rawRefreshToken) {
        const sessions = await this.users.findSessions(userId);
        const sessionMatches = await Promise.all(sessions.map(async (s) => ({
            session: s,
            isMatch: await bcrypt.compare(rawRefreshToken, s.hashedRefreshToken),
        })));
        const currentSession = sessionMatches.find((m) => m.isMatch)?.session;
        if (!currentSession) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (currentSession.expiresAt && currentSession.expiresAt < new Date()) {
            await this.users.deleteSession(currentSession.id);
            throw new common_1.UnauthorizedException('Session expired');
        }
        return this.issueTokens(userId, email, undefined, currentSession.id);
    }
    async logout(userId, rawRefreshToken) {
        if (!rawRefreshToken)
            return;
        const sessions = await this.users.findSessions(userId);
        for (const session of sessions) {
            const isMatch = await bcrypt.compare(rawRefreshToken, session.hashedRefreshToken);
            if (isMatch) {
                await this.users.deleteSession(session.id);
                break;
            }
        }
    }
    async issueTokens(userId, email, metadata, sessionId) {
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
        expiresAt.setDate(expiresAt.getDate() + 30);
        if (sessionId) {
            await this.users.updateSession(sessionId, {
                hashedRefreshToken,
                lastUsedAt: new Date(),
                expiresAt,
            });
        }
        else {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map