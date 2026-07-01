import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { VoteEvent } from './vote-event.entity';

export interface VoteEventsSummary {
  completedVoteEventCount: number;
  ongoingVoteEventCount: number;
  participantCount: number;
}

export abstract class VoteEventsRepository {
  abstract create(voteEvent: VoteEvent): Promise<VoteEvent>;
  abstract getSummary(): Promise<VoteEventsSummary>;
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
}

interface VoteEventsSummaryRow {
  completedVoteEventCount: number | string;
  ongoingVoteEventCount: number | string;
  participantCount: number | string;
}
