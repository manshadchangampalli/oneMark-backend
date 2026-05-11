"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyChallengeController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const exam_required_guard_1 = require("../common/guards/exam-required.guard");
const daily_challenge_service_1 = require("./daily-challenge.service");
const submit_attempt_dto_1 = require("./dto/submit-attempt.dto");
let DailyChallengeController = class DailyChallengeController {
    dailyChallengeService;
    constructor(dailyChallengeService) {
        this.dailyChallengeService = dailyChallengeService;
    }
    getToday(req, examId) {
        const user = req.user;
        return this.dailyChallengeService.getToday(user.id, examId);
    }
    submitAttempt(req, dto) {
        const user = req.user;
        return this.dailyChallengeService.submitAttempt(user.id, dto);
    }
};
exports.DailyChallengeController = DailyChallengeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('examId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DailyChallengeController.prototype, "getToday", null);
__decorate([
    (0, common_1.Post)('attempt'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, submit_attempt_dto_1.DailyAttemptDto]),
    __metadata("design:returntype", void 0)
], DailyChallengeController.prototype, "submitAttempt", null);
exports.DailyChallengeController = DailyChallengeController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, exam_required_guard_1.ExamRequiredGuard),
    (0, common_1.Controller)('daily-challenge'),
    __metadata("design:paramtypes", [daily_challenge_service_1.DailyChallengeService])
], DailyChallengeController);
//# sourceMappingURL=daily-challenge.controller.js.map