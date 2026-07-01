import { MikroORM } from '@mikro-orm/mariadb';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_PREFIX } from '../../src/config/api-prefix';

describe('Vote events endpoint', () => {
  let app: INestApplication;
  let server: Server;
  let orm: MikroORM;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
    server = app.getHttpServer() as Server;
    orm = app.get(MikroORM);
  });

  afterAll(async () => {
    await app.close();
  });

  it('투표 이벤트를 만들면 id만 응답하고 초기 집계값을 저장한다', async () => {
    const startedAt = Date.now();
    const accessToken = await issueAccessToken(`vote-event-${startedAt}`);

    const response = await request(server)
      .post('/api/v2/vote-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        category: 'betting',
        optionA: '김치찌개',
        optionAImageUrl: null,
        optionB: '돈까스',
        optionBImageUrl: 'https://example.com/b.jpg',
        title: `점심 메뉴는? ${startedAt}`,
      })
      .expect(201)
      .expect((response: { body: unknown }) => {
        expect(Object.keys((response.body as CreateVoteEventEnvelope).data)).toEqual([
          'id',
        ]);
      });

    const { id } = (response.body as CreateVoteEventEnvelope).data;
    const rows = await orm.em.getConnection().execute<VoteEventRow[]>(
      'select `category`, `title`, `option_a`, `option_b`, `option_a_image_url`, `option_b_image_url`, `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `option_a_participant_count`, `option_b_participant_count`, `created_at`, `deadline_at` from `vote_events` where `id` = ?',
      [id],
    );

    expect(rows).toHaveLength(1);
    const row = rows[0]!;

    expect(row).toMatchObject({
      category: 'betting',
      option_a: '김치찌개',
      option_a_image_url: null,
      option_b: '돈까스',
      option_b_image_url: 'https://example.com/b.jpg',
      total_participant_count: 0,
      total_token_amount: 0,
      option_a_token_amount: 0,
      option_b_token_amount: 0,
      option_a_participant_count: 0,
      option_b_participant_count: 0,
    });
    expect(
      new Date(row.deadline_at).getTime() -
        new Date(row.created_at).getTime(),
    ).toBe(24 * 60 * 60 * 1000);
  });

  it('accessToken이 없으면 투표 이벤트 생성을 거절한다', () => {
    return request(server)
      .post('/api/v2/vote-events')
      .send({
        category: 'betting',
        optionA: '김치찌개',
        optionB: '돈까스',
        title: '점심 메뉴는?',
      })
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });
  });

  it('투표 이벤트 요청 body가 유효하지 않으면 요청 경계에서 거절한다', async () => {
    const accessToken = await issueAccessToken(`invalid-vote-event-${Date.now()}`);

    return request(server)
      .post('/api/v2/vote-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        category: 'unknown',
        optionA: '',
        optionAImageUrl: 'not-a-url',
        optionB: '',
        title: '',
      })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });
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
    const teacherA = await createUser(`${prefix}-teacher-a`);
    const teacherB = await createUser(`${prefix}-teacher-b`);
    const headquarters = await createUser(
      `${prefix}-headquarters`,
      'headquarters',
    );
    const id = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(new Date(), 10),
      optionATokenAmount: 40,
      optionBTokenAmount: 60,
      title: `${prefix}-betting`,
      totalParticipantCount: 3,
      totalTokenAmount: 100,
    });
    await insertParticipation(id, teacherA.userId, 'A', 30);
    await insertParticipation(id, teacherB.userId, 'B', 10);
    await insertParticipation(id, headquarters.userId, 'B', 60);

    const response = await request(server)
      .get(`/api/v2/vote-events/${id}`)
      .set('Authorization', `Bearer ${teacherB.accessToken}`)
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

  async function issueAccessToken(nickname: string): Promise<string> {
    return (await createUser(nickname)).accessToken;
  }

  async function createUser(
    nickname: string,
    affiliationCode = 'teacher',
  ): Promise<{ accessToken: string; userId: string }> {
    await request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode,
        nickname,
        password: 'password123',
      })
      .expect(201);

    const response = await request(server)
      .post('/api/v2/auth/login')
      .send({ nickname, password: 'password123' })
      .expect(200);
    const rows = await orm.em.getConnection().execute<Array<{ id: string }>>(
      'select `id` from `users` where `nickname` = ?',
      [nickname],
    );

    return {
      accessToken: (response.body as LoginEnvelope).data.accessToken,
      userId: rows[0]!.id,
    };
  }

  async function insertVoteEvent(args: {
    category: 'betting' | 'daily' | 'balance' | 'work';
    deadlineAt: Date;
    optionAImageUrl?: string | null;
    optionAParticipantCount?: number;
    optionATokenAmount?: number;
    optionBImageUrl?: string | null;
    optionBParticipantCount?: number;
    optionBTokenAmount?: number;
    title: string;
    totalParticipantCount: number;
    totalTokenAmount?: number;
  }): Promise<string> {
    const id = randomUUID();

    await orm.em.getConnection().execute(
      'insert into `vote_events` (`id`, `category`, `title`, `option_a`, `option_b`, `option_a_image_url`, `option_b_image_url`, `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `option_a_participant_count`, `option_b_participant_count`, `deadline_at`, `created_at`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        args.category,
        args.title,
        'A',
        'B',
        args.optionAImageUrl ?? null,
        args.optionBImageUrl ?? null,
        args.totalParticipantCount,
        args.totalTokenAmount ?? 0,
        args.optionATokenAmount ?? 0,
        args.optionBTokenAmount ?? 0,
        args.optionAParticipantCount ?? 0,
        args.optionBParticipantCount ?? 0,
        args.deadlineAt,
        new Date(),
      ],
    );

    return id;
  }

  async function insertParticipation(
    voteEventId: string,
    userId: string,
    selectedOption?: 'A' | 'B',
    tokenAmount = 0,
  ): Promise<void> {
    await orm.em.getConnection().execute(
      'insert into `vote_event_participations` (`id`, `vote_event_id`, `user_id`, `selected_option`, `token_amount`, `created_at`) values (?, ?, ?, ?, ?, ?)',
      [
        randomUUID(),
        voteEventId,
        userId,
        selectedOption ?? null,
        tokenAmount,
        new Date(),
      ],
    );
  }

  async function deleteListTestVoteEvents(): Promise<void> {
    await orm.em.getConnection().execute(
      'delete vep from `vote_event_participations` vep join `vote_events` ve on ve.`id` = vep.`vote_event_id` where ve.`title` like ? or ve.`title` like ? or ve.`title` like ? or ve.`title` like ? or ve.`title` like ?',
      [
        'vote-api-%',
        'vote-list-%',
        'vote-ratio-%',
        'vote-cursor-%',
        'vote-detail-%',
      ],
    );
    await orm.em.getConnection().execute(
      'delete from `vote_events` where `title` like ? or `title` like ? or `title` like ? or `title` like ? or `title` like ?',
      [
        'vote-api-%',
        'vote-list-%',
        'vote-ratio-%',
        'vote-cursor-%',
        'vote-detail-%',
      ],
    );
  }

  async function expectVoteEventAggregate(
    voteEventId: string,
    expected: VoteEventAggregate,
  ): Promise<void> {
    const rows = await orm.em.getConnection().execute<VoteEventAggregateRow[]>(
      'select `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `option_a_participant_count`, `option_b_participant_count` from `vote_events` where `id` = ?',
      [voteEventId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      option_a_participant_count: expected.optionAParticipantCount,
      option_a_token_amount: expected.optionATokenAmount,
      option_b_participant_count: expected.optionBParticipantCount,
      option_b_token_amount: expected.optionBTokenAmount,
      total_participant_count: expected.totalParticipantCount,
      total_token_amount: expected.totalTokenAmount,
    });
  }

  async function expectParticipation(
    voteEventId: string,
    userId: string,
    selectedOption: 'A' | 'B',
    tokenAmount: number,
  ): Promise<void> {
    const rows = await orm.em.getConnection().execute<ParticipationRow[]>(
      'select `selected_option`, `token_amount` from `vote_event_participations` where `vote_event_id` = ? and `user_id` = ?',
      [voteEventId, userId],
    );

    expect(rows).toEqual([
      {
        selected_option: selectedOption,
        token_amount: tokenAmount,
      },
    ]);
  }

  async function expectNoParticipation(
    voteEventId: string,
    userId: string,
  ): Promise<void> {
    const rows = await orm.em.getConnection().execute<ParticipationRow[]>(
      'select `selected_option`, `token_amount` from `vote_event_participations` where `vote_event_id` = ? and `user_id` = ?',
      [voteEventId, userId],
    );

    expect(rows).toHaveLength(0);
  }

  async function expectUserVoteToken(
    userId: string,
    voteToken: number,
  ): Promise<void> {
    const rows = await orm.em.getConnection().execute<UserVoteTokenRow[]>(
      'select `vote_token` from `users` where `id` = ?',
      [userId],
    );

    expect(rows).toEqual([{ vote_token: voteToken }]);
  }
});

