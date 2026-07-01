import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { VoteEventCategory } from './dto/create-vote-event.dto';
import type { VoteEventSelectedOption } from './dto/vote-event-detail.dto';
import { VoteEvent } from './vote-event.entity';

export interface VoteEventsSummary {
  completedVoteEventCount: number;
  ongoingVoteEventCount: number;
  participantCount: number;
}

export interface VoteEventsListCursor {
  deadlineAt: string;
  id: string;
  mainVoteId: string | null;
}

export interface ListVoteEventsOptions {
  cursor?: VoteEventsListCursor;
  limit: number;
  now: Date;
  userId?: string;
}

export interface GetVoteEventDetailOptions {
  id: string;
  now: Date;
  userId?: string;
}

export interface OngoingVoteEventRecord {
  category: VoteEventCategory;
  cursorDeadlineAt: string;
  id: string;
  isParticipated: boolean;
  optionA: string;
  optionAImageUrl: string | null;
  optionAParticipantCount: number;
  optionATokenAmount: number;
  optionB: string;
  optionBImageUrl: string | null;
  optionBParticipantCount: number;
  optionBTokenAmount: number;
  remainingSeconds: number;
  title: string;
  totalParticipantCount: number;
  totalTokenAmount: number;
}

export interface VoteEventDetailRecord extends OngoingVoteEventRecord {
  isCompleted: boolean;
  selectedOption: VoteEventSelectedOption | null;
}

export interface VoteEventParticipationChoiceRecord {
  selectedOption: VoteEventSelectedOption;
  tokenAmount: number;
  userId: string;
}

export interface OngoingVoteEventsPage {
  hasNext: boolean;
  items: OngoingVoteEventRecord[];
  mainVote: OngoingVoteEventRecord | null;
}

export interface CompletedVoteEventsPage {
  hasNext: boolean;
  items: OngoingVoteEventRecord[];
}

export abstract class VoteEventsRepository {
  abstract create(voteEvent: VoteEvent): Promise<VoteEvent>;
  abstract findDetail(
    options: GetVoteEventDetailOptions,
  ): Promise<VoteEventDetailRecord | null>;
  abstract findParticipationChoices(
    voteEventId: string,
  ): Promise<VoteEventParticipationChoiceRecord[]>;
  abstract getSummary(): Promise<VoteEventsSummary>;
  abstract listOngoing(
    options: ListVoteEventsOptions,
  ): Promise<OngoingVoteEventsPage>;
  abstract listCompleted(
    options: ListVoteEventsOptions,
  ): Promise<CompletedVoteEventsPage>;
}

@Injectable()
export class MikroOrmVoteEventsRepository implements VoteEventsRepository {
  constructor(
    @InjectRepository(VoteEvent)
    private readonly voteEvents: EntityRepository<VoteEvent>,
  ) {}

  async create(voteEvent: VoteEvent): Promise<VoteEvent> {
    const em = this.voteEvents.getEntityManager();

    await em.persist(voteEvent).flush();

    return voteEvent;
  }

  async findDetail(
    options: GetVoteEventDetailOptions,
  ): Promise<VoteEventDetailRecord | null> {
    const params = voteEventDetailParams(options);
    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<VoteEventDetailRow[]>(
        `select ${voteEventDetailSelect(options.userId)} from \`vote_events\` ve ${voteEventDetailJoin(options.userId)} where ve.\`id\` = ? limit 1`,
        params,
      );

    return rows[0] ? toVoteEventDetailRecord(rows[0]) : null;
  }

  async findParticipationChoices(
    voteEventId: string,
  ): Promise<VoteEventParticipationChoiceRecord[]> {
    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<VoteEventParticipationChoiceRow[]>(
        "select `user_id` as `userId`, `selected_option` as `selectedOption`, `token_amount` as `tokenAmount` from `vote_event_participations` where `vote_event_id` = ? and `selected_option` in ('A', 'B') order by `created_at` asc, `id` asc",
        [voteEventId],
      );

    return rows.map((row) => ({
      selectedOption: row.selectedOption,
      tokenAmount: Number(row.tokenAmount),
      userId: row.userId,
    }));
  }

