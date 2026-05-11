import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import type { JwtPayload } from './jwt.strategy';
declare const JwtRefreshStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtRefreshStrategy extends JwtRefreshStrategy_base {
    private readonly config;
    constructor(config: ConfigService);
    validate(req: Request, payload: JwtPayload): {
        id: string;
        email: string;
        refreshToken: any;
    };
}
export {};
