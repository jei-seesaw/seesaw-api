import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_PREFIX } from '../../src/config/api-prefix';

describe('Auth endpoint', () => {
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

  it('로그인하면 accessToken은 body로, refreshToken은 HttpOnly cookie로 응답한다', async () => {
    const nickname = `login-${Date.now()}`;

    await register(nickname);

    await request(server)
      .post('/api/v2/auth/login')
      .send({ nickname, password: 'password123' })
      .expect(200)
      .expect((response: { body: unknown; headers: Headers }) => {
        const body = response.body as LoginEnvelope;
        const setCookie = getSetCookie(response.headers);

        expect(body.data.accessToken).toEqual(expect.any(String));
        expect(body.data.refreshToken).toBeUndefined();
        expect(setCookie).toContain('refreshToken=');
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('Path=/api/v2/auth/refresh');
        expect(setCookie).toContain('SameSite=None');
        expect(setCookie).toContain('Secure');
      });
  });

  it('refreshToken cookie로 accessToken을 재발급한다', async () => {
    const nickname = `refresh-${Date.now()}`;

    await register(nickname);
    const loginResponse = await request(server)
      .post('/api/v2/auth/login')
      .send({ nickname, password: 'password123' })
      .expect(200);

    const refreshCookie = getSetCookie(loginResponse.headers);

    return request(server)
      .post('/api/v2/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200)
      .expect((response: { body: unknown }) => {
        const body = response.body as LoginEnvelope;

        expect(body.data.accessToken).toEqual(expect.any(String));
        expect(body.data.refreshToken).toBeUndefined();
      });
  });

  it('비밀번호가 틀리면 로그인을 거절한다', async () => {
    const nickname = `wrong-password-${Date.now()}`;

    await register(nickname);

    return request(server)
      .post('/api/v2/auth/login')
      .send({ nickname, password: 'wrong-password' })
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_credentials',
        );
      });
  });

  it('refreshToken cookie가 없으면 accessToken 재발급을 거절한다', () => {
    return request(server)
      .post('/api/v2/auth/refresh')
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_refresh_token',
        );
      });
  });

  it('로그인 요청 body가 유효하지 않으면 요청 경계에서 거절한다', () => {
    return request(server)
      .post('/api/v2/auth/login')
      .send({ nickname: '', password: 'short' })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });
  });

  async function register(nickname: string): Promise<void> {
    await request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode: 'teacher',
        nickname,
        password: 'password123',
      })
      .expect(201);
  }
});

interface Headers {
  [key: string]: string | string[] | undefined;
}

interface LoginEnvelope {
  data: {
    accessToken: string;
    refreshToken?: string;
  };
}

interface ErrorEnvelope {
  error: {
    code: string;
  };
}

function getSetCookie(headers: Headers): string {
  const value = headers['set-cookie'];

  return Array.isArray(value) ? value.join('; ') : (value ?? '');
}
