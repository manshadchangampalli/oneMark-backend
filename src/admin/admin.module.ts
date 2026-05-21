import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminQuestionsController } from './admin-questions.controller';
import { AdminQuestionsService } from './admin-questions.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminExamsController } from './admin-exams.controller';
import { AdminExamsService } from './admin-exams.service';
import { AdminSubjectsController } from './admin-subjects.controller';
import { AdminSubjectsService } from './admin-subjects.service';
import { AdminTopicsController } from './admin-topics.controller';
import { AdminTopicsService } from './admin-topics.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminQuestionsController,
    AdminUsersController,
    AdminExamsController,
    AdminSubjectsController,
    AdminTopicsController,
  ],
  providers: [
    AdminQuestionsService,
    AdminUsersService,
    AdminExamsService,
    AdminSubjectsService,
    AdminTopicsService,
  ],
})
export class AdminModule {}