  async getSummary(): Promise<VoteEventsSummary> {
    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<VoteEventsSummaryRow[]>(
        'select coalesce(sum(case when `deadline_at` > current_timestamp then 1 else 0 end), 0) as `ongoingVoteEventCount`, coalesce(sum(case when `deadline_at` <= current_timestamp then 1 else 0 end), 0) as `completedVoteEventCount`, coalesce(sum(`total_participant_count`), 0) as `participantCount` from `vote_events`',
      );
    const row = rows[0] ?? {
      completedVoteEventCount: 0,
      ongoingVoteEventCount: 0,
      participantCount: 0,
    };

    return {
      completedVoteEventCount: Number(row.completedVoteEventCount),
      ongoingVoteEventCount: Number(row.ongoingVoteEventCount),
      participantCount: Number(row.participantCount),
    };
  }

  async listOngoing(
    options: ListVoteEventsOptions,
  ): Promise<OngoingVoteEventsPage> {
    const mainVote = options.cursor
      ? null
      : await this.findMainOngoingVoteEvent(options);
    const excludedMainVoteId = options.cursor?.mainVoteId ?? mainVote?.id ?? null;
    const items = await this.findOngoingVoteEventPage(
      options,
      excludedMainVoteId,
    );

    return {
      hasNext: items.length > options.limit,
      items: items.slice(0, options.limit),
      mainVote,
    };
  }

  private async findMainOngoingVoteEvent(
    options: ListVoteEventsOptions,
  ): Promise<OngoingVoteEventRecord | null> {
    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<OngoingVoteEventRow[]>(
        `select ${voteEventListSelect(options.userId)} from \`vote_events\` ve where ve.\`deadline_at\` > ? order by ve.\`total_participant_count\` desc, ve.\`deadline_at\` asc, ve.\`id\` asc limit 1`,
        voteEventListParams(options.userId, options.now),
      );

    return rows[0] ? toOngoingVoteEventRecord(rows[0]) : null;
  }

  private async findOngoingVoteEventPage(
    options: ListVoteEventsOptions,
    excludedMainVoteId: string | null,
  ): Promise<OngoingVoteEventRecord[]> {
    const params = voteEventListParams(options.userId, options.now);
    const conditions = ['ve.`deadline_at` > ?'];

    if (excludedMainVoteId) {
      conditions.push('ve.`id` <> ?');
      params.push(excludedMainVoteId);
    }

    if (options.cursor) {
      conditions.push(
        '(ve.`deadline_at` > ? or (ve.`deadline_at` = ? and ve.`id` > ?))',
      );
      params.push(
        options.cursor.deadlineAt,
        options.cursor.deadlineAt,
        options.cursor.id,
      );
    }

    params.push(options.limit + 1);

    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<OngoingVoteEventRow[]>(
        `select ${voteEventListSelect(options.userId)} from \`vote_events\` ve where ${conditions.join(' and ')} order by ve.\`deadline_at\` asc, ve.\`id\` asc limit ?`,
        params,
      );

    return rows.map(toOngoingVoteEventRecord);
  }

  async listCompleted(
    options: ListVoteEventsOptions,
  ): Promise<CompletedVoteEventsPage> {
    const items = await this.findCompletedVoteEventPage(options);

    return {
      hasNext: items.length > options.limit,
      items: items.slice(0, options.limit),
    };
  }

  private async findCompletedVoteEventPage(
    options: ListVoteEventsOptions,
  ): Promise<OngoingVoteEventRecord[]> {
    const params = voteEventListParams(options.userId, options.now);
    const conditions = ['ve.`deadline_at` <= ?'];

    if (options.cursor) {
      conditions.push(
        '(ve.`deadline_at` < ? or (ve.`deadline_at` = ? and ve.`id` > ?))',
      );
      params.push(
        options.cursor.deadlineAt,
        options.cursor.deadlineAt,
        options.cursor.id,
      );
    }

    params.push(options.limit + 1);

    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<OngoingVoteEventRow[]>(
        `select ${voteEventListSelect(options.userId)} from \`vote_events\` ve where ${conditions.join(' and ')} order by ve.\`deadline_at\` desc, ve.\`id\` asc limit ?`,
        params,
      );

    return rows.map(toOngoingVoteEventRecord);
  }
}

interface VoteEventsSummaryRow {
  completedVoteEventCount: number | string;
  ongoingVoteEventCount: number | string;
  participantCount: number | string;
}

interface OngoingVoteEventRow {
  category: VoteEventCategory;
  cursorDeadlineAt: string;
  id: string;
  isParticipated: boolean | number | string;
  optionA: string;
  optionAImageUrl: string | null;
  optionAParticipantCount: number | string;
  optionATokenAmount: number | string;
  optionB: string;
  optionBImageUrl: string | null;
  optionBParticipantCount: number | string;
  optionBTokenAmount: number | string;
  remainingSeconds: number | string;
  title: string;
  totalParticipantCount: number | string;
  totalTokenAmount: number | string;
}

