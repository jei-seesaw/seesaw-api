import type { Server } from 'node:http';
import request from 'supertest';
import {
  createVoteEventsE2eContext,
  minutesFrom,
  secondsFrom,
  type VoteEventsE2eContext,
} from './vote-events.e2e.fixture';
import type { ErrorEnvelope, ListVoteEventsEnvelope, VoteEventListItem } from './vote-events.e2e.types';

describe('Vote events ongoing list endpoint', () => {
  let context: VoteEventsE2eContext;
  let server: Server;
  let createUser: VoteEventsE2eContext['createUser'];
  let insertVoteEvent: VoteEventsE2eContext['insertVoteEvent'];
  let insertParticipation: VoteEventsE2eContext['insertParticipation'];
  let deleteListTestVoteEvents: VoteEventsE2eContext['deleteListTestVoteEvents'];

  beforeAll(async () => {
    context = await createVoteEventsE2eContext();
    ({ server, createUser, insertVoteEvent, insertParticipation, deleteListTestVoteEvents } = context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('진행중인 투표 목록을 메인 투표와 선택한 정렬 목록으로 조회한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-list-${Date.now()}`;
    const now = new Date();
    const mainId = await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -40),
      deadlineAt: minutesFrom(now, 60),
      optionAParticipantCount: 900,
      optionBParticipantCount: 100,
      title: `${prefix}-main`,
      totalParticipantCount: 1000,
    });
    const deadlineId = await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -20),
      deadlineAt: minutesFrom(now, 10),
      optionAImageUrl: 'https://example.com/a.jpg',
      optionAParticipantCount: 1,
      optionBParticipantCount: 2,
      title: `${prefix}-deadline`,
      totalParticipantCount: 3,
    });
    const participantId = await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -10),
      deadlineAt: minutesFrom(now, 30),
      title: `${prefix}-participants`,
      totalParticipantCount: 50,
    });
    const latestId = await insertVoteEvent({
      category: 'betting',
      createdAt: secondsFrom(now, -1),
      deadlineAt: minutesFrom(now, 20),
      optionATokenAmount: 25,
      optionBTokenAmount: 75,
      title: `${prefix}-latest`,
      totalParticipantCount: 2,
      totalTokenAmount: 100,
    });
    await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, -10),
      title: `${prefix}-done`,
      totalParticipantCount: 2000,
    });

    const response = await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ limit: 3 })
      .expect(200);
    const body = response.body as ListVoteEventsEnvelope;

    expect(body.data.mainVote).toMatchObject({
      id: mainId,
      categoryName: '일상',
      isParticipated: false,
      optionARatio: null,
      optionBRatio: null,
      title: `${prefix}-main`,
      totalParticipantCount: 1000,
      totalTokenAmount: null,
    });
    expect(body.data.mainVote?.remainingTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(body.data.otherVoteEvents.map((voteEvent) => voteEvent.id)).toEqual([
      latestId,
      participantId,
      deadlineId,
    ]);
    expect(body.data.otherVoteEvents[2]).toMatchObject({
      categoryName: '일상',
      optionAImageUrl: 'https://example.com/a.jpg',
      optionBImageUrl: null,
      optionARatio: null,
      optionBRatio: null,
      totalTokenAmount: null,
    });
    expect(body.data.otherVoteEvents[0]).toMatchObject({
      categoryName: '배팅',
      totalTokenAmount: 100,
    });
    expect(typeof body.data.pageInfo.hasNext).toBe('boolean');

    const deadlineResponse = await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ limit: 3, sort: 'deadline' })
      .expect(200);
    const deadlineBody = deadlineResponse.body as ListVoteEventsEnvelope;

    expect(
      deadlineBody.data.otherVoteEvents.map((voteEvent) => voteEvent.id),
    ).toEqual([deadlineId, latestId, participantId]);

    const participantsResponse = await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ limit: 3, sort: 'participants' })
      .expect(200);
    const participantsBody = participantsResponse.body as ListVoteEventsEnvelope;

    expect(
      participantsBody.data.otherVoteEvents.map((voteEvent) => voteEvent.id),
    ).toEqual([participantId, deadlineId, latestId]);
  });

  it('category가 진행중인 투표 mainVote와 목록을 함께 제한한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-list-${Date.now()}-category`;
    const now = new Date();
    await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 60),
      title: `${prefix}-daily-main`,
      totalParticipantCount: 2_000_000,
    });
    const bettingMainId = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(now, 50),
      title: `${prefix}-betting-main`,
      totalParticipantCount: 1_000_000,
    });
    const bettingOtherId = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(now, 10),
      title: `${prefix}-betting-other`,
      totalParticipantCount: 999_999,
    });

    const response = await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ category: 'betting', limit: 10 })
      .expect(200);
    const body = response.body as ListVoteEventsEnvelope;

    expect(body.data.mainVote).toMatchObject({
      categoryName: '배팅',
      id: bettingMainId,
    });
    expect(body.data.otherVoteEvents.map((voteEvent) => voteEvent.id)).toContain(
      bettingOtherId,
    );
    expect(
      body.data.otherVoteEvents.every(
        (voteEvent) => voteEvent.categoryName === '배팅',
      ),
    ).toBe(true);
  });
  it('mainVote는 참여자 수가 같으면 마감이 더 임박한 진행중 투표를 선택한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-list-${Date.now()}-main-tie`;
    const now = new Date();
    const laterDeadlineId = await insertVoteEvent({
      category: 'balance',
      createdAt: secondsFrom(now, -10),
      deadlineAt: minutesFrom(now, 60),
      id: '00000000-0000-4000-8000-000000000001',
      title: `${prefix}-later-deadline`,
      totalParticipantCount: 2_000_000,
    });
    const earlierDeadlineId = await insertVoteEvent({
      category: 'balance',
      createdAt: secondsFrom(now, -20),
      deadlineAt: minutesFrom(now, 10),
      id: '00000000-0000-4000-8000-000000000002',
      title: `${prefix}-earlier-deadline`,
      totalParticipantCount: 2_000_000,
    });

    const response = await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ category: 'balance', limit: 10 })
      .expect(200);
    const body = response.body as ListVoteEventsEnvelope;

    expect(body.data.mainVote?.id).toBe(earlierDeadlineId);
    expect(body.data.otherVoteEvents.map((voteEvent) => voteEvent.id)).toContain(
      laterDeadlineId,
    );
  });
  it('로그인한 사용자가 참여한 투표만 선택지 비율을 조회한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-ratio-${Date.now()}`;
    const { accessToken, userId } = await createUser(prefix);
    const now = new Date();
    const dailyId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 10),
      optionAParticipantCount: 1,
      optionBParticipantCount: 2,
      title: `${prefix}-daily`,
      totalParticipantCount: 3,
    });
    const bettingId = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(now, 20),
      optionATokenAmount: 25,
      optionBTokenAmount: 75,
      title: `${prefix}-betting`,
      totalParticipantCount: 2,
      totalTokenAmount: 100,
    });
    const hiddenRatioId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 30),
      optionAParticipantCount: 3,
      optionBParticipantCount: 1,
      title: `${prefix}-hidden`,
      totalParticipantCount: 4,
    });
    await insertParticipation(dailyId, userId);
    await insertParticipation(bettingId, userId);

    const response = await request(server)
      .get('/api/v2/ongoing-vote-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ limit: 10 })
      .expect(200);
    const body = response.body as ListVoteEventsEnvelope;
    const items = [
      body.data.mainVote,
      ...body.data.otherVoteEvents,
    ].filter((item): item is VoteEventListItem => item !== null);

    expect(items.find((item) => item.id === dailyId)).toMatchObject({
      isParticipated: true,
      optionARatio: 33.33,
      optionBRatio: 66.67,
    });
    expect(items.find((item) => item.id === bettingId)).toMatchObject({
      isParticipated: true,
      optionARatio: 25,
      optionBRatio: 75,
      totalTokenAmount: 100,
    });
    expect(items.find((item) => item.id === hiddenRatioId)).toMatchObject({
      isParticipated: false,
      optionARatio: null,
      optionBRatio: null,
    });
  });
  it('non-default sort/category cursor로 다음 진행중인 투표 목록을 조회한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-cursor-${Date.now()}`;
    const now = new Date();
    const mainId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 60),
      title: `${prefix}-main`,
      totalParticipantCount: 1000,
    });
    const firstId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 10),
      title: `${prefix}-first`,
      totalParticipantCount: 10,
    });
    const secondId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 20),
      title: `${prefix}-second`,
      totalParticipantCount: 5,
    });
    await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(now, 5),
      title: `${prefix}-filtered`,
      totalParticipantCount: 999,
    });

    const firstPage = await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ category: 'daily', limit: 1, sort: 'participants' })
      .expect(200);
    const firstPageData = (firstPage.body as ListVoteEventsEnvelope).data;

    expect(firstPageData.mainVote?.id).toBe(mainId);
    expect(firstPageData.otherVoteEvents.map((item) => item.id)).toEqual([
      firstId,
    ]);
    expect(firstPageData.pageInfo.hasNext).toBe(true);
    expect(firstPageData.pageInfo.nextCursor).toEqual(expect.any(String));

    const secondPage = await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({
        category: 'daily',
        cursor: firstPageData.pageInfo.nextCursor,
        limit: 1,
        sort: 'participants',
      })
      .expect(200);
    const secondPageData = (secondPage.body as ListVoteEventsEnvelope).data;

    expect(secondPageData.mainVote).toBeNull();
    expect(secondPageData.otherVoteEvents.map((item) => item.id)).toEqual([
      secondId,
    ]);

    await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({
        category: 'daily',
        cursor: firstPageData.pageInfo.nextCursor,
        limit: 1,
        sort: 'latest',
      })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_cursor',
        );
      });

    await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({
        category: 'betting',
        cursor: firstPageData.pageInfo.nextCursor,
        limit: 1,
        sort: 'participants',
      })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_cursor',
        );
      });
  });
  it('잘못된 cursor로 진행중인 투표 목록을 조회하면 거절한다', () => {
    return request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ cursor: 'not-a-cursor' })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_cursor',
        );
      });
  });

  it('잘못된 sort 또는 category로 진행중인 투표 목록을 조회하면 거절한다', async () => {
    await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ sort: 'unknown' })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });

    await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ category: 'unknown' })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });
  });
  it('잘못된 accessToken이 있으면 진행중인 투표 목록 조회를 거절한다', () => {
    return request(server)
      .get('/api/v2/ongoing-vote-events')
      .set('Authorization', 'Bearer invalid-access-token')
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });
  });
});
