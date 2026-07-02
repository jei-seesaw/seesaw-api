import { raw } from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';
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
  ListVoteEventsOptions,
  OngoingVoteEventRecord,
  OngoingVoteEventsPage,
  ParticipateInVoteEventOptions,
  VoteEventDetailRecord,
  VoteEventParticipationChoiceRecord,
  VoteEventsSummary,
} from './vote-events.repository.types';
import {
  isDuplicateKeyError,
  toOngoingVoteEventRecord,
  toVoteEventDetailRecord,
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
