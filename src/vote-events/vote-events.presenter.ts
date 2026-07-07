import type { UserAffiliationSummary } from '../users/users.repository';
import {
  VOTE_EVENT_CATEGORIES,
  type VoteEventCategory,
} from './dto/create-vote-event.dto';
import type { VoteEventAffiliationStatDto } from './dto/vote-event-detail.dto';
import {
  VOTE_EVENT_LIST_SORTS,
  type VoteEventListItemDto,
  type VoteEventListSort,
} from './dto/list-vote-events.dto';
import {
  InvalidCursorException,
  TokenAmountNotAllowedException,
  TokenAmountRequiredException,
} from './vote-events.exceptions';
import type {
  OngoingVoteEventRecord,
  VoteEventDetailRecord,
  VoteEventParticipationChoiceRecord,
  VoteEventsListCursor,
} from './vote-events.repository';

export const CATEGORY_NAMES: Record<VoteEventCategory, string> = {
  balance: '밸런스',
  betting: '배팅',
  daily: '일상',
  work: '업무',
};

export function mapVoteEvent(
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

export function mapVoteEventItem(
  voteEvent: OngoingVoteEventRecord,
  options?: { revealRatios?: boolean },
): VoteEventListItemDto {
  return mapVoteEvent(voteEvent, options)!;
}

export function voteTokenAmount(
  category: VoteEventCategory,
  tokenAmount: number | null | undefined,
): number {
  if (category === 'betting') {
    if (tokenAmount === null || tokenAmount === undefined) {
      throw new TokenAmountRequiredException();
    }

    return tokenAmount;
  }

  if (tokenAmount !== null && tokenAmount !== undefined) {
    throw new TokenAmountNotAllowedException();
  }

  return 0;
}

export function calculateRatios(
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

export function calculateResultAmounts(
  voteEvent: OngoingVoteEventRecord,
): [number, number] {
  if (voteEvent.category === 'betting') {
    return [voteEvent.optionATokenAmount, voteEvent.optionBTokenAmount];
  }

  return [
    voteEvent.optionAParticipantCount,
    voteEvent.optionBParticipantCount,
  ];
}

export function buildAffiliationStats(
  voteEvent: VoteEventDetailRecord,
  choices: VoteEventParticipationChoiceRecord[],
  affiliations: UserAffiliationSummary[],
): VoteEventAffiliationStatDto[] {
  const affiliationByUserId = new Map(
    affiliations.map((affiliation) => [affiliation.userId, affiliation]),
  );
  const statsByAffiliation = new Map<
    string,
    {
      affiliationCode: string;
      affiliationName: string;
      optionAAmount: number;
      optionBAmount: number;
    }
  >();

  for (const choice of choices) {
    const affiliation = affiliationByUserId.get(choice.userId);

    if (!affiliation) {
      continue;
    }

    const stat = statsByAffiliation.get(affiliation.affiliationCode) ?? {
      affiliationCode: affiliation.affiliationCode,
      affiliationName: affiliation.affiliationName,
      optionAAmount: 0,
      optionBAmount: 0,
    };
    const amount = voteEvent.category === 'betting' ? choice.tokenAmount : 1;

    if (choice.selectedOption === 'A') {
      stat.optionAAmount += amount;
    } else {
      stat.optionBAmount += amount;
    }

    statsByAffiliation.set(affiliation.affiliationCode, stat);
  }

  return [...statsByAffiliation.values()]
    .map((stat) => {
      const total = stat.optionAAmount + stat.optionBAmount;

      return {
        affiliationCode: stat.affiliationCode,
        affiliationName: stat.affiliationName,
        optionARatio: percentage(stat.optionAAmount, total),
        optionBRatio: percentage(stat.optionBAmount, total),
      };
    })
    .sort((a, b) =>
      a.affiliationName === b.affiliationName
        ? a.affiliationCode.localeCompare(b.affiliationCode)
        : a.affiliationName.localeCompare(b.affiliationName),
    );
}

export function formatRemainingTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function encodeCursor(cursor: VoteEventsListCursor): string {
  return Buffer.from(
    JSON.stringify({
      category: cursor.category,
      id: cursor.id,
      mainVoteId: cursor.mainVoteId,
      orderGroup: cursor.orderGroup,
      orderValue: cursor.orderValue,
      sort: cursor.sort,
      version: cursor.version,
    }),
  ).toString('base64url');
}

export function decodeCursor(
  cursor: string | undefined,
  query: {
    category?: VoteEventCategory;
    sort: VoteEventListSort;
  },
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

    if (
      value.sort !== query.sort ||
      value.category !== (query.category ?? null)
    ) {
      throw new InvalidCursorException();
    }

    if (!isValidCursorOrderValue(value.sort, value.orderValue)) {
      throw new InvalidCursorException();
    }

    if (!isValidCursorOrderGroup(value.sort, value.orderGroup)) {
      throw new InvalidCursorException();
    }

    return {
      category: value.category,
      id: value.id,
      mainVoteId: value.mainVoteId,
      orderGroup: value.orderGroup,
      orderValue: value.orderValue,
      sort: value.sort,
      version: value.version,
    };
  } catch (error) {
    if (error instanceof InvalidCursorException) {
      throw error;
    }

    throw new InvalidCursorException();
  }
}

export function percentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 10_000) / 100 : 0;
}

function isCursorValue(value: unknown): value is {
  category: VoteEventCategory | null;
  id: string;
  mainVoteId: string | null;
  orderGroup: number | null;
  orderValue: number | string;
  sort: VoteEventListSort;
  version: 2;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { version?: unknown }).version === 2 &&
    isVoteEventListSort((value as { sort?: unknown }).sort) &&
    isVoteEventCategoryOrNull((value as { category?: unknown }).category) &&
    isCursorOrderGroup((value as { orderGroup?: unknown }).orderGroup) &&
    ['number', 'string'].includes(
      typeof (value as { orderValue?: unknown }).orderValue,
    ) &&
    typeof (value as { id?: unknown }).id === 'string' &&
    ((value as { mainVoteId?: unknown }).mainVoteId === null ||
      typeof (value as { mainVoteId?: unknown }).mainVoteId === 'string')
  );
}

function isValidCursorOrderValue(
  sort: VoteEventListSort,
  value: number | string,
): boolean {
  if (sort === 'participants') {
    return typeof value === 'number' && Number.isFinite(value);
  }

  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
  );
}

function isVoteEventListSort(value: unknown): value is VoteEventListSort {
  return (
    typeof value === 'string' &&
    VOTE_EVENT_LIST_SORTS.includes(value as VoteEventListSort)
  );
}

function isVoteEventCategoryOrNull(
  value: unknown,
): value is VoteEventCategory | null {
  return (
    value === null ||
    (typeof value === 'string' &&
      VOTE_EVENT_CATEGORIES.includes(value as VoteEventCategory))
  );
}

function isCursorOrderGroup(value: unknown): value is number | null {
  return value === null || value === 0 || value === 1;
}

function isValidCursorOrderGroup(
  sort: VoteEventListSort,
  value: number | null,
): boolean {
  return sort === 'deadline' ? value !== null : value === null;
}
