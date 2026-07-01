import { MikroORM } from '@mikro-orm/mariadb';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
      'select `category`, `title`, `option_a`, `option_b`, `option_a_image_url`, `option_b_image_url`, `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `created_at`, `deadline_at` from `vote_events` where `id` = ?',
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
});

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
  option_a_token_amount: number;
  option_b: string;
  option_b_image_url: string | null;
  option_b_token_amount: number;
  title: string;
  total_participant_count: number;
  total_token_amount: number;
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
