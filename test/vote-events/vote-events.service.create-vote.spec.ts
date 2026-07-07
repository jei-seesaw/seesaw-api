import type { VoteEventsService } from '../../src/vote-events/vote-events.service';
import {
  createVoteEventsServiceTestContext,
  FakeVoteEventsRepository,
  voteEventDetail,
} from './vote-events.service.fixture';

describe('VoteEventsService create and vote', () => {
  let repository: FakeVoteEventsRepository;
  let service: VoteEventsService;

  beforeEach(() => {
    ({ repository, service } = createVoteEventsServiceTestContext());
  });

  it('투표 이벤트를 만들면 요청한 정각 마감시간과 초기 집계값을 저장한다', async () => {
    const startedAt = Date.now();
    const deadlineAt = deadlineAtHoursFromNow(2);

    const result = await service.create(
      {
        category: 'betting',
        deadlineAt,
        optionA: '김치찌개',
        optionAImageUrl: null,
        optionB: '돈까스',
        optionBImageUrl: 'https://example.com/b.jpg',
        title: '점심 메뉴는?',
      },
      { id: 'organizer-user-id', nickname: 'organizer' },
    );
    const createdVoteEvent = repository.createdVoteEvent;

    expect(createdVoteEvent).toBeDefined();
    if (!createdVoteEvent) {
      throw new Error('Vote event was not created');
    }

    expect(result).toEqual({ id: createdVoteEvent.id });
    expect(createdVoteEvent).toMatchObject({
      category: 'betting',
      organizerUserId: 'organizer-user-id',
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
      createdVoteEvent.deadlineAt.toISOString(),
    ).toBe(new Date(deadlineAt).toISOString());
    expect(createdVoteEvent.createdAt.getTime()).toBeGreaterThanOrEqual(
      startedAt,
    );
  });
  it.each([
    ['정각이 아닌', () => deadlineAtHoursFromNow(2, 30)],
    ['생성 시각 이하인', () => deadlineAtHoursFromNow(-1)],
    ['생성 후 24시간을 넘는', () => deadlineAtHoursFromNow(25)],
  ])('%s 마감시간이면 투표 이벤트 생성을 거절한다', async (_label, deadlineAt) => {
    await expect(
      service.create(
        {
          category: 'betting',
          deadlineAt: deadlineAt(),
          optionA: '김치찌개',
          optionB: '돈까스',
          title: '점심 메뉴는?',
        },
        { id: 'organizer-user-id', nickname: 'organizer' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_vote_event_deadline',
      },
      status: 422,
    });
  });
  it('일반 투표를 진행하면 참여 기록과 참여자 집계를 요청한다', async () => {
    repository.detail = voteEventDetail({
      category: 'daily',
      id: 'daily-id',
    });

    await expect(
      service.vote(
        { selectedOption: 'A', voteEventId: 'daily-id' },
        { id: 'user-id', nickname: 'user' },
      ),
    ).resolves.toBeNull();

    expect(repository.participation).toEqual({
      category: 'daily',
      selectedOption: 'A',
      tokenAmount: 0,
      userId: 'user-id',
      voteEventId: 'daily-id',
    });
  });
  it('배팅 투표를 진행하면 토큰 집계와 차감을 요청한다', async () => {
    repository.detail = voteEventDetail({
      category: 'betting',
      id: 'betting-id',
    });

    await expect(
      service.vote(
        { selectedOption: 'B', tokenAmount: 25, voteEventId: 'betting-id' },
        { id: 'user-id', nickname: 'user' },
      ),
    ).resolves.toBeNull();

    expect(repository.participation).toEqual({
      category: 'betting',
      selectedOption: 'B',
      tokenAmount: 25,
      userId: 'user-id',
      voteEventId: 'betting-id',
    });
  });
  it('없는 투표 이벤트에는 투표할 수 없다', async () => {
    repository.detail = null;

    await expect(
      service.vote(
        { selectedOption: 'A', voteEventId: 'missing-id' },
        { id: 'user-id', nickname: 'user' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'vote_event_not_found',
      },
      status: 404,
    });
  });
  it('마감된 투표 이벤트에는 투표할 수 없다', async () => {
    repository.detail = voteEventDetail({
      id: 'closed-id',
      isCompleted: true,
    });

    await expect(
      service.vote(
        { selectedOption: 'A', voteEventId: 'closed-id' },
        { id: 'user-id', nickname: 'user' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'vote_event_closed',
      },
      status: 409,
    });
  });
  it('이미 참여한 투표 이벤트에는 다시 투표할 수 없다', async () => {
    repository.detail = voteEventDetail({
      id: 'participated-id',
      isParticipated: true,
    });

    await expect(
      service.vote(
        { selectedOption: 'B', voteEventId: 'participated-id' },
        { id: 'user-id', nickname: 'user' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'vote_event_already_participated',
      },
      status: 409,
    });
  });
  it('배팅 투표에는 사용 토큰 수가 필요하다', async () => {
    repository.detail = voteEventDetail({
      category: 'betting',
      id: 'betting-id',
    });

    await expect(
      service.vote(
        { selectedOption: 'A', voteEventId: 'betting-id' },
        { id: 'user-id', nickname: 'user' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'token_amount_required',
      },
      status: 422,
    });
  });
  it('일반 투표에는 사용 토큰 수를 보낼 수 없다', async () => {
    repository.detail = voteEventDetail({
      category: 'balance',
      id: 'balance-id',
    });

    await expect(
      service.vote(
        { selectedOption: 'A', tokenAmount: 10, voteEventId: 'balance-id' },
        { id: 'user-id', nickname: 'user' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'token_amount_not_allowed',
      },
      status: 422,
    });
  });
  it('주최자가 배팅 결과를 확정하면 정산을 요청한다', async () => {
    repository.detail = voteEventDetail({
      category: 'betting',
      id: 'betting-id',
      isOrganizer: true,
    });

    await expect(
      service.confirmBettingResult(
        'betting-id',
        { winningOption: 'A' },
        { id: 'organizer-id', nickname: 'organizer' },
      ),
    ).resolves.toBeNull();

    expect(repository.confirmedBettingResult).toMatchObject({
      organizerUserId: 'organizer-id',
      voteEventId: 'betting-id',
      winningOption: 'A',
    });
    expect(repository.confirmedBettingResult?.confirmedAt).toBeInstanceOf(Date);
  });
  it('비주최자는 배팅 결과를 확정할 수 없다', async () => {
    repository.detail = voteEventDetail({
      category: 'betting',
      id: 'betting-id',
      isOrganizer: false,
    });

    await expect(
      service.confirmBettingResult(
        'betting-id',
        { winningOption: 'A' },
        { id: 'other-user-id', nickname: 'other' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'vote_event_result_forbidden',
      },
      status: 403,
    });
  });
  it('배팅 이벤트가 아니면 결과를 확정할 수 없다', async () => {
    repository.detail = voteEventDetail({
      category: 'daily',
      id: 'daily-id',
      isOrganizer: true,
    });

    await expect(
      service.confirmBettingResult(
        'daily-id',
        { winningOption: 'A' },
        { id: 'organizer-id', nickname: 'organizer' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'vote_event_result_not_allowed',
      },
      status: 422,
    });
  });
  it('이미 확정된 배팅 이벤트 결과는 다시 확정할 수 없다', async () => {
    repository.detail = voteEventDetail({
      bettingResultConfirmedAt: '2026-07-06T01:00:00.000Z',
      bettingResultOption: 'B',
      category: 'betting',
      id: 'confirmed-id',
      isOrganizer: true,
    });

    await expect(
      service.confirmBettingResult(
        'confirmed-id',
        { winningOption: 'A' },
        { id: 'organizer-id', nickname: 'organizer' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'vote_event_result_already_confirmed',
      },
      status: 409,
    });
  });
  it('없는 투표 이벤트의 배팅 결과는 확정할 수 없다', async () => {
    repository.detail = null;

    await expect(
      service.confirmBettingResult(
        'missing-id',
        { winningOption: 'A' },
        { id: 'organizer-id', nickname: 'organizer' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'vote_event_not_found',
      },
      status: 404,
    });
  });
  it('참여한 승자가 배팅 보상을 수령하면 수령 결과를 반환한다', async () => {
    repository.detail = voteEventDetail({
      bettingResultConfirmedAt: '2026-07-06T01:00:00.000Z',
      bettingResultOption: 'A',
      category: 'betting',
      id: 'betting-id',
      isParticipated: true,
      selectedOption: 'A',
    });
    repository.claimResult = { earnedTokenAmount: 40, rewardClaimed: true };

    await expect(
      service.claimBettingReward('betting-id', {
        id: 'user-id',
        nickname: 'user',
      }),
    ).resolves.toEqual({ earnedTokenAmount: 40, rewardClaimed: true });

    expect(repository.claimedBettingReward).toMatchObject({
      userId: 'user-id',
      voteEventId: 'betting-id',
    });
    expect(repository.claimedBettingReward?.claimedAt).toBeInstanceOf(Date);
  });
  it('미확정 배팅 보상은 수령할 수 없다', async () => {
    repository.detail = voteEventDetail({
      bettingResultOption: null,
      category: 'betting',
      id: 'betting-id',
      isParticipated: true,
    });

    await expect(
      service.claimBettingReward('betting-id', {
        id: 'user-id',
        nickname: 'user',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'betting_result_not_confirmed',
      },
      status: 409,
    });
  });
  it('배팅 이벤트가 아니면 보상을 수령할 수 없다', async () => {
    repository.detail = voteEventDetail({
      category: 'daily',
      id: 'daily-id',
      isParticipated: true,
    });

    await expect(
      service.claimBettingReward('daily-id', {
        id: 'user-id',
        nickname: 'user',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'betting_reward_not_allowed',
      },
      status: 422,
    });
  });
  it('미참여자는 배팅 보상을 수령할 수 없다', async () => {
    repository.detail = voteEventDetail({
      bettingResultOption: 'A',
      category: 'betting',
      id: 'betting-id',
      isParticipated: false,
    });

    await expect(
      service.claimBettingReward('betting-id', {
        id: 'user-id',
        nickname: 'user',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'betting_reward_forbidden',
      },
      status: 403,
    });
  });
  it('없는 투표 이벤트의 배팅 보상은 수령할 수 없다', async () => {
    repository.detail = null;

    await expect(
      service.claimBettingReward('missing-id', {
        id: 'user-id',
        nickname: 'user',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'vote_event_not_found',
      },
      status: 404,
    });
  });
});

function deadlineAtHoursFromNow(hours: number, minutes = 0): string {
  const deadlineAt = new Date();

  deadlineAt.setUTCHours(deadlineAt.getUTCHours() + hours, minutes, 0, 0);

  return deadlineAt.toISOString();
}
