import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Users endpoint', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates and reads a user through MariaDB', async () => {
    const email = `user-${Date.now()}@example.com`;

    const createResponse = await request(server)
      .post('/api/v1/users')
      .send({ email, name: 'Test User' })
      .expect(201);
    const createBody = createResponse.body as unknown as UserEnvelope;

    expect(typeof createBody.data.id).toBe('string');
    expect(createBody.data.email).toBe(email);
    expect(createBody.data.name).toBe('Test User');
    expect(typeof createBody.data.createdAt).toBe('string');

    await request(server)
      .get(`/api/v1/users/${createBody.data.id}`)
      .expect(200)
      .expect(createBody);
  });

  it('rejects invalid user payloads at the request boundary', () => {
    return request(server)
      .post('/api/v1/users')
      .send({ email: 'not-an-email', name: '', extra: 'nope' })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
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
