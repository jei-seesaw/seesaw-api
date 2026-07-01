import { VoteEvent } from '../../src/vote-events/vote-event.entity';
import {
  CompletedVoteEventsPage,
  OngoingVoteEventsPage,
  VoteEventsRepository,
} from '../../src/vote-events/vote-events.repository';
import { VoteEventsService } from '../../src/vote-events/vote-events.service';
import {
  UserAffiliationSummary,
  UsersRepository,
} from '../../src/users/users.repository';

describe('VoteEventsService', () => {
  let repository: FakeVoteEventsRepository;
  let service: VoteEventsService;
  let users: FakeUsersRepository;

  beforeEach(() => {
    repository = new FakeVoteEventsRepository();
    users = new FakeUsersRepository();
    service = new VoteEventsService(repository, users);
  });

  it('투표 이벤트를 만들면 마감시간과 초기 집계값을 설정한다', async () => {
    const startedAt = Date.now();

    const result = await service.create({
      category: 'betting',
      optionA: '김치찌개',
      optionAImageUrl: null,
      optionB: '돈까스',
      optionBImageUrl: 'https://example.com/b.jpg',
      title: '점심 메뉴는?',
    });
    const createdVoteEvent = repository.createdVoteEvent;

    expect(createdVoteEvent).toBeDefined();
    if (!createdVoteEvent) {
      throw new Error('Vote event was not created');
    }

    expect(result).toEqual({ id: createdVoteEvent.id });
    expect(createdVoteEvent).toMatchObject({
      category: 'betting',
      optionA: '김치찌개',
      optionAImageUrl: null,
      optionB: '돈까스',
      optionBImageUrl: 'https://example.com/b.jpg',
      title: '점심 메뉴는?',
      totalParticipantCount: 0,
      totalTokenAmount: 0,
      optionATokenAmount: 0,
      optionBTokenAmount: 0,
      optionAParticipantCount: 0,
      optionBParticipantCount: 0,
    });
    expect(
      createdVoteEvent.deadlineAt.getTime() -
        createdVoteEvent.createdAt.getTime(),
    ).toBe(24 * 60 * 60 * 1000);
    expect(createdVoteEvent.createdAt.getTime()).toBeGreaterThanOrEqual(
      startedAt,
    );
  });

  it('참여한 진행중인 투표만 선택지 비율을 반환한다', async () => {
    repository.listResult = {
      hasNext: false,
      items: [
        {
          category: 'daily',
          cursorDeadlineAt: '2026-07-01 12:00:00',
          id: 'daily-id',
          isParticipated: true,
          optionA: 'A',
          optionAImageUrl: null,
          optionAParticipantCount: 1,
          optionATokenAmount: 0,
          optionB: 'B',
          optionBImageUrl: null,
          optionBParticipantCount: 2,
          optionBTokenAmount: 0,
          remainingSeconds: 10,
          title: '일상 투표',
          totalParticipantCount: 3,
          totalTokenAmount: 0,
        },
        {
          category: 'betting',
          cursorDeadlineAt: '2026-07-01 12:00:00',
          id: 'betting-id',
          isParticipated: true,
          optionA: 'A',
          optionAImageUrl: null,
          optionAParticipantCount: 0,
          optionATokenAmount: 25,
          optionB: 'B',
          optionBImageUrl: null,
          optionBParticipantCount: 0,
          optionBTokenAmount: 75,
          remainingSeconds: 10,
          title: '배팅 투표',
          totalParticipantCount: 2,
          totalTokenAmount: 100,
        },
        {
          category: 'daily',
          cursorDeadlineAt: '2026-07-01 12:00:00',
          id: 'hidden-id',
          isParticipated: false,
          optionA: 'A',
          optionAImageUrl: null,
          optionAParticipantCount: 3,
          optionATokenAmount: 0,
          optionB: 'B',
          optionBImageUrl: null,
          optionBParticipantCount: 1,
          optionBTokenAmount: 0,
          remainingSeconds: 10,
          title: '미참여 투표',
          totalParticipantCount: 4,
          totalTokenAmount: 0,
        },
      ],
      mainVote: null,
    };

    const result = await service.listOngoing(
      { limit: 10 },
      { id: 'user-id', nickname: 'user' },
    );

    expect(result.otherVoteEvents).toEqual([
      expect.objectContaining({
        id: 'daily-id',
        optionARatio: 33.33,
        optionBRatio: 66.67,
        totalTokenAmount: null,
      }),
      expect.objectContaining({
        id: 'betting-id',
        optionARatio: 25,
        optionBRatio: 75,
        totalTokenAmount: 100,
      }),
      expect.objectContaining({
        id: 'hidden-id',
        optionARatio: null,
        optionBRatio: null,
        totalTokenAmount: null,
      }),
    ]);
  });

  it('완료된 투표는 참여 여부와 상관없이 선택지 비율을 반환한다', async () => {
    repository.completedListResult = {
      hasNext: false,
      items: [
        {
          category: 'daily',
          cursorDeadlineAt: '2026-07-01 12:00:00',
          id: 'daily-id',
          isParticipated: false,
          optionA: 'A',
          optionAImageUrl: null,
          optionAParticipantCount: 1,
          optionATokenAmount: 0,
          optionB: 'B',
          optionBImageUrl: null,
          optionBParticipantCount: 3,
          optionBTokenAmount: 0,
          remainingSeconds: 0,
          title: '일상 투표',
          totalParticipantCount: 4,
          totalTokenAmount: 0,
        },
        {
          category: 'betting',
          cursorDeadlineAt: '2026-07-01 12:00:00',
          id: 'betting-id',
          isParticipated: false,
          optionA: 'A',
          optionAImageUrl: null,
          optionAParticipantCount: 0,
          optionATokenAmount: 25,
          optionB: 'B',
          optionBImageUrl: null,
          optionBParticipantCount: 0,
          optionBTokenAmount: 75,
          remainingSeconds: 0,
          title: '배팅 투표',
          totalParticipantCount: 2,
          totalTokenAmount: 100,
        },
      ],
    };

    const result = await service.listCompleted({ limit: 10 });

    expect(result.voteEvents).toEqual([
      expect.objectContaining({
        id: 'daily-id',
        isParticipated: false,
        optionARatio: 25,
        optionBRatio: 75,
        remainingTime: '00:00:00',
        totalTokenAmount: null,
      }),
      expect.objectContaining({
        id: 'betting-id',
        isParticipated: false,
        optionARatio: 25,
        optionBRatio: 75,
        remainingTime: '00:00:00',
        totalTokenAmount: 100,
      }),
    ]);
  });

  it('진행중인 투표 상세는 미참여자에게 결과 정보를 숨긴다', async () => {
    repository.detail = {
      category: 'daily',
      cursorDeadlineAt: '2026-07-01 12:00:00',
      id: 'detail-id',
      isCompleted: false,
      isParticipated: false,
      optionA: 'A',
      optionAImageUrl: null,
      optionAParticipantCount: 1,
      optionATokenAmount: 0,
      optionB: 'B',
      optionBImageUrl: null,
      optionBParticipantCount: 2,
      optionBTokenAmount: 0,
      remainingSeconds: 3723,
      selectedOption: null,
      title: '진행중 투표',
      totalParticipantCount: 3,
      totalTokenAmount: 0,
    };

    const result = await service.getDetail('detail-id');

    expect(result).toEqual({
      affiliationStats: null,
      categoryName: '일상',
      isParticipated: false,
      optionA: 'A',
      optionAImageUrl: null,
      optionAResultAmount: null,
      optionARatio: null,
      optionB: 'B',
      optionBImageUrl: null,
      optionBResultAmount: null,
      optionBRatio: null,
      remainingTime: '01:02:03',
      selectedOption: null,
      title: '진행중 투표',
      totalParticipantCount: 3,
      totalTokenAmount: null,
    });
  });

  it('참여한 진행중인 배팅 투표 상세는 토큰 기준 결과와 내 선택지를 반환한다', async () => {
    repository.detail = {
      category: 'betting',
      cursorDeadlineAt: '2026-07-01 12:00:00',
      id: 'betting-detail-id',
      isCompleted: false,
      isParticipated: true,
      optionA: 'A',
      optionAImageUrl: null,
      optionAParticipantCount: 0,
      optionATokenAmount: 40,
      optionB: 'B',
      optionBImageUrl: null,
      optionBParticipantCount: 0,
      optionBTokenAmount: 60,
      remainingSeconds: 10,
      selectedOption: 'B',
      title: '배팅 투표',
      totalParticipantCount: 3,
      totalTokenAmount: 100,
    };
    repository.participationChoices = [
      { selectedOption: 'A', tokenAmount: 30, userId: 'teacher-a' },
      { selectedOption: 'B', tokenAmount: 10, userId: 'teacher-b' },
      { selectedOption: 'B', tokenAmount: 60, userId: 'headquarters-a' },
    ];
    users.affiliations = [
      {
        affiliationCode: 'teacher',
        affiliationName: '선생님',
        userId: 'teacher-a',
      },
      {
        affiliationCode: 'teacher',
        affiliationName: '선생님',
        userId: 'teacher-b',
      },
      {
        affiliationCode: 'headquarters',
        affiliationName: '본사',
        userId: 'headquarters-a',
      },
    ];

    const result = await service.getDetail('betting-detail-id', {
      id: 'user-id',
      nickname: 'user',
    });

    expect(result.affiliationStats).toEqual(
      expect.arrayContaining([
        {
          affiliationCode: 'teacher',
          affiliationName: '선생님',
          optionARatio: 75,
          optionBRatio: 25,
        },
        {
          affiliationCode: 'headquarters',
          affiliationName: '본사',
          optionARatio: 0,
          optionBRatio: 100,
        },
      ]),
    );
    expect(result).toMatchObject({
      categoryName: '배팅',
      isParticipated: true,
      optionAResultAmount: 40,
      optionARatio: 40,
      optionBResultAmount: 60,
      optionBRatio: 60,
      remainingTime: '00:00:10',
      selectedOption: 'B',
      totalTokenAmount: 100,
    });
  });

  it('완료된 투표 상세는 비로그인 요청에도 결과 정보를 반환한다', async () => {
    repository.detail = {
      category: 'daily',
      cursorDeadlineAt: '2026-07-01 12:00:00',
      id: 'completed-detail-id',
      isCompleted: true,
      isParticipated: false,
      optionA: 'A',
      optionAImageUrl: null,
      optionAParticipantCount: 1,
      optionATokenAmount: 0,
      optionB: 'B',
      optionBImageUrl: null,
      optionBParticipantCount: 3,
      optionBTokenAmount: 0,
      remainingSeconds: 0,
      selectedOption: null,
      title: '완료 투표',
      totalParticipantCount: 4,
      totalTokenAmount: 0,
    };
    repository.participationChoices = [
      { selectedOption: 'A', tokenAmount: 0, userId: 'teacher-a' },
      { selectedOption: 'B', tokenAmount: 0, userId: 'teacher-b' },
      { selectedOption: 'B', tokenAmount: 0, userId: 'teacher-c' },
      { selectedOption: 'B', tokenAmount: 0, userId: 'teacher-d' },
    ];
    users.affiliations = [
      {
        affiliationCode: 'teacher',
        affiliationName: '선생님',
        userId: 'teacher-a',
      },
      {
        affiliationCode: 'teacher',
        affiliationName: '선생님',
        userId: 'teacher-b',
      },
      {
        affiliationCode: 'teacher',
        affiliationName: '선생님',
        userId: 'teacher-c',
      },
      {
        affiliationCode: 'teacher',
        affiliationName: '선생님',
        userId: 'teacher-d',
      },
    ];

    const result = await service.getDetail('completed-detail-id');

    expect(result).toMatchObject({
      affiliationStats: [
        {
          affiliationCode: 'teacher',
          affiliationName: '선생님',
          optionARatio: 25,
          optionBRatio: 75,
        },
      ],
      isParticipated: false,
      optionAResultAmount: 1,
      optionARatio: 25,
      optionBResultAmount: 3,
      optionBRatio: 75,
      remainingTime: null,
      selectedOption: null,
    });
  });
});

class FakeVoteEventsRepository implements VoteEventsRepository {
  createdVoteEvent?: VoteEvent;
  completedListResult: CompletedVoteEventsPage = {
    hasNext: false,
    items: [],
  };
  detail: {
    category: 'betting' | 'daily' | 'balance' | 'work';
    cursorDeadlineAt: string;
    id: string;
    isCompleted: boolean;
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

  findDetail(): Promise<typeof this.detail> {
    return Promise.resolve(this.detail);
  }

  findParticipationChoices(): Promise<typeof this.participationChoices> {
    return Promise.resolve(this.participationChoices);
  }
}

class FakeUsersRepository implements UsersRepository {
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
