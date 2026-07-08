import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VoteEventsModule } from '../vote-events/vote-events.module';
import { ChatMessage } from './chat-message.entity';
import {
  ChatMessagesRepository,
  MikroOrmChatMessagesRepository,
} from './chat-messages.repository';
import { ChatsController } from './chats.controller';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';

@Module({
  imports: [AuthModule, VoteEventsModule, MikroOrmModule.forFeature([ChatMessage])],
  controllers: [ChatsController],
  providers: [
    ChatsGateway,
    ChatsService,
    { provide: ChatMessagesRepository, useClass: MikroOrmChatMessagesRepository },
  ],
})
export class ChatsModule {}
