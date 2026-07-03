import type { Server } from 'node:http';
import request from 'supertest';
import {
  createVoteEventsE2eContext,
  minutesFrom,
  secondsFrom,
  type VoteEventsE2eContext,
} from './vote-events.e2e.fixture';
import type {
  ErrorEnvelope,
  ListCompletedVoteEventsEnvelope,
} from './vote-events.e2e.types';

describe('Vote events me list endpoints', () => {
  let context: VoteEventsE2eContext;
  let server: Server;
  let createUser: VoteEventsE2eContext['createUser'];
  let insertVoteEvent: VoteEventsE2eContext['insertVoteEvent'];
  let insertParticipation: VoteEventsE2eContext['insertParticipation'];
  let deleteListTestVoteEvents: VoteEventsE2eContext['deleteListTestVoteEvents'];

  beforeAll(async () => {
    context = await createVoteEventsE2eContext();
    ({
      server,
      createUser,
      insertVoteEvent,
      insertParticipation,
      deleteListTestVoteEvents,
    } = context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('내가 만든 진행/완료 투표만 최신 생성순으로 조회하고 cursor로 다음 페이지를 조회한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-me-${Date.now()}-created`;
    const { accessToken, userId } = await createUser(`${prefix}-owner`);
    const other = await createUser(`${prefix}-other`);
    const now = new Date();
    const olderOngoingId = await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -20),
      deadlineAt: minutesFrom(now, 30),
      optionAParticipantCount: 1,
      optionBParticipantCount: 3,
      organizerUserId: userId,
      title: `${prefix}-older-ongoing`,
      totalParticipantCount: 4,
    });
    const recentCompletedId = await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -10),
      deadlineAt: secondsFrom(now, -5),
      optionAParticipantCount: 1,
      optionBParticipantCount: 3,
      organizerUserId: userId,
      title: `${prefix}-recent-completed`,
      totalParticipantCount: 4,
    });
    await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -1),
      deadlineAt: minutesFrom(now, 30),
      organizerUserId: other.userId,
      title: `${prefix}-other-owner`,
      totalParticipantCount: 10,
    });
    await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -2),
      deadlineAt: minutesFrom(now, 30),
      title: `${prefix}-legacy-null-owner`,
      totalParticipantCount: 10,
    });

    const firstPage = await request(server)
      .get('/api/v2/me/created-vote-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ limit: 1 })
      .expect(200);
    const firstPageData = (firstPage.body as ListCompletedVoteEventsEnvelope).data;

    expect(firstPageData).not.toHaveProperty('mainVote');
    expect(firstPageData.voteEvents.map((item) => item.id)).toEqual([
      recentCompletedId,
    ]);
    expect(firstPageData.voteEvents[0]).toMatchObject({
      optionARatio: 25,
      optionBRatio: 75,
      remainingTime: '00:00:00',
    });
    expect(firstPageData.pageInfo.hasNext).toBe(true);
    expect(firstPageData.pageInfo.nextCursor).toEqual(expect.any(String));

    const secondPage = await request(server)
      .get('/api/v2/me/created-vote-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ cursor: firstPageData.pageInfo.nextCursor, limit: 1 })
      .expect(200);
    const secondPageData = (
      secondPage.body as ListCompletedVoteEventsEnvelope
    ).data;

    expect(secondPageData.voteEvents.map((item) => item.id)).toEqual([
      olderOngoingId,
    ]);
    expect(secondPageData.voteEvents[0]).toMatchObject({
      optionARatio: null,
      optionBRatio: null,
    });
  });

  it('내가 참여한 투표만 최신 생성순으로 조회한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-me-${Date.now()}-participated`;
    const { accessToken, userId } = await createUser(`${prefix}-user`);
    const other = await createUser(`${prefix}-other`);
    const now = new Date();
    const olderId = await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -30),
      deadlineAt: minutesFrom(now, 30),
      optionAParticipantCount: 1,
      optionBParticipantCount: 3,
      organizerUserId: other.userId,
      title: `${prefix}-older`,
      totalParticipantCount: 4,
    });
    const recentId = await insertVoteEvent({
      category: 'betting',
      createdAt: secondsFrom(now, -10),
      deadlineAt: minutesFrom(now, 30),
      optionATokenAmount: 25,
      optionBTokenAmount: 75,
      organizerUserId: other.userId,
      title: `${prefix}-recent`,
      totalParticipantCount: 2,
      totalTokenAmount: 100,
    });
    await insertVoteEvent({
      category: 'daily',
      createdAt: secondsFrom(now, -1),
      deadlineAt: minutesFrom(now, 30),
      organizerUserId: userId,
      title: `${prefix}-not-participated`,
      totalParticipantCount: 10,
    });
    await insertParticipation(olderId, userId);
    await insertParticipation(recentId, userId, 'A', 25);

    const response = await request(server)
      .get('/api/v2/me/participated-vote-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ limit: 10 })
      .expect(200);
    const body = response.body as ListCompletedVoteEventsEnvelope;

    expect(body.data).not.toHaveProperty('mainVote');
    expect(body.data.voteEvents.map((item) => item.id)).toEqual([
      recentId,
      olderId,
    ]);
    expect(body.data.voteEvents[0]).toMatchObject({
      isParticipated: true,
      optionARatio: 25,
      optionBRatio: 75,
      totalTokenAmount: 100,
    });
    expect(body.data.voteEvents[1]).toMatchObject({
      isParticipated: true,
      optionARatio: 25,
      optionBRatio: 75,
      totalTokenAmount: null,
    });
  });

  it('accessToken이 없거나 유효하지 않으면 내 투표 목록 조회를 거절한다', async () => {
    await request(server)
      .get('/api/v2/me/created-vote-events')
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });

    await request(server)
      .get('/api/v2/me/participated-vote-events')
      .set('Authorization', 'Bearer invalid-access-token')
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });
  });
});
