import { VoteEvent } from '../../src/vote-events/vote-event.entity';
import {
  CompletedVoteEventsPage,
  OngoingVoteEventsPage,
  UserVoteEventsPage,
  VoteEventsRepository,
} from '../../src/vote-events/vote-events.repository';
import { VoteEventsService } from '../../src/vote-events/vote-events.service';
import {
  UserAffiliationSummary,
  UsersRepository,
} from '../../src/users/users.repository';

export function createVoteEventsServiceTestContext(): {
  repository: FakeVoteEventsRepository;
  service: VoteEventsService;
  users: FakeUsersRepository;
} {
  const repository = new FakeVoteEventsRepository();
  const users = new FakeUsersRepository();

  return {
    repository,
    service: new VoteEventsService(repository, users),
    users,
  };
}

type FakeParticipation = {
  category: 'betting' | 'daily' | 'balance' | 'work';
  selectedOption: 'A' | 'B';
  tokenAmount: number;
  userId: string;
  voteEventId: string;
};

type FakeBettingResultConfirmation = {
  confirmedAt: Date;
  organizerUserId: string;
  voteEventId: string;
  winningOption: 'A' | 'B';
};

export class FakeVoteEventsRepository implements VoteEventsRepository {
  createdVoteEvent?: VoteEvent;
  completedListResult: CompletedVoteEventsPage = {
    hasNext: false,
    items: [],
  };
  detail: {
    category: 'betting' | 'daily' | 'balance' | 'work';
    cursorCreatedAt: string;
    cursorDeadlineAt: string;
    id: string;
    bettingResultConfirmedAt: string | null;
    bettingResultOption: 'A' | 'B' | null;
    isCompleted: boolean;
    isOrganizer: boolean;
    isParticipated: boolean;
    optionA: string;
    optionAImageUrl: string | null;
    optionAParticipantCount: number;
    optionATokenAmount: number;
    optionB: string;
    optionBImageUrl: string | null;
    optionBParticipantCount: number;
    optionBTokenAmount: number;
    remainingSeconds: number;
    selectedOption: 'A' | 'B' | null;
    title: string;
    totalParticipantCount: number;
    totalTokenAmount: number;
  } | null = null;
  confirmedBettingResult?: FakeBettingResultConfirmation;
  listResult: OngoingVoteEventsPage = {
    hasNext: false,
    items: [],
    mainVote: null,
  };
  participationChoices: Array<{
    selectedOption: 'A' | 'B';
    tokenAmount: number;
    userId: string;
  }> = [];
  participation?: FakeParticipation;

  create(voteEvent: VoteEvent): Promise<VoteEvent> {
    this.createdVoteEvent = voteEvent;

    return Promise.resolve(voteEvent);
  }

  getSummary(): never {
    throw new Error('not used');
  }

  listOngoing(): Promise<OngoingVoteEventsPage> {
    return Promise.resolve(this.listResult);
  }

  listCompleted(): Promise<CompletedVoteEventsPage> {
    return Promise.resolve(this.completedListResult);
  }

  listCreatedByUser(): Promise<UserVoteEventsPage> {
    return Promise.resolve({ hasNext: false, items: [] });
  }

  listParticipatedByUser(): Promise<UserVoteEventsPage> {
    return Promise.resolve({ hasNext: false, items: [] });
  }

  findDetail(): Promise<typeof this.detail> {
    return Promise.resolve(this.detail);
  }

  findParticipationChoices(): Promise<typeof this.participationChoices> {
    return Promise.resolve(this.participationChoices);
  }

  participate(args: FakeParticipation): Promise<void> {
    this.participation = args;

    return Promise.resolve();
  }

  confirmBettingResult(args: FakeBettingResultConfirmation): Promise<void> {
    this.confirmedBettingResult = args;

    return Promise.resolve();
  }
}

export class FakeUsersRepository implements UsersRepository {
  affiliations: UserAffiliationSummary[] = [];

  create(): never {
    throw new Error('not used');
  }

  existsByNickname(): never {
    throw new Error('not used');
  }

  findById(): never {
    throw new Error('not used');
  }

  findByNickname(): never {
    throw new Error('not used');
  }

  findAffiliationsByIds(): Promise<UserAffiliationSummary[]> {
    return Promise.resolve(this.affiliations);
  }
}

export function voteEventDetail(
  overrides: Partial<FakeVoteEventsRepository['detail']> = {},
): NonNullable<FakeVoteEventsRepository['detail']> {
  return {
    category: 'daily',
    bettingResultConfirmedAt: null,
    bettingResultOption: null,
    cursorCreatedAt: '2026-07-01 11:00:00',
    cursorDeadlineAt: '2026-07-01 12:00:00',
    id: 'vote-event-id',
    isCompleted: false,
    isOrganizer: false,
    isParticipated: false,
    optionA: 'A',
    optionAImageUrl: null,
    optionAParticipantCount: 0,
    optionATokenAmount: 0,
    optionB: 'B',
    optionBImageUrl: null,
    optionBParticipantCount: 0,
    optionBTokenAmount: 0,
    remainingSeconds: 10,
    selectedOption: null,
    title: '투표',
    totalParticipantCount: 0,
    totalTokenAmount: 0,
    ...overrides,
  };
}
