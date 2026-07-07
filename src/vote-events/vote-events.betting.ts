import type { VoteEventSelectedOption } from './dto/vote-event-detail.dto';

export interface BettingPayoutParticipation {
  createdAt: Date;
  id: string;
  selectedOption: VoteEventSelectedOption;
  tokenAmount: number;
  userId: string;
}

export interface BettingPayout {
  amount: number;
  userId: string;
}

interface BettingPayoutDraft extends BettingPayout {
  createdAt: Date;
  id: string;
  remainder: number;
}

export function calculateBettingPayouts(
  participations: BettingPayoutParticipation[],
  winningOption: VoteEventSelectedOption,
): BettingPayout[] {
  const winners = participations.filter(
    (participation) => participation.selectedOption === winningOption,
  );

  if (winners.length === 0) {
    return [];
  }

  const winningPool = sumTokenAmounts(winners);
  const losingPool = sumTokenAmounts(
    participations.filter(
      (participation) => participation.selectedOption !== winningOption,
    ),
  );
  let allocatedLosingPool = 0;
  const drafts: BettingPayoutDraft[] = winners.map((participation) => {
    const numerator = losingPool * participation.tokenAmount;
    const profit = Math.floor(numerator / winningPool);

    allocatedLosingPool += profit;

    return {
      amount: participation.tokenAmount + profit,
      createdAt: participation.createdAt,
      id: participation.id,
      remainder: numerator % winningPool,
      userId: participation.userId,
    };
  });
  let remaining = losingPool - allocatedLosingPool;

  for (const draft of [...drafts].sort(comparePayoutDrafts)) {
    if (remaining <= 0) {
      break;
    }

    draft.amount += 1;
    remaining -= 1;
  }

  return drafts.map(({ amount, userId }) => ({ amount, userId }));
}

function sumTokenAmounts(participations: BettingPayoutParticipation[]): number {
  return participations.reduce(
    (sum, participation) => sum + participation.tokenAmount,
    0,
  );
}

function comparePayoutDrafts(
  left: BettingPayoutDraft,
  right: BettingPayoutDraft,
): number {
  return (
    right.remainder - left.remainder ||
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}
