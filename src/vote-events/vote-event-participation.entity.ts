import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/decorators/legacy';
import { randomUUID } from 'node:crypto';
import { User } from '../users/user.entity';
import { VoteEvent } from './vote-event.entity';

@Entity({ tableName: 'vote_event_participations' })
export class VoteEventParticipation {
  @PrimaryKey({ type: 'string', length: 36 })
  id: string = randomUUID();

  @ManyToOne(() => VoteEvent, { fieldName: 'vote_event_id' })
  voteEvent: VoteEvent;

  @ManyToOne(() => User, { fieldName: 'user_id' })
  user: User;

  @Property({ type: Date, fieldName: 'created_at' })
  createdAt: Date = new Date();

  constructor(voteEvent: VoteEvent, user: User) {
    this.voteEvent = voteEvent;
    this.user = user;
  }
}
