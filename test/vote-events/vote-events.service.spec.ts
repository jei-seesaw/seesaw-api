import { VoteEvent } from '../../src/vote-events/vote-event.entity';
import {
  OngoingVoteEventsPage,
  VoteEventsRepository,
} from '../../src/vote-events/vote-events.repository';
import { VoteEventsService } from '../../src/vote-events/vote-events.service';

describe('VoteEventsService', () => {
  let repository: FakeVoteEventsRepository;
  let service: VoteEventsService;

  beforeEach(() => {
    repository = new FakeVoteEventsRepository();
    service = new VoteEventsService(repository);
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
});

class FakeVoteEventsRepository implements VoteEventsRepository {
  createdVoteEvent?: VoteEvent;
  listResult: OngoingVoteEventsPage = {
    hasNext: false,
    items: [],
    mainVote: null,
  };

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
}
