import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { UsersRepository } from '../users/users.repository';
import {
  CreateVoteEventRequestDto,
  CreateVoteEventResponseDto,
} from './dto/create-vote-event.dto';
import { CastVoteRequestDto } from './dto/cast-vote.dto';
import {
  VoteEventAffiliationStatDto,
  VoteEventDetailResponseDto,
} from './dto/vote-event-detail.dto';
import {
  ListCompletedVoteEventsResponseDto,
  ListVoteEventsQueryDto,
  ListVoteEventsResponseDto,
} from './dto/list-vote-events.dto';
import { VoteEvent } from './vote-event.entity';
import {
  VoteEventAlreadyParticipatedException,
  VoteEventClosedException,
  VoteEventNotFoundException,
} from './vote-events.exceptions';
import {
  GetVoteEventDetailOptions,
  ListVoteEventsOptions,
  VoteEventDetailRecord,
  VoteEventsRepository,
} from './vote-events.repository';
import {
  buildAffiliationStats,
  calculateRatios,
  calculateResultAmounts,
  CATEGORY_NAMES,
  decodeCursor,
  encodeCursor,
  formatRemainingTime,
  mapVoteEvent,
  mapVoteEventItem,
  voteTokenAmount,
} from './vote-events.presenter';

const VOTE_EVENT_DURATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class VoteEventsService {
  constructor(
    private readonly voteEvents: VoteEventsRepository,
    private readonly users: UsersRepository,
  ) {}

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

  async listOngoing(
    query: ListVoteEventsQueryDto,
    user?: AuthenticatedUser,
  ): Promise<ListVoteEventsResponseDto> {
    const now = new Date();
    const cursor = decodeCursor(query.cursor);
    const options: ListVoteEventsOptions = {
      limit: query.limit,
      now,
    };

    if (cursor) {
      options.cursor = cursor;
    }

    if (user) {
      options.userId = user.id;
    }

    const page = await this.voteEvents.listOngoing(options);
    const mainVoteId = page.mainVote?.id ?? cursor?.mainVoteId ?? null;
    const lastItem = page.items.at(-1);

    return {
      mainVote: cursor ? null : mapVoteEvent(page.mainVote),
      otherVoteEvents: page.items.map((item) => mapVoteEventItem(item)),
      pageInfo: {
        hasNext: page.hasNext,
        nextCursor:
          page.hasNext && lastItem
            ? encodeCursor({
                deadlineAt: lastItem.cursorDeadlineAt,
                id: lastItem.id,
                mainVoteId,
              })
            : null,
      },
    };
  }

  async listCompleted(
    query: ListVoteEventsQueryDto,
    user?: AuthenticatedUser,
  ): Promise<ListCompletedVoteEventsResponseDto> {
    const now = new Date();
    const cursor = decodeCursor(query.cursor);
    const options: ListVoteEventsOptions = {
      limit: query.limit,
      now,
    };

    if (cursor) {
      options.cursor = cursor;
    }

    if (user) {
      options.userId = user.id;
    }

    const page = await this.voteEvents.listCompleted(options);
    const lastItem = page.items.at(-1);

    return {
      voteEvents: page.items.map((item) =>
        mapVoteEventItem(item, { revealRatios: true }),
      ),
      pageInfo: {
        hasNext: page.hasNext,
        nextCursor:
          page.hasNext && lastItem
            ? encodeCursor({
                deadlineAt: lastItem.cursorDeadlineAt,
                id: lastItem.id,
                mainVoteId: null,
              })
            : null,
      },
    };
  }

  async getDetail(
    id: string,
    user?: AuthenticatedUser,
  ): Promise<VoteEventDetailResponseDto> {
    const options: GetVoteEventDetailOptions = {
      id,
      now: new Date(),
    };

    if (user) {
      options.userId = user.id;
    }

    const voteEvent = await this.voteEvents.findDetail(options);

    if (!voteEvent) {
      throw new VoteEventNotFoundException();
    }

    return this.mapVoteEventDetail(voteEvent);
  }

  async vote(
    dto: CastVoteRequestDto,
    user: AuthenticatedUser,
  ): Promise<null> {
    const voteEvent = await this.voteEvents.findDetail({
      id: dto.voteEventId,
      now: new Date(),
      userId: user.id,
    });

    if (!voteEvent) {
      throw new VoteEventNotFoundException();
    }

    if (voteEvent.isCompleted) {
      throw new VoteEventClosedException();
    }

    if (voteEvent.isParticipated) {
      throw new VoteEventAlreadyParticipatedException();
    }

    await this.voteEvents.participate({
      category: voteEvent.category,
      selectedOption: dto.selectedOption,
      tokenAmount: voteTokenAmount(voteEvent.category, dto.tokenAmount),
      userId: user.id,
      voteEventId: voteEvent.id,
    });

    return null;
  }

  private async mapVoteEventDetail(
    voteEvent: VoteEventDetailRecord,
  ): Promise<VoteEventDetailResponseDto> {
    const revealResults = voteEvent.isCompleted || voteEvent.isParticipated;
    const [optionARatio, optionBRatio] = revealResults
      ? calculateRatios(voteEvent)
      : [null, null];
    const [optionAResultAmount, optionBResultAmount] = revealResults
      ? calculateResultAmounts(voteEvent)
      : [null, null];
    const affiliationStats = revealResults
      ? await this.getAffiliationStats(voteEvent)
      : null;

    return {
      affiliationStats,
      categoryName: CATEGORY_NAMES[voteEvent.category],
      isParticipated: voteEvent.isParticipated,
      optionA: voteEvent.optionA,
      optionAImageUrl: voteEvent.optionAImageUrl,
      optionAResultAmount,
      optionARatio,
      optionB: voteEvent.optionB,
      optionBImageUrl: voteEvent.optionBImageUrl,
      optionBResultAmount,
      optionBRatio,
      remainingTime: voteEvent.isCompleted
        ? null
        : formatRemainingTime(voteEvent.remainingSeconds),
      selectedOption: voteEvent.selectedOption,
      title: voteEvent.title,
      totalParticipantCount: voteEvent.totalParticipantCount,
      totalTokenAmount:
        voteEvent.category === 'betting' ? voteEvent.totalTokenAmount : null,
    };
  }

  private async getAffiliationStats(
    voteEvent: VoteEventDetailRecord,
  ): Promise<VoteEventAffiliationStatDto[]> {
    const choices = await this.voteEvents.findParticipationChoices(voteEvent.id);
    const userIds = [...new Set(choices.map((choice) => choice.userId))];
    const affiliations = await this.users.findAffiliationsByIds(userIds);

    return buildAffiliationStats(voteEvent, choices, affiliations);
  }
}
