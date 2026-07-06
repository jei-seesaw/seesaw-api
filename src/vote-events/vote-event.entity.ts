import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { randomUUID } from 'node:crypto';
import type { VoteEventCategory } from './dto/create-vote-event.dto';
import type { VoteEventSelectedOption } from './dto/vote-event-detail.dto';

@Entity({ tableName: 'vote_events' })
export class VoteEvent {
  @PrimaryKey({ type: 'string', length: 36 })
  id: string = randomUUID();

  @Property({ type: 'string', length: 20 })
  category: VoteEventCategory;

  @Property({ type: 'string', length: 120 })
  title: string;

  @Property({ type: 'string', length: 120, fieldName: 'option_a' })
  optionA: string;

  @Property({ type: 'string', length: 120, fieldName: 'option_b' })
  optionB: string;

  @Property({
    type: 'string',
    length: 2048,
    fieldName: 'option_a_image_url',
    nullable: true,
  })
  optionAImageUrl: string | null;

  @Property({
    type: 'string',
    length: 2048,
    fieldName: 'option_b_image_url',
    nullable: true,
  })
  optionBImageUrl: string | null;

  @Property({
    columnType: 'int',
    default: 0,
    fieldName: 'total_participant_count',
    type: 'number',
  })
  totalParticipantCount: number = 0;

  @Property({
    columnType: 'int',
    default: 0,
    fieldName: 'total_token_amount',
    type: 'number',
  })
  totalTokenAmount: number = 0;

  @Property({
    columnType: 'int',
    default: 0,
    fieldName: 'option_a_token_amount',
    type: 'number',
  })
  optionATokenAmount: number = 0;

  @Property({
    columnType: 'int',
    default: 0,
    fieldName: 'option_b_token_amount',
    type: 'number',
  })
  optionBTokenAmount: number = 0;

  @Property({
    columnType: 'int',
    default: 0,
    fieldName: 'option_a_participant_count',
    type: 'number',
  })
  optionAParticipantCount: number = 0;

  @Property({
    columnType: 'int',
    default: 0,
    fieldName: 'option_b_participant_count',
    type: 'number',
  })
  optionBParticipantCount: number = 0;

  @Property({ type: Date, fieldName: 'deadline_at' })
  deadlineAt: Date;

  @Property({
    type: 'string',
    length: 1,
    fieldName: 'betting_result_option',
    nullable: true,
  })
  bettingResultOption: VoteEventSelectedOption | null = null;

  @Property({
    type: Date,
    fieldName: 'betting_result_confirmed_at',
    nullable: true,
  })
  bettingResultConfirmedAt: Date | null = null;

  @Property({ type: Date, fieldName: 'created_at' })
  createdAt: Date;

  @Property({
    type: 'string',
    length: 36,
    fieldName: 'organizer_user_id',
    nullable: true,
  })
  organizerUserId: string | null;

  constructor(args: {
    category: VoteEventCategory;
    title: string;
    optionA: string;
    optionB: string;
    optionAImageUrl?: string | null;
    optionBImageUrl?: string | null;
    organizerUserId?: string | null;
    createdAt: Date;
    deadlineAt: Date;
  }) {
    this.category = args.category;
    this.title = args.title;
    this.optionA = args.optionA;
    this.optionB = args.optionB;
    this.optionAImageUrl = args.optionAImageUrl ?? null;
    this.optionBImageUrl = args.optionBImageUrl ?? null;
    this.createdAt = args.createdAt;
    this.deadlineAt = args.deadlineAt;
    this.organizerUserId = args.organizerUserId ?? null;
  }
}
