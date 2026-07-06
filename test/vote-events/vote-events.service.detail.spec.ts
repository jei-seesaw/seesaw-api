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
      bettingResultConfirmedAt: null,
      bettingResultOption: null,
      category: 'daily',
      cursorCreatedAt: '2026-07-01 11:00:00',
      cursorDeadlineAt: '2026-07-01 12:00:00',
      id: 'detail-id',
      isCompleted: false,
      isOrganizer: false,
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
      bettingResultConfirmedAt: null,
      bettingResultOption: null,
      canConfirmBettingResult: false,
      categoryName: '일상',
      isOrganizer: false,
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
      bettingResultConfirmedAt: null,
      bettingResultOption: null,
      category: 'betting',
      cursorCreatedAt: '2026-07-01 11:00:00',
      cursorDeadlineAt: '2026-07-01 12:00:00',
      id: 'betting-detail-id',
      isCompleted: false,
      isOrganizer: false,
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
      { selectedOption: 'A', tokenAmount: 30, userId: 'education-a' },
      { selectedOption: 'B', tokenAmount: 10, userId: 'education-b' },
      { selectedOption: 'B', tokenAmount: 60, userId: 'holdings-a' },
    ];
    users.affiliations = [
      {
        affiliationCode: 'education',
        affiliationName: '재능교육',
        userId: 'education-a',
      },
      {
        affiliationCode: 'education',
        affiliationName: '재능교육',
        userId: 'education-b',
      },
      {
        affiliationCode: 'holdings',
        affiliationName: '재능홀딩스',
        userId: 'holdings-a',
      },
    ];

    const result = await service.getDetail('betting-detail-id', {
      id: 'user-id',
      nickname: 'user',
    });

    expect(result.affiliationStats).toEqual(
      expect.arrayContaining([
        {
          affiliationCode: 'education',
          affiliationName: '재능교육',
          optionARatio: 75,
          optionBRatio: 25,
        },
        {
          affiliationCode: 'holdings',
          affiliationName: '재능홀딩스',
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
      bettingResultConfirmedAt: null,
      bettingResultOption: null,
      category: 'daily',
      cursorCreatedAt: '2026-07-01 11:00:00',
      cursorDeadlineAt: '2026-07-01 12:00:00',
      id: 'completed-detail-id',
      isCompleted: true,
      isOrganizer: false,
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
      { selectedOption: 'A', tokenAmount: 0, userId: 'education-a' },
      { selectedOption: 'B', tokenAmount: 0, userId: 'education-b' },
      { selectedOption: 'B', tokenAmount: 0, userId: 'education-c' },
      { selectedOption: 'B', tokenAmount: 0, userId: 'education-d' },
    ];
    users.affiliations = [
      {
        affiliationCode: 'education',
        affiliationName: '재능교육',
        userId: 'education-a',
      },
      {
        affiliationCode: 'education',
        affiliationName: '재능교육',
        userId: 'education-b',
      },
      {
        affiliationCode: 'education',
        affiliationName: '재능교육',
        userId: 'education-c',
      },
      {
        affiliationCode: 'education',
        affiliationName: '재능교육',
        userId: 'education-d',
      },
    ];

    const result = await service.getDetail('completed-detail-id');

    expect(result).toMatchObject({
      affiliationStats: [
        {
          affiliationCode: 'education',
          affiliationName: '재능교육',
          optionARatio: 25,
          optionBRatio: 75,
        },
      ],
      bettingResultConfirmedAt: null,
      bettingResultOption: null,
      canConfirmBettingResult: false,
      isOrganizer: false,
      isParticipated: false,
      optionAResultAmount: 1,
      optionARatio: 25,
      optionBResultAmount: 3,
      optionBRatio: 75,
      remainingTime: null,
      selectedOption: null,
    });
  });
  it('마감됐지만 미확정인 배팅 투표 상세는 비율을 공개하고 정답은 null로 둔다', async () => {
    repository.detail = {
      bettingResultConfirmedAt: null,
      bettingResultOption: null,
      category: 'betting',
      cursorCreatedAt: '2026-07-01 11:00:00',
      cursorDeadlineAt: '2026-07-01 12:00:00',
      id: 'unconfirmed-completed-betting-id',
      isCompleted: true,
      isOrganizer: false,
      isParticipated: false,
      optionA: 'A',
      optionAImageUrl: null,
      optionAParticipantCount: 1,
      optionATokenAmount: 25,
      optionB: 'B',
      optionBImageUrl: null,
      optionBParticipantCount: 1,
      optionBTokenAmount: 75,
      remainingSeconds: 0,
      selectedOption: null,
      title: '미확정 완료 배팅 투표',
      totalParticipantCount: 2,
      totalTokenAmount: 100,
    };

    const result = await service.getDetail('unconfirmed-completed-betting-id');

    expect(result).toMatchObject({
      bettingResultConfirmedAt: null,
      bettingResultOption: null,
      canConfirmBettingResult: false,
      optionAResultAmount: 25,
      optionARatio: 25,
      optionBResultAmount: 75,
      optionBRatio: 75,
      remainingTime: null,
      totalTokenAmount: 100,
    });
  });
  it('주최자인 미확정 배팅 투표 상세는 결과 확정 가능 여부를 반환한다', async () => {
    repository.detail = {
      bettingResultConfirmedAt: null,
      bettingResultOption: null,
      category: 'betting',
      cursorCreatedAt: '2026-07-01 11:00:00',
      cursorDeadlineAt: '2026-07-01 12:00:00',
      id: 'organizer-detail-id',
      isCompleted: false,
      isOrganizer: true,
      isParticipated: false,
      optionA: 'A',
      optionAImageUrl: null,
      optionAParticipantCount: 0,
      optionATokenAmount: 0,
      optionB: 'B',
      optionBImageUrl: null,
      optionBParticipantCount: 0,
      optionBTokenAmount: 0,
      remainingSeconds: 120,
      selectedOption: null,
      title: '확정 가능한 배팅 투표',
      totalParticipantCount: 0,
      totalTokenAmount: 0,
    };

    const result = await service.getDetail('organizer-detail-id', {
      id: 'organizer-id',
      nickname: 'organizer',
    });

    expect(result).toMatchObject({
      bettingResultConfirmedAt: null,
      bettingResultOption: null,
      canConfirmBettingResult: true,
      isOrganizer: true,
      remainingTime: '00:02:00',
    });
  });
  it('확정된 배팅 투표 상세는 정답과 확정 시각을 반환한다', async () => {
    repository.detail = {
      bettingResultConfirmedAt: '2026-07-06T01:02:03.000Z',
      bettingResultOption: 'A',
      category: 'betting',
      cursorCreatedAt: '2026-07-01 11:00:00',
      cursorDeadlineAt: '2026-07-01 12:00:00',
      id: 'confirmed-detail-id',
      isCompleted: true,
      isOrganizer: true,
      isParticipated: false,
      optionA: 'A',
      optionAImageUrl: null,
      optionAParticipantCount: 1,
      optionATokenAmount: 10,
      optionB: 'B',
      optionBImageUrl: null,
      optionBParticipantCount: 1,
      optionBTokenAmount: 20,
      remainingSeconds: 0,
      selectedOption: null,
      title: '확정된 배팅 투표',
      totalParticipantCount: 2,
      totalTokenAmount: 30,
    };

    const result = await service.getDetail('confirmed-detail-id', {
      id: 'organizer-id',
      nickname: 'organizer',
    });

    expect(result).toMatchObject({
      bettingResultConfirmedAt: '2026-07-06T01:02:03.000Z',
      bettingResultOption: 'A',
      canConfirmBettingResult: false,
      isOrganizer: true,
      remainingTime: null,
    });
  });
});
