"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyChallengeModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const exams_module_1 = require("../exams/exams.module");
const daily_challenge_controller_1 = require("./daily-challenge.controller");
const daily_challenge_service_1 = require("./daily-challenge.service");
let DailyChallengeModule = class DailyChallengeModule {
};
exports.DailyChallengeModule = DailyChallengeModule;
exports.DailyChallengeModule = DailyChallengeModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, exams_module_1.ExamsModule],
        controllers: [daily_challenge_controller_1.DailyChallengeController],
        providers: [daily_challenge_service_1.DailyChallengeService],
        exports: [daily_challenge_service_1.DailyChallengeService],
    })
], DailyChallengeModule);
//# sourceMappingURL=daily-challenge.module.js.map