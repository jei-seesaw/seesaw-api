import { VoteEvent } from '../../src/vote-events/vote-event.entity';
import {
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
    });
    expect(
      createdVoteEvent.deadlineAt.getTime() -
        createdVoteEvent.createdAt.getTime(),
    ).toBe(24 * 60 * 60 * 1000);
    expect(createdVoteEvent.createdAt.getTime()).toBeGreaterThanOrEqual(
      startedAt,
    );
  });
});

class FakeVoteEventsRepository implements VoteEventsRepository {
  createdVoteEvent?: VoteEvent;

  create(voteEvent: VoteEvent): Promise<VoteEvent> {
    this.createdVoteEvent = voteEvent;

    return Promise.resolve(voteEvent);
  }
}
