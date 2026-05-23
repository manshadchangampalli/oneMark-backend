import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { LeaderboardController } from './leaderboard.controller';
import { StreakService } from './streak.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController, LeaderboardController],
  providers: [UsersService, StreakService],
  exports: [UsersService, StreakService],
})
export class UsersModule {}