function minutesFrom(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function secondsFrom(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

interface CreateVoteEventEnvelope {
  data: {
    id: string;
  };
}

interface VoteEventRow {
  category: string;
  created_at: string;
  deadline_at: string;
  option_a: string;
  option_a_image_url: string | null;
  option_a_participant_count: number;
  option_a_token_amount: number;
  option_b: string;
  option_b_image_url: string | null;
  option_b_participant_count: number;
  option_b_token_amount: number;
  title: string;
  total_participant_count: number;
  total_token_amount: number;
}

interface VoteEventAggregate {
  optionAParticipantCount: number;
  optionATokenAmount: number;
  optionBParticipantCount: number;
  optionBTokenAmount: number;
  totalParticipantCount: number;
  totalTokenAmount: number;
}

interface VoteEventAggregateRow {
  option_a_participant_count: number;
  option_a_token_amount: number;
  option_b_participant_count: number;
  option_b_token_amount: number;
  total_participant_count: number;
  total_token_amount: number;
}

interface ParticipationRow {
  selected_option: 'A' | 'B';
  token_amount: number;
}

interface UserVoteTokenRow {
  vote_token: number;
}

interface LoginEnvelope {
  data: {
    accessToken: string;
  };
}

interface ErrorEnvelope {
  error: {
    code: string;
  };
}

interface ListVoteEventsEnvelope {
  data: {
    mainVote: VoteEventListItem | null;
    otherVoteEvents: VoteEventListItem[];
    pageInfo: {
      hasNext: boolean;
      nextCursor: string | null;
    };
  };
}

interface ListCompletedVoteEventsEnvelope {
  data: {
    pageInfo: {
      hasNext: boolean;
      nextCursor: string | null;
    };
    voteEvents: VoteEventListItem[];
  };
}

interface VoteEventListItem {
  categoryName: string;
  id: string;
  isParticipated: boolean;
  optionA: string;
  optionAImageUrl: string | null;
  optionARatio: number | null;
  optionB: string;
  optionBImageUrl: string | null;
  optionBRatio: number | null;
  remainingTime: string;
  title: string;
  totalParticipantCount: number;
  totalTokenAmount: number | null;
}

interface VoteEventDetailEnvelope {
  data: {
    affiliationStats: Array<{
      affiliationCode: string;
      affiliationName: string;
      optionARatio: number;
      optionBRatio: number;
    }> | null;
    categoryName: string;
    isParticipated: boolean;
    optionA: string;
    optionAImageUrl: string | null;
    optionAResultAmount: number | null;
    optionARatio: number | null;
    optionB: string;
    optionBImageUrl: string | null;
    optionBResultAmount: number | null;
    optionBRatio: number | null;
    remainingTime: string | null;
    selectedOption: 'A' | 'B' | null;
    title: string;
    totalParticipantCount: number;
    totalTokenAmount: number | null;
  };
}
