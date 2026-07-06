import type { Server } from 'node:http';
import request from 'supertest';
import { createVoteEventsE2eContext, minutesFrom, secondsFrom, type VoteEventsE2eContext } from './vote-events.e2e.fixture';
import type { ErrorEnvelope, ListCompletedVoteEventsEnvelope } from './vote-events.e2e.types';

describe('Vote events completed list endpoint', () => {
  let context: VoteEventsE2eContext;
  let server: Server;
  let insertVoteEvent: VoteEventsE2eContext['insertVoteEvent'];
  let deleteListTestVoteEvents: VoteEventsE2eContext['deleteListTestVoteEvents'];

  beforeAll(async () => {
    context = await createVoteEventsE2eContext();
    ({ server, insertVoteEvent, deleteListTestVoteEvents } = context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('완료된 투표 목록을 기본 최신 생성순과 최근 완료순으로 조회한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-list-${Date.now()}-completed`;
    const now = new Date();
    const olderDailyId = await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -1),
      deadlineAt: secondsFrom(now, -10),
      optionAParticipantCount: 1,
      optionBParticipantCount: 3,
      title: `${prefix}-older-daily`,
      totalParticipantCount: 4,
    });
    const recentBettingId = await insertVoteEvent({
      category: 'betting',
      createdAt: secondsFrom(now, -20),
      deadlineAt: secondsFrom(now, -5),
      optionATokenAmount: 25,
      optionBTokenAmount: 75,
      title: `${prefix}-recent-betting`,
      totalParticipantCount: 2,
      totalTokenAmount: 100,
    });
    await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(now, 10),
      title: `${prefix}-ongoing`,
      totalParticipantCount: 1000,
    });

    const response = await request(server)
      .get('/api/v2/completed-vote-events')
      .query({ limit: 2 })
      .expect(200);
    const body = response.body as ListCompletedVoteEventsEnvelope;

    expect(body.data).not.toHaveProperty('mainVote');
    expect(body.data.voteEvents.map((voteEvent) => voteEvent.id)).toEqual([
      olderDailyId,
      recentBettingId,
    ]);
    expect(body.data.voteEvents[0]).toMatchObject({
      categoryName: '일상',
      isParticipated: false,
      optionARatio: 25,
      optionBRatio: 75,
      remainingTime: '00:00:00',
      totalTokenAmount: null,
    });
    expect(body.data.voteEvents[1]).toMatchObject({
      categoryName: '배팅',
      isParticipated: false,
      optionARatio: 25,
      optionBRatio: 75,
      remainingTime: '00:00:00',
      totalTokenAmount: 100,
    });
    expect(typeof body.data.pageInfo.hasNext).toBe('boolean');
    expect(body.data.pageInfo.nextCursor).toEqual(
      body.data.pageInfo.hasNext ? expect.any(String) : null,
    );

    const deadlineResponse = await request(server)
      .get('/api/v2/completed-vote-events')
      .query({ limit: 2, sort: 'deadline' })
      .expect(200);
    const deadlineBody =
      deadlineResponse.body as ListCompletedVoteEventsEnvelope;

    expect(deadlineBody.data.voteEvents.map((voteEvent) => voteEvent.id)).toEqual([
      recentBettingId,
      olderDailyId,
    ]);
  });

  it('category와 participants 정렬로 완료된 투표 목록을 조회한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-list-${Date.now()}-completed-category`;
    const now = new Date();
    const smallerDailyId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: secondsFrom(now, -10),
      title: `${prefix}-small-daily`,
      totalParticipantCount: 1_000_001,
    });
    const biggerDailyId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: secondsFrom(now, -20),
      title: `${prefix}-big-daily`,
      totalParticipantCount: 1_000_002,
    });
    await insertVoteEvent({
      category: 'betting',
      deadlineAt: secondsFrom(now, -5),
      title: `${prefix}-filtered-betting`,
      totalParticipantCount: 2_000_000,
    });

    const response = await request(server)
      .get('/api/v2/completed-vote-events')
      .query({ category: 'daily', limit: 2, sort: 'participants' })
      .expect(200);
    const body = response.body as ListCompletedVoteEventsEnvelope;

    expect(body.data.voteEvents.map((voteEvent) => voteEvent.id)).toEqual([
      biggerDailyId,
      smallerDailyId,
    ]);
    expect(body.data.voteEvents.every((item) => item.categoryName === '일상')).toBe(
      true,
    );
  });
  it('cursor로 다음 완료된 투표 목록을 조회한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-cursor-${Date.now()}-completed`;
    const now = new Date();
    const firstId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: secondsFrom(now, -5),
      title: `${prefix}-first`,
      totalParticipantCount: 1,
    });
    const secondId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: secondsFrom(now, -10),
      title: `${prefix}-second`,
      totalParticipantCount: 1,
    });
    await insertVoteEvent({
      category: 'daily',
      deadlineAt: secondsFrom(now, -15),
      title: `${prefix}-third`,
      totalParticipantCount: 1,
    });

    const firstPage = await request(server)
      .get('/api/v2/completed-vote-events')
      .query({ limit: 1, sort: 'deadline' })
      .expect(200);
    const firstPageData = (firstPage.body as ListCompletedVoteEventsEnvelope).data;

    expect(firstPageData.voteEvents.map((item) => item.id)).toEqual([firstId]);
    expect(firstPageData.pageInfo.hasNext).toBe(true);
    expect(firstPageData.pageInfo.nextCursor).toEqual(expect.any(String));

    const secondPage = await request(server)
      .get('/api/v2/completed-vote-events')
      .query({
        cursor: firstPageData.pageInfo.nextCursor,
        limit: 1,
        sort: 'deadline',
      })
      .expect(200);
    const secondPageData = (secondPage.body as ListCompletedVoteEventsEnvelope).data;

    expect(secondPageData.voteEvents.map((item) => item.id)).toEqual([secondId]);
  });
  it('잘못된 cursor로 완료된 투표 목록을 조회하면 거절한다', () => {
    return request(server)
      .get('/api/v2/completed-vote-events')
      .query({ cursor: 'not-a-cursor' })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_cursor',
        );
      });
  });
  it('잘못된 accessToken이 있으면 완료된 투표 목록 조회를 거절한다', () => {
    return request(server)
      .get('/api/v2/completed-vote-events')
      .set('Authorization', 'Bearer invalid-access-token')
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });
  });
});
