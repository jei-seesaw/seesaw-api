import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { UsersRepository } from '../users/users.repository';
import {
  CreateVoteEventRequestDto,
  CreateVoteEventResponseDto,
  type VoteEventCategory,
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
  type VoteEventListSort,
} from './dto/list-vote-events.dto';
import { VoteEvent } from './vote-event.entity';
import {
  VoteEventAlreadyParticipatedException,
  VoteEventClosedException,
  VoteEventNotFoundException,
} from './vote-events.exceptions';
import {
  GetVoteEventDetailOptions,
  ListUserVoteEventsOptions,
  ListVoteEventsOptions,
  OngoingVoteEventRecord,
  UserVoteEventRecord,
  UserVoteEventsPage,
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
    user: AuthenticatedUser,
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
      organizerUserId: user.id,
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
    const listQuery = this.normalizeListQuery(query);
    const cursor = decodeCursor(query.cursor, listQuery);
    const options: ListVoteEventsOptions = {
      limit: query.limit,
      now,
      sort: listQuery.sort,
    };

    if (listQuery.category) {
      options.category = listQuery.category;
    }

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
            ? this.encodeListCursor(lastItem, {
                category: listQuery.category,
                mainVoteId,
                orderGroup: this.publicCursorOrderGroup(
                  'ongoing',
                  listQuery.sort,
                ),
                sort: listQuery.sort,
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
    const listQuery = this.normalizeListQuery(query);
    const cursor = decodeCursor(query.cursor, listQuery);
    const options: ListVoteEventsOptions = {
      limit: query.limit,
      now,
      sort: listQuery.sort,
    };

    if (listQuery.category) {
      options.category = listQuery.category;
    }

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
            ? this.encodeListCursor(lastItem, {
                category: listQuery.category,
                mainVoteId: null,
                orderGroup: this.publicCursorOrderGroup(
                  'completed',
                  listQuery.sort,
                ),
                sort: listQuery.sort,
              })
            : null,
      },
    };
  }

  async listCreatedByUser(
    query: ListVoteEventsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListCompletedVoteEventsResponseDto> {
    const page = await this.voteEvents.listCreatedByUser(
      this.buildUserVoteEventsOptions(query, user),
    );

    return this.mapUserVoteEventsPage(query, page);
  }

  async listParticipatedByUser(
    query: ListVoteEventsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListCompletedVoteEventsResponseDto> {
    const page = await this.voteEvents.listParticipatedByUser(
      this.buildUserVoteEventsOptions(query, user),
    );

    return this.mapUserVoteEventsPage(query, page);
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

  private buildUserVoteEventsOptions(
    query: ListVoteEventsQueryDto,
    user: AuthenticatedUser,
  ): ListUserVoteEventsOptions {
    const listQuery = this.normalizeListQuery(query);
    const cursor = decodeCursor(query.cursor, listQuery);
    const options: ListUserVoteEventsOptions = {
      limit: query.limit,
      now: new Date(),
      sort: listQuery.sort,
      userId: user.id,
    };

    if (listQuery.category) {
      options.category = listQuery.category;
    }

    if (cursor) {
      options.cursor = cursor;
    }

    return options;
  }

  private mapUserVoteEventsPage(
    query: ListVoteEventsQueryDto,
    page: UserVoteEventsPage,
  ): ListCompletedVoteEventsResponseDto {
    const listQuery = this.normalizeListQuery(query);
    const lastItem = page.items.at(-1);

    return {
      voteEvents: page.items.map((item) =>
        mapVoteEventItem(item, { revealRatios: item.isCompleted }),
      ),
      pageInfo: {
        hasNext: page.hasNext,
        nextCursor:
          page.hasNext && lastItem
            ? this.encodeListCursor(lastItem, {
                category: listQuery.category,
                mainVoteId: null,
                orderGroup: this.cursorOrderGroup(lastItem, listQuery.sort),
                sort: listQuery.sort,
              })
            : null,
      },
    };
  }

  private normalizeListQuery(query: ListVoteEventsQueryDto): {
    category?: VoteEventCategory;
    sort: VoteEventListSort;
  } {
    return query.category
      ? { category: query.category, sort: query.sort ?? 'latest' }
      : { sort: query.sort ?? 'latest' };
  }

  private encodeListCursor(
    item: OngoingVoteEventRecord | UserVoteEventRecord,
    options: {
      category: VoteEventCategory | undefined;
      mainVoteId: string | null;
      orderGroup?: number | null;
      sort: VoteEventListSort;
    },
  ): string {
    return encodeCursor({
      category: options.category ?? null,
      id: item.id,
      mainVoteId: options.mainVoteId,
      orderGroup: options.orderGroup ?? null,
      orderValue: this.cursorOrderValue(item, options.sort),
      sort: options.sort,
      version: 2,
    });
  }

  private cursorOrderValue(
    item: OngoingVoteEventRecord | UserVoteEventRecord,
    sort: VoteEventListSort,
  ): number | string {
    if (sort === 'participants') {
      return item.totalParticipantCount;
    }

    if (sort === 'latest') {
      return item.cursorCreatedAt;
    }

    return item.cursorDeadlineAt;
  }

  private cursorOrderGroup(
    item: UserVoteEventRecord,
    sort: VoteEventListSort,
  ): number | null {
    return sort === 'deadline' ? Number(item.isCompleted) : null;
  }

  private publicCursorOrderGroup(
    scope: 'completed' | 'ongoing',
    sort: VoteEventListSort,
  ): number | null {
    if (sort !== 'deadline') {
      return null;
    }

    return scope === 'ongoing' ? 0 : 1;
  }
}
