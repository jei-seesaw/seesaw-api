import { MikroORM } from '@mikro-orm/mariadb';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_PREFIX } from '../../src/config/api-prefix';

describe('Home endpoint', () => {
  let app: INestApplication;
  let server: Server;
  let orm: MikroORM;
  const createdVoteEventIds: string[] = [];

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
    if (createdVoteEventIds.length > 0) {
      await orm.em.getConnection().execute(
        `delete from vote_events where id in (${createdVoteEventIds.map(() => '?').join(', ')})`,
        createdVoteEventIds,
      );
    }

    await app.close();
  });

  it('로그인하지 않아도 메인페이지 공개 집계를 조회한다', async () => {
    const before = await readStoredHomeSummary();
    await insertVoteEvent(2, 'ongoing');
    await insertVoteEvent(5, 'completed');

    return request(server)
      .get('/api/v2/home')
      .expect(200)
      .expect((response: { body: unknown }) => {
        const body = response.body as HomeEnvelope;

        expect(body.data.completedVoteEventCount).toBeGreaterThanOrEqual(
          before.completedVoteEventCount + 1,
        );
        expect(body.data.ongoingVoteEventCount).toBeGreaterThanOrEqual(
          before.ongoingVoteEventCount + 1,
        );
        expect(body.data.participantCount).toBeGreaterThanOrEqual(
          before.participantCount + 7,
        );
        expect(body.data.isLoggedIn).toBe(false);
        expect(body.data.voteToken).toBeUndefined();
      });
  });

  it('로그인하면 메인페이지 응답에 내 voteToken을 포함한다', async () => {
    const nickname = `home-${Date.now()}`;
    const accessToken = await issueAccessToken(nickname);

    await orm.em.getConnection().execute(
      'update `users` set `vote_token` = ? where `nickname` = ?',
      [777, nickname],
    );

    return request(server)
      .get('/api/v2/home')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response: { body: unknown }) => {
        const body = response.body as HomeEnvelope;

        expect(body.data.isLoggedIn).toBe(true);
        expect(body.data.voteToken).toBe(777);
        expect(typeof body.data.completedVoteEventCount).toBe('number');
        expect(typeof body.data.ongoingVoteEventCount).toBe('number');
        expect(typeof body.data.participantCount).toBe('number');
      });
  });

  it('잘못된 accessToken이 있으면 메인페이지 조회를 거절한다', () => {
    return request(server)
      .get('/api/v2/home')
      .set('Authorization', 'Bearer invalid-access-token')
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });
  });

  async function issueAccessToken(nickname: string): Promise<string> {
    await request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode: 'education',
        nickname,
        password: 'password123',
      })
      .expect(201);

    const response = await request(server)
      .post('/api/v2/auth/login')
      .send({ nickname, password: 'password123' })
      .expect(200);

    return (response.body as LoginEnvelope).data.accessToken;
  }

  async function insertVoteEvent(
    participantCount: number,
    status: 'completed' | 'ongoing',
  ): Promise<void> {
    const now = new Date();
    const deadlineAt =
      status === 'ongoing'
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const id = randomUUID();

    await orm.em.getConnection().execute(
      'insert into `vote_events` (`id`, `category`, `title`, `option_a`, `option_b`, `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `deadline_at`, `created_at`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        'daily',
        `메인페이지 테스트 ${Date.now()}-${participantCount}`,
        'A',
        'B',
        participantCount,
        0,
        0,
        0,
        deadlineAt,
        now,
      ],
    );
    createdVoteEventIds.push(id);
  }

  async function readStoredHomeSummary(): Promise<HomeSummary> {
    const rows = await orm.em.getConnection().execute<HomeSummaryRow[]>(
      'select sum(case when `deadline_at` > current_timestamp and `betting_result_confirmed_at` is null then 1 else 0 end) as `ongoingVoteEventCount`, sum(case when `deadline_at` <= current_timestamp or `betting_result_confirmed_at` is not null then 1 else 0 end) as `completedVoteEventCount`, coalesce(sum(`total_participant_count`), 0) as `participantCount` from `vote_events`',
    );
    const row = rows[0]!;

    return {
      completedVoteEventCount: Number(row.completedVoteEventCount),
      ongoingVoteEventCount: Number(row.ongoingVoteEventCount),
      participantCount: Number(row.participantCount),
    };
  }
});

interface HomeSummary {
  completedVoteEventCount: number;
  ongoingVoteEventCount: number;
  participantCount: number;
}

interface HomeEnvelope {
  data: HomeSummary & {
    isLoggedIn: boolean;
    voteToken?: number;
  };
}

interface HomeSummaryRow {
  completedVoteEventCount: number | string;
  ongoingVoteEventCount: number | string;
  participantCount: number | string;
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
