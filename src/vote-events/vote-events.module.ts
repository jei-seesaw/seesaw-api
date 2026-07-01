import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VoteEvent } from './vote-event.entity';
import { VoteEventsController } from './vote-events.controller';
import {
  MikroOrmVoteEventsRepository,
  VoteEventsRepository,
} from './vote-events.repository';
import { VoteEventsService } from './vote-events.service';

@Module({
  imports: [AuthModule, MikroOrmModule.forFeature([VoteEvent])],
  controllers: [VoteEventsController],
  providers: [
    VoteEventsService,
    { provide: VoteEventsRepository, useClass: MikroOrmVoteEventsRepository },
  ],
})
export class VoteEventsModule {}
