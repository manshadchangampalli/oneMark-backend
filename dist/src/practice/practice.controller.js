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
exports.PracticeController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const exam_required_guard_1 = require("../common/guards/exam-required.guard");
const practice_service_1 = require("./practice.service");
const create_session_dto_1 = require("./dto/create-session.dto");
const submit_attempt_dto_1 = require("./dto/submit-attempt.dto");
let PracticeController = class PracticeController {
    practiceService;
    constructor(practiceService) {
        this.practiceService = practiceService;
    }
    createSession(req, dto) {
        const user = req.user;
        return this.practiceService.createSession(user.id, dto);
    }
    findSessions(req, limit = '20', cursor) {
        const user = req.user;
        return this.practiceService.findSessions(user.id, parseInt(limit, 10), cursor);
    }
    getSession(req, id) {
        const user = req.user;
        return this.practiceService.getSession(user.id, id);
    }
    submitAttempt(req, id, dto) {
        const user = req.user;
        return this.practiceService.submitAttempt(user.id, id, dto);
    }
    finishSession(req, id) {
        const user = req.user;
        return this.practiceService.finishSession(user.id, id);
    }
};
exports.PracticeController = PracticeController;
__decorate([
    (0, common_1.UseGuards)(exam_required_guard_1.ExamRequiredGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_session_dto_1.CreateSessionDto]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "findSessions", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "getSession", null);
__decorate([
    (0, common_1.Post)(':id/attempts'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, submit_attempt_dto_1.SubmitAttemptDto]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "submitAttempt", null);
__decorate([
    (0, common_1.Post)(':id/finish'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "finishSession", null);
exports.PracticeController = PracticeController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('practice/sessions'),
    __metadata("design:paramtypes", [practice_service_1.PracticeService])
], PracticeController);
//# sourceMappingURL=practice.controller.js.map