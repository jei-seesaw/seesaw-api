import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import {
  CreateVoteEventRequestDto,
  CreateVoteEventResponseDto,
  VoteEventCategory,
} from './dto/create-vote-event.dto';
import {
  ListCompletedVoteEventsResponseDto,
  ListVoteEventsQueryDto,
  ListVoteEventsResponseDto,
  VoteEventListItemDto,
} from './dto/list-vote-events.dto';
import { VoteEvent } from './vote-event.entity';
import { InvalidCursorException } from './vote-events.exceptions';
import {
  ListVoteEventsOptions,
  OngoingVoteEventRecord,
  VoteEventsListCursor,
  VoteEventsRepository,
} from './vote-events.repository';

const VOTE_EVENT_DURATION_MS = 24 * 60 * 60 * 1000;
const CATEGORY_NAMES: Record<VoteEventCategory, string> = {
  balance: '밸런스',
  betting: '배팅',
  daily: '일상',
  work: '업무',
};

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
}

function mapVoteEvent(
  voteEvent: OngoingVoteEventRecord | null,
  options: { revealRatios?: boolean } = {},
): VoteEventListItemDto | null {
  if (!voteEvent) {
    return null;
  }

  const [optionARatio, optionBRatio] = (
    options.revealRatios || voteEvent.isParticipated
  )
    ? calculateRatios(voteEvent)
    : [null, null];

  return {
    categoryName: CATEGORY_NAMES[voteEvent.category],
    id: voteEvent.id,
    isParticipated: voteEvent.isParticipated,
    optionA: voteEvent.optionA,
    optionAImageUrl: voteEvent.optionAImageUrl,
    optionARatio,
    optionB: voteEvent.optionB,
    optionBImageUrl: voteEvent.optionBImageUrl,
    optionBRatio,
    remainingTime: formatRemainingTime(voteEvent.remainingSeconds),
    title: voteEvent.title,
    totalParticipantCount: voteEvent.totalParticipantCount,
    totalTokenAmount:
      voteEvent.category === 'betting' ? voteEvent.totalTokenAmount : null,
  };
}

function mapVoteEventItem(
  voteEvent: OngoingVoteEventRecord,
  options?: { revealRatios?: boolean },
): VoteEventListItemDto {
  return mapVoteEvent(voteEvent, options)!;
}

function calculateRatios(
  voteEvent: OngoingVoteEventRecord,
): [number, number] {
  if (voteEvent.category === 'betting') {
    return [
      percentage(voteEvent.optionATokenAmount, voteEvent.totalTokenAmount),
      percentage(voteEvent.optionBTokenAmount, voteEvent.totalTokenAmount),
    ];
  }

  return [
    percentage(voteEvent.optionAParticipantCount, voteEvent.totalParticipantCount),
    percentage(voteEvent.optionBParticipantCount, voteEvent.totalParticipantCount),
  ];
}

function percentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 10_000) / 100 : 0;
}

function formatRemainingTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function encodeCursor(cursor: VoteEventsListCursor): string {
  return Buffer.from(
    JSON.stringify({
      deadlineAt: cursor.deadlineAt,
      id: cursor.id,
      mainVoteId: cursor.mainVoteId,
    }),
  ).toString('base64url');
}

function decodeCursor(
  cursor: string | undefined,
): VoteEventsListCursor | undefined {
  if (cursor === undefined) {
    return undefined;
  }

  try {
    const value = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as unknown;

    if (!isCursorValue(value)) {
      throw new InvalidCursorException();
    }

    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value.deadlineAt)) {
      throw new InvalidCursorException();
    }

    return {
      deadlineAt: value.deadlineAt,
      id: value.id,
      mainVoteId: value.mainVoteId,
    };
  } catch (error) {
    if (error instanceof InvalidCursorException) {
      throw error;
    }

    throw new InvalidCursorException();
  }
}

function isCursorValue(value: unknown): value is {
  deadlineAt: string;
  id: string;
  mainVoteId: string | null;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { deadlineAt?: unknown }).deadlineAt === 'string' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    ((value as { mainVoteId?: unknown }).mainVoteId === null ||
      typeof (value as { mainVoteId?: unknown }).mainVoteId === 'string')
  );
}
