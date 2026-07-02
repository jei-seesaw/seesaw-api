import type { VoteEventsService } from '../../src/vote-events/vote-events.service';
import {
  createVoteEventsServiceTestContext,
  FakeVoteEventsRepository,
  FakeUsersRepository,
} from './vote-events.service.fixture';

describe('VoteEventsService detail', () => {
  let repository: FakeVoteEventsRepository;
  let service: VoteEventsService;
  let users: FakeUsersRepository;

  beforeEach(() => {
    ({ repository, service, users } = createVoteEventsServiceTestContext());
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
