import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { VoteEventsModule } from '../vote-events/vote-events.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [AuthModule, UsersModule, VoteEventsModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
