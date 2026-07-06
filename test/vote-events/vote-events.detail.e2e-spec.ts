import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { createVoteEventsE2eContext, minutesFrom, secondsFrom, type VoteEventsE2eContext } from './vote-events.e2e.fixture';
import type { ErrorEnvelope, VoteEventDetailEnvelope } from './vote-events.e2e.types';

describe('Vote events detail endpoint', () => {
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

  it('진행중인 투표 상세는 미참여자에게 결과 정보를 숨긴다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-detail-${Date.now()}`;
    const id = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(new Date(), 10),
      optionAParticipantCount: 1,
      optionBParticipantCount: 2,
      title: `${prefix}-hidden`,
      totalParticipantCount: 3,
    });

    const response = await request(server)
      .get(`/api/v2/vote-events/${id}`)
      .expect(200);
    const data = (response.body as VoteEventDetailEnvelope).data;

    expect(data).toMatchObject({
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
      selectedOption: null,
      title: `${prefix}-hidden`,
      totalParticipantCount: 3,
      totalTokenAmount: null,
    });
    expect(data.remainingTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
  it('참여한 진행중인 배팅 투표 상세는 토큰 기준 결과와 소속별 통계를 반환한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-detail-${Date.now()}`;
    const educationA = await createUser(`${prefix}-education-a`);
    const educationB = await createUser(`${prefix}-education-b`);
    const holdings = await createUser(`${prefix}-holdings`, 'holdings');
    const id = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(new Date(), 10),
      optionATokenAmount: 40,
      optionBTokenAmount: 60,
      title: `${prefix}-betting`,
      totalParticipantCount: 3,
      totalTokenAmount: 100,
    });
    await insertParticipation(id, educationA.userId, 'A', 30);
    await insertParticipation(id, educationB.userId, 'B', 10);
    await insertParticipation(id, holdings.userId, 'B', 60);

    const response = await request(server)
      .get(`/api/v2/vote-events/${id}`)
      .set('Authorization', `Bearer ${educationB.accessToken}`)
      .expect(200);
    const data = (response.body as VoteEventDetailEnvelope).data;

    expect(data).toMatchObject({
      categoryName: '배팅',
      isParticipated: true,
      optionAResultAmount: 40,
      optionARatio: 40,
      optionBResultAmount: 60,
      optionBRatio: 60,
      selectedOption: 'B',
      totalParticipantCount: 3,
      totalTokenAmount: 100,
    });
    expect(data.affiliationStats).toEqual(
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
  });
  it('완료된 투표 상세는 비로그인 요청에도 결과 정보를 반환한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-detail-${Date.now()}`;
    const userA = await createUser(`${prefix}-a`);
    const userB1 = await createUser(`${prefix}-b1`);
    const userB2 = await createUser(`${prefix}-b2`);
    const userB3 = await createUser(`${prefix}-b3`);
    const id = await insertVoteEvent({
      category: 'daily',
      deadlineAt: secondsFrom(new Date(), -5),
      optionAParticipantCount: 1,
      optionBParticipantCount: 3,
      title: `${prefix}-completed`,
      totalParticipantCount: 4,
    });
    await insertParticipation(id, userA.userId, 'A');
    await insertParticipation(id, userB1.userId, 'B');
    await insertParticipation(id, userB2.userId, 'B');
    await insertParticipation(id, userB3.userId, 'B');

    const response = await request(server)
      .get(`/api/v2/vote-events/${id}`)
      .expect(200);
    const data = (response.body as VoteEventDetailEnvelope).data;

    expect(data).toMatchObject({
      affiliationStats: [
        {
          affiliationCode: 'education',
          affiliationName: '재능교육',
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
  it('없는 투표 이벤트 상세를 조회하면 거절한다', () => {
    return request(server)
      .get(`/api/v2/vote-events/${randomUUID()}`)
      .expect(404)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'vote_event_not_found',
        );
      });
  });
  it('잘못된 accessToken이 있으면 투표 상세 조회를 거절한다', () => {
    return request(server)
      .get(`/api/v2/vote-events/${randomUUID()}`)
      .set('Authorization', 'Bearer invalid-access-token')
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });
  });
});
