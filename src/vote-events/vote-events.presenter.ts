import type { UserAffiliationSummary } from '../users/users.repository';
import type { VoteEventCategory } from './dto/create-vote-event.dto';
import type {
  VoteEventAffiliationStatDto,
} from './dto/vote-event-detail.dto';
import type { VoteEventListItemDto } from './dto/list-vote-events.dto';
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
      deadlineAt: cursor.deadlineAt,
      id: cursor.id,
      mainVoteId: cursor.mainVoteId,
    }),
  ).toString('base64url');
}

export function decodeCursor(
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

function percentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 10_000) / 100 : 0;
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
