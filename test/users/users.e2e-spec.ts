import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_PREFIX } from '../../src/config/api-prefix';

describe('Users endpoint', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('MariaDB에 사용자를 생성하고 다시 조회한다', async () => {
    const email = `user-${Date.now()}@example.com`;

    const createResponse = await request(server)
      .post('/api/v2/users')
      .send({ email, name: 'Test User' })
      .expect(201);
    const createBody = createResponse.body as unknown as UserEnvelope;

    expect(typeof createBody.data.id).toBe('string');
    expect(createBody.data.email).toBe(email);
    expect(createBody.data.name).toBe('Test User');
    expect(typeof createBody.data.createdAt).toBe('string');
    expect(createResponse.headers.location).toBeUndefined();

    await request(server)
      .get(`/api/v2/users/${createBody.data.id}`)
      .expect(200)
      .expect(createBody);
  });

  it('잘못된 사용자 요청은 요청 경계에서 거절한다', () => {
    return request(server)
      .post('/api/v2/users')
      .send({ email: 'not-an-email', name: '', extra: 'nope' })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });
  });

  it('없는 사용자를 조회하면 사용자 없음 오류를 반환한다', () => {
    return request(server)
      .get('/api/v2/users/00000000-0000-4000-8000-000000000000')
      .expect(404)
      .expect({
        error: {
          code: 'user_not_found',
          message: 'User not found',
        },
      });
  });
});

interface UserEnvelope {
  data: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
}

interface ErrorEnvelope {
  error: {
    code: string;
  };
}
