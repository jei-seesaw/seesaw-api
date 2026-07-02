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

  it('완료된 투표 목록을 최근 완료순으로 조회하고 결과 비율을 항상 반환한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-list-${Date.now()}-completed`;
    const now = new Date();
    const olderDailyId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: secondsFrom(now, -10),
      optionAParticipantCount: 1,
      optionBParticipantCount: 3,
      title: `${prefix}-older-daily`,
      totalParticipantCount: 4,
    });
    const recentBettingId = await insertVoteEvent({
      category: 'betting',
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
      recentBettingId,
      olderDailyId,
    ]);
    expect(body.data.voteEvents[0]).toMatchObject({
      categoryName: '배팅',
      isParticipated: false,
      optionARatio: 25,
      optionBRatio: 75,
      remainingTime: '00:00:00',
      totalTokenAmount: 100,
    });
    expect(body.data.voteEvents[1]).toMatchObject({
      categoryName: '일상',
      isParticipated: false,
      optionARatio: 25,
      optionBRatio: 75,
      remainingTime: '00:00:00',
      totalTokenAmount: null,
    });
    expect(typeof body.data.pageInfo.hasNext).toBe('boolean');
    expect(body.data.pageInfo.nextCursor).toEqual(
      body.data.pageInfo.hasNext ? expect.any(String) : null,
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
      .query({ limit: 1 })
      .expect(200);
    const firstPageData = (firstPage.body as ListCompletedVoteEventsEnvelope).data;

    expect(firstPageData.voteEvents.map((item) => item.id)).toEqual([firstId]);
    expect(firstPageData.pageInfo.hasNext).toBe(true);
    expect(firstPageData.pageInfo.nextCursor).toEqual(expect.any(String));

    const secondPage = await request(server)
      .get('/api/v2/completed-vote-events')
      .query({ cursor: firstPageData.pageInfo.nextCursor, limit: 1 })
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
