import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamsController, MyExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExamsController, MyExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
