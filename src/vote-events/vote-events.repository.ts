import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { VoteEvent } from './vote-event.entity';

export abstract class VoteEventsRepository {
  abstract create(voteEvent: VoteEvent): Promise<VoteEvent>;
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
}
