import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/decorators/legacy';
import { randomUUID } from 'node:crypto';
import { User } from '../users/user.entity';
import type { VoteEventSelectedOption } from './dto/vote-event-detail.dto';
import { VoteEvent } from './vote-event.entity';

@Entity({ tableName: 'vote_event_participations' })
export class VoteEventParticipation {
  @PrimaryKey({ type: 'string', length: 36 })
  id: string = randomUUID();

  @ManyToOne(() => VoteEvent, { fieldName: 'vote_event_id' })
  voteEvent: VoteEvent;

  @ManyToOne(() => User, { fieldName: 'user_id' })
  user: User;

  @Property({
    type: 'string',
    length: 1,
    fieldName: 'selected_option',
    nullable: true,
  })
  selectedOption: VoteEventSelectedOption | null = null;

  @Property({
    columnType: 'int',
    default: 0,
    fieldName: 'token_amount',
    type: 'number',
  })
  tokenAmount: number = 0;

  @Property({ type: Date, fieldName: 'created_at' })
  createdAt: Date = new Date();

  constructor(
    voteEvent: VoteEvent,
    user: User,
    args: {
      selectedOption?: VoteEventSelectedOption | null;
      tokenAmount?: number;
    } = {},
  ) {
    this.voteEvent = voteEvent;
    this.user = user;
    this.selectedOption = args.selectedOption ?? null;
    this.tokenAmount = args.tokenAmount ?? 0;
  }
}
