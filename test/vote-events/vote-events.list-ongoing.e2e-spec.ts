import type { Server } from 'node:http';
import request from 'supertest';
import { createVoteEventsE2eContext, minutesFrom, type VoteEventsE2eContext } from './vote-events.e2e.fixture';
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

  it('진행중인 투표 목록을 메인 투표와 마감임박순 목록으로 조회한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-list-${Date.now()}`;
    const now = new Date();
    const mainId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 60),
      optionAParticipantCount: 900,
      optionBParticipantCount: 100,
      title: `${prefix}-main`,
      totalParticipantCount: 1000,
    });
    const firstId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 10),
      optionAImageUrl: 'https://example.com/a.jpg',
      optionAParticipantCount: 1,
      optionBParticipantCount: 2,
      title: `${prefix}-first`,
      totalParticipantCount: 3,
    });
    const secondId = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(now, 20),
      optionATokenAmount: 25,
      optionBTokenAmount: 75,
      title: `${prefix}-second`,
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
      .query({ limit: 2 })
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
      firstId,
      secondId,
    ]);
    expect(body.data.otherVoteEvents[0]).toMatchObject({
      categoryName: '일상',
      optionAImageUrl: 'https://example.com/a.jpg',
      optionBImageUrl: null,
      optionARatio: null,
      optionBRatio: null,
      totalTokenAmount: null,
    });
    expect(body.data.otherVoteEvents[1]).toMatchObject({
      categoryName: '배팅',
      totalTokenAmount: 100,
    });
    expect(typeof body.data.pageInfo.hasNext).toBe('boolean');
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
  it('cursor로 다음 진행중인 투표 목록을 조회할 때 mainVote를 반복하지 않는다', async () => {
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
      totalParticipantCount: 1,
    });
    const secondId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 20),
      title: `${prefix}-second`,
      totalParticipantCount: 1,
    });

    const firstPage = await request(server)
      .get('/api/v2/ongoing-vote-events')
      .query({ limit: 1 })
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
      .query({ cursor: firstPageData.pageInfo.nextCursor, limit: 1 })
      .expect(200);
    const secondPageData = (secondPage.body as ListVoteEventsEnvelope).data;

    expect(secondPageData.mainVote).toBeNull();
    expect(secondPageData.otherVoteEvents.map((item) => item.id)).toEqual([
      secondId,
    ]);
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
