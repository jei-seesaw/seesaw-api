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

  it('로그인하지 않아도 메인페이지 공개 집계를 조회한다', async () => {
    const before = await readStoredHomeSummary();
    await insertVoteEvent(2, 'ongoing');
    await insertVoteEvent(5, 'completed');

    return request(server)
      .get('/api/v2/home')
      .expect(200)
      .expect((response: { body: unknown }) => {
        const body = response.body as HomeEnvelope;

        expect(body.data).toEqual({
          completedVoteEventCount: before.completedVoteEventCount + 1,
          isLoggedIn: false,
          ongoingVoteEventCount: before.ongoingVoteEventCount + 1,
          participantCount: before.participantCount + 7,
        });
        expect(body.data.voteToken).toBeUndefined();
      });
  });

  it('로그인하면 메인페이지 응답에 내 voteToken을 포함한다', async () => {
    const nickname = `home-${Date.now()}`;
    const expected = await readStoredHomeSummary();
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
        expect((response.body as HomeEnvelope).data).toEqual({
          ...expected,
          isLoggedIn: true,
          voteToken: 777,
        });
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
        affiliationCode: 'teacher',
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

    await orm.em.getConnection().execute(
      'insert into `vote_events` (`id`, `category`, `title`, `option_a`, `option_b`, `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `deadline_at`, `created_at`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        randomUUID(),
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
  }

  async function readStoredHomeSummary(): Promise<HomeSummary> {
    const rows = await orm.em.getConnection().execute<HomeSummaryRow[]>(
      'select sum(case when `deadline_at` > current_timestamp then 1 else 0 end) as `ongoingVoteEventCount`, sum(case when `deadline_at` <= current_timestamp then 1 else 0 end) as `completedVoteEventCount`, coalesce(sum(`total_participant_count`), 0) as `participantCount` from `vote_events`',
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
