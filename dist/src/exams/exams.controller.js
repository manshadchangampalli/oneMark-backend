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
exports.MyExamsController = exports.ExamsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const enrol_exam_dto_1 = require("./dto/enrol-exam.dto");
const exams_service_1 = require("./exams.service");
let ExamsController = class ExamsController {
    examsService;
    constructor(examsService) {
        this.examsService = examsService;
    }
    findAll() {
        return this.examsService.findAllActive();
    }
};
exports.ExamsController = ExamsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExamsController.prototype, "findAll", null);
exports.ExamsController = ExamsController = __decorate([
    (0, common_1.Controller)('exams'),
    __metadata("design:paramtypes", [exams_service_1.ExamsService])
], ExamsController);
let MyExamsController = class MyExamsController {
    examsService;
    constructor(examsService) {
        this.examsService = examsService;
    }
    findMine(req) {
        const user = req.user;
        return this.examsService.findUserExams(user.id);
    }
    enrol(req, dto) {
        const user = req.user;
        return this.examsService.enrol(user.id, dto);
    }
    setPrimary(req, examId) {
        const user = req.user;
        return this.examsService.setPrimary(user.id, examId);
    }
    leave(req, examId) {
        const user = req.user;
        return this.examsService.leave(user.id, examId);
    }
};
exports.MyExamsController = MyExamsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MyExamsController.prototype, "findMine", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, enrol_exam_dto_1.EnrolExamDto]),
    __metadata("design:returntype", void 0)
], MyExamsController.prototype, "enrol", null);
__decorate([
    (0, common_1.Patch)(':examId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('examId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MyExamsController.prototype, "setPrimary", null);
__decorate([
    (0, common_1.Delete)(':examId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('examId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MyExamsController.prototype, "leave", null);
exports.MyExamsController = MyExamsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('me/exams'),
    __metadata("design:paramtypes", [exams_service_1.ExamsService])
], MyExamsController);
//# sourceMappingURL=exams.controller.js.map