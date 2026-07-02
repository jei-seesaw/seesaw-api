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
});