interface VoteEventDetailRow extends OngoingVoteEventRow {
  isCompleted: boolean | number | string;
  selectedOption: VoteEventSelectedOption | null;
}

interface VoteEventParticipationChoiceRow {
  selectedOption: VoteEventSelectedOption;
  tokenAmount: number | string;
  userId: string;
}

function voteEventDetailSelect(userId: string | undefined): string {
  const isParticipated = userId
    ? 'case when current_vep.`id` is null then 0 else 1 end'
    : '0';
  const selectedOption = userId ? 'current_vep.`selected_option`' : 'null';

  return [
    ...voteEventBaseSelect(),
    'case when ve.`deadline_at` <= ? then 1 else 0 end as `isCompleted`',
    'greatest(timestampdiff(second, ?, ve.`deadline_at`), 0) as `remainingSeconds`',
    `${isParticipated} as \`isParticipated\``,
    `${selectedOption} as \`selectedOption\``,
  ].join(', ');
}

function voteEventDetailJoin(userId: string | undefined): string {
  return userId
    ? 'left join `vote_event_participations` current_vep on current_vep.`vote_event_id` = ve.`id` and current_vep.`user_id` = ?'
    : '';
}

function voteEventDetailParams(
  options: GetVoteEventDetailOptions,
): unknown[] {
  return options.userId
    ? [options.now, options.now, options.userId, options.id]
    : [options.now, options.now, options.id];
}

function voteEventListSelect(userId: string | undefined): string {
  const isParticipated = userId
    ? 'case when exists (select 1 from `vote_event_participations` vep where vep.`vote_event_id` = ve.`id` and vep.`user_id` = ?) then 1 else 0 end'
    : '0';

  return [
    ...voteEventBaseSelect(),
    'greatest(timestampdiff(second, ?, ve.`deadline_at`), 0) as `remainingSeconds`',
    `${isParticipated} as \`isParticipated\``,
  ].join(', ');
}

function voteEventBaseSelect(): string[] {
  return [
    've.`id` as `id`',
    've.`category` as `category`',
    've.`title` as `title`',
    've.`option_a` as `optionA`',
    've.`option_b` as `optionB`',
    've.`option_a_image_url` as `optionAImageUrl`',
    've.`option_b_image_url` as `optionBImageUrl`',
    've.`option_a_participant_count` as `optionAParticipantCount`',
    've.`option_b_participant_count` as `optionBParticipantCount`',
    've.`option_a_token_amount` as `optionATokenAmount`',
    've.`option_b_token_amount` as `optionBTokenAmount`',
    've.`total_participant_count` as `totalParticipantCount`',
    've.`total_token_amount` as `totalTokenAmount`',
    "date_format(ve.`deadline_at`, '%Y-%m-%d %H:%i:%s') as `cursorDeadlineAt`",
  ];
}

function voteEventListParams(userId: string | undefined, now: Date): unknown[] {
  return userId ? [now, userId, now] : [now, now];
}

function toOngoingVoteEventRecord(
  row: OngoingVoteEventRow,
): OngoingVoteEventRecord {
  return {
    category: row.category,
    cursorDeadlineAt: row.cursorDeadlineAt,
    id: row.id,
    isParticipated: row.isParticipated === true || Number(row.isParticipated) === 1,
    optionA: row.optionA,
    optionAImageUrl: row.optionAImageUrl,
    optionAParticipantCount: Number(row.optionAParticipantCount),
    optionATokenAmount: Number(row.optionATokenAmount),
    optionB: row.optionB,
    optionBImageUrl: row.optionBImageUrl,
    optionBParticipantCount: Number(row.optionBParticipantCount),
    optionBTokenAmount: Number(row.optionBTokenAmount),
    remainingSeconds: Number(row.remainingSeconds),
    title: row.title,
    totalParticipantCount: Number(row.totalParticipantCount),
    totalTokenAmount: Number(row.totalTokenAmount),
  };
}

function toVoteEventDetailRecord(
  row: VoteEventDetailRow,
): VoteEventDetailRecord {
  return {
    ...toOngoingVoteEventRecord(row),
    isCompleted: row.isCompleted === true || Number(row.isCompleted) === 1,
    selectedOption: row.selectedOption,
  };
}
