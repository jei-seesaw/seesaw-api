import {
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { randomUUID } from 'node:crypto';
import { User } from '../users/user.entity';
import { VoteEvent } from '../vote-events/vote-event.entity';

@Entity({ tableName: 'vote_event_chat_messages' })
@Unique({
  name: 'vote_event_chat_messages_user_client_unique',
  properties: ['user', 'clientMessageId'],
})
@Index({
  name: 'vote_event_chat_messages_vote_event_created_id_index',
  properties: ['voteEvent', 'createdAt', 'id'],
})
export class ChatMessage {
  @PrimaryKey({ type: 'string', length: 36 })
  id: string = randomUUID();

  @ManyToOne(() => VoteEvent, {
    deleteRule: 'cascade',
    fieldName: 'vote_event_id',
  })
  voteEvent: VoteEvent;

  @ManyToOne(() => User, {
    deleteRule: 'cascade',
    fieldName: 'user_id',
  })
  user: User;

  @Property({ type: 'string', length: 36, fieldName: 'client_message_id' })
  clientMessageId: string;

  @Property({ type: 'string', length: 500 })
  content: string;

  @Property({ type: Date, fieldName: 'created_at' })
  createdAt: Date;

  constructor(
    voteEvent: VoteEvent,
    user: User,
    args: {
      clientMessageId: string;
      content: string;
      createdAt: Date;
    },
  ) {
    this.voteEvent = voteEvent;
    this.user = user;
    this.clientMessageId = args.clientMessageId;
    this.content = args.content;
    this.createdAt = args.createdAt;
  }
}
