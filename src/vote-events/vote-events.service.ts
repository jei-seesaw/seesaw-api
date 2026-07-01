import { Injectable } from '@nestjs/common';
import {
  CreateVoteEventRequestDto,
  CreateVoteEventResponseDto,
} from './dto/create-vote-event.dto';
import { VoteEvent } from './vote-event.entity';
import { VoteEventsRepository } from './vote-events.repository';

const VOTE_EVENT_DURATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class VoteEventsService {
  constructor(private readonly voteEvents: VoteEventsRepository) {}

  async create(
    dto: CreateVoteEventRequestDto,
  ): Promise<CreateVoteEventResponseDto> {
    const createdAt = new Date();
    const voteEvent = new VoteEvent({
      category: dto.category,
      createdAt,
      deadlineAt: new Date(createdAt.getTime() + VOTE_EVENT_DURATION_MS),
      optionA: dto.optionA,
      optionAImageUrl: dto.optionAImageUrl ?? null,
      optionB: dto.optionB,
      optionBImageUrl: dto.optionBImageUrl ?? null,
      title: dto.title,
    });
    const createdVoteEvent = await this.voteEvents.create(voteEvent);

    return { id: createdVoteEvent.id };
  }
}
