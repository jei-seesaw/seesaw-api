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
      'insert into `users` (`id`, `nickname`, `password_hash`, `vote_token`, `created_at`) values (?, ?, ?, ?, ?)',
      [randomUUID(), nickname, 'hashed-password', 0, new Date()],
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
});

interface ErrorEnvelope {
  error: {
    code: string;
  };
}
