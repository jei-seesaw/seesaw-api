import { MikroORM } from '@mikro-orm/mariadb';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_PREFIX } from '../../src/config/api-prefix';

describe('Users endpoint', () => {
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

  it('없는 닉네임은 사용 가능하다고 응답한다', () => {
    return request(server)
      .get('/api/v2/users/nickname-availability')
      .query({ nickname: `available-${Date.now()}` })
      .expect(200)
      .expect({ data: { available: true } });
  });

  it('이미 있는 닉네임은 사용 불가하다고 응답한다', async () => {
    const nickname = `taken-${Date.now()}`;

    await orm.em.getConnection().execute(
      'insert into `users` (`id`, `nickname`, `password_hash`, `affiliation_code`, `vote_token`, `created_at`) values (?, ?, ?, ?, ?, ?)',
      [randomUUID(), nickname, 'hashed-password', 'education', 1000, new Date()],
    );

    return request(server)
      .get('/api/v2/users/nickname-availability')
      .query({ nickname })
      .expect(200)
      .expect({ data: { available: false } });
  });

  it('닉네임이 없으면 요청 경계에서 거절한다', () => {
    return request(server)
      .get('/api/v2/users/nickname-availability')
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });
  });

  it('빈 닉네임이면 요청 경계에서 거절한다', () => {
    return request(server)
      .get('/api/v2/users/nickname-availability')
      .query({ nickname: '' })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });
  });

  it('회원가입하면 사용자 id만 응답하고 사용자 정보를 저장한다', async () => {
    const nickname = `signup-${Date.now()}`;

    await request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode: 'education',
        nickname,
        password: 'password123',
      })
      .expect(201)
      .expect((response: { body: unknown }) => {
        expect(Object.keys((response.body as SignupEnvelope).data)).toEqual([
          'id',
        ]);
      });

    const rows = await orm.em.getConnection().execute<UserRow[]>(
      'select `nickname`, `password_hash`, `affiliation_code`, `vote_token` from `users` where `nickname` = ?',
      [nickname],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      affiliation_code: 'education',
      nickname,
      vote_token: 1000,
    });
    expect(rows[0]?.password_hash).not.toBe('password123');
    expect(rows[0]?.password_hash).toMatch(/^scrypt:/);
  });

  it('중복 닉네임으로 회원가입하면 conflict로 거절한다', async () => {
    const nickname = `duplicate-${Date.now()}`;

    await request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode: 'education',
        nickname,
        password: 'password123',
      })
      .expect(201);

    return request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode: 'education',
        nickname,
        password: 'password123',
      })
      .expect(409)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'nickname_already_exists',
        );
      });
  });

  it('없는 소속 code로 회원가입하면 validation error로 거절한다', () => {
    return request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode: 'missing',
        nickname: `invalid-affiliation-${Date.now()}`,
        password: 'password123',
      })
      .expect(422)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_affiliation',
        );
      });
  });

  it('회원가입 요청 body가 유효하지 않으면 요청 경계에서 거절한다', () => {
    return request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode: 'education',
        nickname: '',
        password: 'short',
      })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });
  });

  it('회원가입은 users 생성 라우트로 노출하지 않는다', () => {
    return request(server)
      .post('/api/v2/users')
      .send({
        affiliationCode: 'education',
        nickname: `legacy-${Date.now()}`,
        password: 'password123',
      })
      .expect(404);
  });
});

interface SignupEnvelope {
  data: {
    id: string;
  };
}

interface UserRow {
  affiliation_code: string;
  nickname: string;
  password_hash: string;
  vote_token: number;
}

interface ErrorEnvelope {
  error: {
    code: string;
  };
}
