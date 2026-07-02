import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { createVoteEventsE2eContext, minutesFrom, secondsFrom, type VoteEventsE2eContext } from './vote-events.e2e.fixture';
import type { ErrorEnvelope } from './vote-events.e2e.types';

describe('Vote events vote endpoint', () => {
  let context: VoteEventsE2eContext;
  let orm: VoteEventsE2eContext['orm'];
  let server: Server;
  let issueAccessToken: VoteEventsE2eContext['issueAccessToken'];
  let createUser: VoteEventsE2eContext['createUser'];
  let insertVoteEvent: VoteEventsE2eContext['insertVoteEvent'];
  let deleteListTestVoteEvents: VoteEventsE2eContext['deleteListTestVoteEvents'];
  let expectVoteEventAggregate: VoteEventsE2eContext['expectVoteEventAggregate'];
  let expectParticipation: VoteEventsE2eContext['expectParticipation'];
  let expectNoParticipation: VoteEventsE2eContext['expectNoParticipation'];
  let expectUserVoteToken: VoteEventsE2eContext['expectUserVoteToken'];

  beforeAll(async () => {
    context = await createVoteEventsE2eContext();
    ({ server, orm, issueAccessToken, createUser, insertVoteEvent, deleteListTestVoteEvents, expectVoteEventAggregate, expectParticipation, expectNoParticipation, expectUserVoteToken } = context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('일반 투표를 진행하면 참여 기록과 참여자 집계를 저장한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-api-${Date.now()}`;
    const { accessToken, userId } = await createUser(`${prefix}-daily-user`);
    const voteEventId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(new Date(), 10),
      title: `${prefix}-daily`,
      totalParticipantCount: 0,
    });

    await request(server)
      .post('/api/v2/vote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        selectedOption: 'A',
        voteEventId,
      })
      .expect(200)
      .expect((response: { body: unknown }) => {
        expect(response.body).toEqual({ data: null });
      });

    await expectVoteEventAggregate(voteEventId, {
      optionAParticipantCount: 1,
      optionATokenAmount: 0,
      optionBParticipantCount: 0,
      optionBTokenAmount: 0,
      totalParticipantCount: 1,
      totalTokenAmount: 0,
    });
    await expectParticipation(voteEventId, userId, 'A', 0);
    await expectUserVoteToken(userId, 1000);
  });
  it('배팅 투표를 진행하면 토큰 집계와 사용자 토큰 차감을 저장한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-api-${Date.now()}`;
    const { accessToken, userId } = await createUser(`${prefix}-betting-user`);
    const voteEventId = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(new Date(), 10),
      title: `${prefix}-betting`,
      totalParticipantCount: 0,
    });

    await request(server)
      .post('/api/v2/vote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        selectedOption: 'B',
        tokenAmount: 25,
        voteEventId,
      })
      .expect(200)
      .expect((response: { body: unknown }) => {
        expect(response.body).toEqual({ data: null });
      });

    await expectVoteEventAggregate(voteEventId, {
      optionAParticipantCount: 0,
      optionATokenAmount: 0,
      optionBParticipantCount: 1,
      optionBTokenAmount: 25,
      totalParticipantCount: 1,
      totalTokenAmount: 25,
    });
    await expectParticipation(voteEventId, userId, 'B', 25);
    await expectUserVoteToken(userId, 975);
  });
  it('accessToken이 없으면 투표 진행을 거절한다', () => {
    return request(server)
      .post('/api/v2/vote')
      .send({
        selectedOption: 'A',
        voteEventId: randomUUID(),
      })
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });
  });
  it('투표 진행 요청 body가 유효하지 않으면 요청 경계에서 거절한다', async () => {
    const accessToken = await issueAccessToken(`invalid-vote-${Date.now()}`);

    return request(server)
      .post('/api/v2/vote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        selectedOption: 'C',
        tokenAmount: 0,
        voteEventId: '',
      })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });
  });
  it('이미 참여한 투표 이벤트에는 다시 투표할 수 없다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-api-${Date.now()}`;
    const { accessToken } = await createUser(`${prefix}-duplicate-user`);
    const voteEventId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(new Date(), 10),
      title: `${prefix}-duplicate`,
      totalParticipantCount: 0,
    });

    await request(server)
      .post('/api/v2/vote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ selectedOption: 'A', voteEventId })
      .expect(200);

    await request(server)
      .post('/api/v2/vote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ selectedOption: 'B', voteEventId })
      .expect(409)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'vote_event_already_participated',
        );
      });
  });
  it('마감된 투표 이벤트에는 투표할 수 없다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-api-${Date.now()}`;
    const { accessToken } = await createUser(`${prefix}-closed-user`);
    const voteEventId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: secondsFrom(new Date(), -5),
      title: `${prefix}-closed`,
      totalParticipantCount: 0,
    });

    await request(server)
      .post('/api/v2/vote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ selectedOption: 'A', voteEventId })
      .expect(409)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'vote_event_closed',
        );
      });
  });
  it('배팅 투표에서 보유 토큰이 부족하면 참여 기록을 남기지 않는다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-api-${Date.now()}`;
    const { accessToken, userId } = await createUser(`${prefix}-token-user`);
    await orm.em.getConnection().execute(
      'update `users` set `vote_token` = ? where `id` = ?',
      [10, userId],
    );
    const voteEventId = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(new Date(), 10),
      title: `${prefix}-insufficient`,
      totalParticipantCount: 0,
    });

    await request(server)
      .post('/api/v2/vote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ selectedOption: 'A', tokenAmount: 20, voteEventId })
      .expect(409)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'insufficient_vote_token',
        );
      });

    await expectVoteEventAggregate(voteEventId, {
      optionAParticipantCount: 0,
      optionATokenAmount: 0,
      optionBParticipantCount: 0,
      optionBTokenAmount: 0,
      totalParticipantCount: 0,
      totalTokenAmount: 0,
    });
    await expectNoParticipation(voteEventId, userId);
    await expectUserVoteToken(userId, 10);
  });
});
