import { raw } from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';
import type { VoteEventListSort } from './dto/list-vote-events.dto';
import { VoteEventParticipation } from './vote-event-participation.entity';
import { VoteEvent } from './vote-event.entity';
import {
  InsufficientVoteTokenException,
  VoteEventAlreadyParticipatedException,
  VoteEventClosedException,
} from './vote-events.exceptions';
import { VoteEventsRepository } from './vote-events.repository.types';
import type {
  CompletedVoteEventsPage,
  GetVoteEventDetailOptions,
  ListUserVoteEventsOptions,
  ListVoteEventsOptions,
  OngoingVoteEventRecord,
  OngoingVoteEventsPage,
  ParticipateInVoteEventOptions,
  UserVoteEventRecord,
  UserVoteEventsPage,
  VoteEventDetailRecord,
  VoteEventParticipationChoiceRecord,
  VoteEventsSummary,
} from './vote-events.repository.types';
import {
  isDuplicateKeyError,
  toOngoingVoteEventRecord,
  toUserVoteEventRecord,
  toVoteEventDetailRecord,
  userVoteEventListParams,
  userVoteEventListSelect,
  voteEventAggregateUpdate,
  voteEventDetailJoin,
  voteEventDetailParams,
  voteEventDetailSelect,
  voteEventListParams,
  voteEventListSelect,
} from './vote-events.repository.sql';
import type {
  OngoingVoteEventRow,
  VoteEventDetailRow,
  VoteEventParticipationChoiceRow,
  VoteEventsSummaryRow,
  UserVoteEventRow,
} from './vote-events.repository.sql';

export { VoteEventsRepository } from './vote-events.repository.types';
export type * from './vote-events.repository.types';

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

  async participate(options: ParticipateInVoteEventOptions): Promise<void> {
    const em = this.voteEvents.getEntityManager();

    await em.transactional(async (tx) => {
      const tokenAmount = options.category === 'betting' ? options.tokenAmount : 0;

      if (tokenAmount > 0) {
        const updatedUserCount = await tx.nativeUpdate(
          User,
          { id: options.userId, voteToken: { $gte: tokenAmount } },
          { voteToken: raw<number>('`vote_token` - ?', [tokenAmount]) },
        );

        if (updatedUserCount !== 1) {
          throw new InsufficientVoteTokenException();
        }
      }

      try {
        tx.persist(
          new VoteEventParticipation(
            tx.getReference(VoteEvent, options.voteEventId),
            tx.getReference(User, options.userId),
            {
              selectedOption: options.selectedOption,
              tokenAmount,
            },
          ),
        );
        await tx.flush();
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new VoteEventAlreadyParticipatedException();
        }

        throw error;
      }

      const updatedVoteEventCount = await tx.nativeUpdate(
        VoteEvent,
        { deadlineAt: { $gt: new Date() }, id: options.voteEventId },
        voteEventAggregateUpdate(options.selectedOption, tokenAmount),
      );

      if (updatedVoteEventCount !== 1) {
        throw new VoteEventClosedException();
      }
    });
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
    const params = voteEventListParams(options.userId, options.now);
    const conditions = ['ve.`deadline_at` > ?'];

    addCategoryCondition(conditions, params, options.category);

    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<OngoingVoteEventRow[]>(
        `select ${voteEventListSelect(options.userId)} from \`vote_events\` ve where ${conditions.join(' and ')} order by ve.\`total_participant_count\` desc, ve.\`deadline_at\` asc, ve.\`id\` asc limit 1`,
        params,
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

    addCategoryCondition(conditions, params, options.category);

    if (options.cursor) {
      const cursor = publicCursorPredicate(options, 'ongoing');

      conditions.push(cursor.condition);
      params.push(...cursor.params);
    }

    params.push(options.limit + 1);

    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<OngoingVoteEventRow[]>(
        `select ${voteEventListSelect(options.userId)} from \`vote_events\` ve where ${conditions.join(' and ')} order by ${publicOrderBy(options.sort, 'ongoing')} limit ?`,
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

    addCategoryCondition(conditions, params, options.category);

    if (options.cursor) {
      const cursor = publicCursorPredicate(options, 'completed');

      conditions.push(cursor.condition);
      params.push(...cursor.params);
    }

    params.push(options.limit + 1);

    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<OngoingVoteEventRow[]>(
        `select ${voteEventListSelect(options.userId)} from \`vote_events\` ve where ${conditions.join(' and ')} order by ${publicOrderBy(options.sort, 'completed')} limit ?`,
        params,
      );

    return rows.map(toOngoingVoteEventRecord);
  }

  async listCreatedByUser(
    options: ListUserVoteEventsOptions,
  ): Promise<UserVoteEventsPage> {
    const items = await this.findUserVoteEventPage(
      options,
      've.`organizer_user_id` = ?',
    );

    return {
      hasNext: items.length > options.limit,
      items: items.slice(0, options.limit),
    };
  }

  async listParticipatedByUser(
    options: ListUserVoteEventsOptions,
  ): Promise<UserVoteEventsPage> {
    const items = await this.findUserVoteEventPage(
      options,
      'exists (select 1 from `vote_event_participations` owner_vep where owner_vep.`vote_event_id` = ve.`id` and owner_vep.`user_id` = ?)',
    );

    return {
      hasNext: items.length > options.limit,
      items: items.slice(0, options.limit),
    };
  }

  private async findUserVoteEventPage(
    options: ListUserVoteEventsOptions,
    userCondition: string,
  ): Promise<UserVoteEventRecord[]> {
    const params = userVoteEventListParams(options.userId, options.now);
    const conditions = [userCondition];

    params.push(options.userId);

    addCategoryCondition(conditions, params, options.category);

    if (options.cursor) {
      const cursor = userCursorPredicate(options);

      conditions.push(cursor.condition);
      params.push(...cursor.params);
    }

    const orderBy = userOrderBy(options.sort, options.now);

    params.push(...orderBy.params);
    params.push(options.limit + 1);

    const rows = await this.voteEvents
      .getEntityManager()
      .getConnection()
      .execute<UserVoteEventRow[]>(
        `select ${userVoteEventListSelect()} from \`vote_events\` ve where ${conditions.join(' and ')} order by ${orderBy.sql} limit ?`,
        params,
      );

    return rows.map(toUserVoteEventRecord);
  }
}

