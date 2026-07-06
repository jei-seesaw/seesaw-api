import type { VoteEventsService } from '../../src/vote-events/vote-events.service';
import {
  createVoteEventsServiceTestContext,
  FakeVoteEventsRepository,
} from './vote-events.service.fixture';

describe('VoteEventsService list', () => {
  let repository: FakeVoteEventsRepository;
  let service: VoteEventsService;

  beforeEach(() => {
    ({ repository, service } = createVoteEventsServiceTestContext());
  });

  it('참여한 진행중인 투표만 선택지 비율을 반환한다', async () => {
    repository.listResult = {
      hasNext: false,
      items: [
        {
          category: 'daily',
          cursorCreatedAt: '2026-07-01 11:00:00',
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
          cursorCreatedAt: '2026-07-01 11:00:00',
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
          cursorCreatedAt: '2026-07-01 11:00:00',
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
          cursorCreatedAt: '2026-07-01 11:00:00',
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
          cursorCreatedAt: '2026-07-01 11:00:00',
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
});