type PublicListScope = 'completed' | 'ongoing';

interface SqlFragment {
  condition: string;
  params: unknown[];
}

interface OrderByFragment {
  params: unknown[];
  sql: string;
}

function addCategoryCondition(
  conditions: string[],
  params: unknown[],
  category: ListVoteEventsOptions['category'],
): void {
  if (!category) {
    return;
  }

  conditions.push('ve.`category` = ?');
  params.push(category);
}

function publicCursorPredicate(
  options: ListVoteEventsOptions,
  scope: PublicListScope,
): SqlFragment {
  const cursor = options.cursor!;

  if (options.sort === 'latest') {
    return {
      condition: '(ve.`created_at` < ? or (ve.`created_at` = ? and ve.`id` > ?))',
      params: [cursor.orderValue, cursor.orderValue, cursor.id],
    };
  }

  if (options.sort === 'participants') {
    return {
      condition:
        '(ve.`total_participant_count` < ? or (ve.`total_participant_count` = ? and ve.`id` > ?))',
      params: [cursor.orderValue, cursor.orderValue, cursor.id],
    };
  }

  const operator = scope === 'ongoing' ? '>' : '<';

  return {
    condition: `(ve.\`deadline_at\` ${operator} ? or (ve.\`deadline_at\` = ? and ve.\`id\` > ?))`,
    params: [cursor.orderValue, cursor.orderValue, cursor.id],
  };
}

function publicOrderBy(
  sort: VoteEventListSort,
  scope: PublicListScope,
): string {
  if (sort === 'latest') {
    return 've.`created_at` desc, ve.`id` asc';
  }

  if (sort === 'participants') {
    return 've.`total_participant_count` desc, ve.`id` asc';
  }

  return scope === 'ongoing'
    ? 've.`deadline_at` asc, ve.`id` asc'
    : 've.`deadline_at` desc, ve.`id` asc';
}

function userCursorPredicate(options: ListUserVoteEventsOptions): SqlFragment {
  const cursor = options.cursor!;

  if (options.sort === 'latest') {
    return {
      condition: '(ve.`created_at` < ? or (ve.`created_at` = ? and ve.`id` > ?))',
      params: [cursor.orderValue, cursor.orderValue, cursor.id],
    };
  }

  if (options.sort === 'participants') {
    return {
      condition:
        '(ve.`total_participant_count` < ? or (ve.`total_participant_count` = ? and ve.`id` > ?))',
      params: [cursor.orderValue, cursor.orderValue, cursor.id],
    };
  }

  const operator = cursor.orderGroup === 0 ? '>' : '<';
  const statusRank = 'case when ve.`deadline_at` > ? then 0 else 1 end';

  return {
    condition: `(${statusRank} > ? or (${statusRank} = ? and (ve.\`deadline_at\` ${operator} ? or (ve.\`deadline_at\` = ? and ve.\`id\` > ?))))`,
    params: [
      options.now,
      cursor.orderGroup,
      options.now,
      cursor.orderGroup,
      cursor.orderValue,
      cursor.orderValue,
      cursor.id,
    ],
  };
}

function userOrderBy(sort: VoteEventListSort, now: Date): OrderByFragment {
  if (sort === 'latest') {
    return { params: [], sql: 've.`created_at` desc, ve.`id` asc' };
  }

  if (sort === 'participants') {
    return {
      params: [],
      sql: 've.`total_participant_count` desc, ve.`id` asc',
    };
  }

  return {
    params: [now, now, now],
    sql: 'case when ve.`deadline_at` > ? then 0 else 1 end asc, case when ve.`deadline_at` > ? then ve.`deadline_at` end asc, case when ve.`deadline_at` <= ? then ve.`deadline_at` end desc, ve.`id` asc',
  };
}
