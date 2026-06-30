import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_PREFIX } from '../../src/config/api-prefix';
import { setupSwagger } from '../../src/config/swagger';

describe('Health endpoint', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    setupSwagger(app, 'dev');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('health payload를 전역 성공 응답으로 감싼다', () => {
    return request(app.getHttpServer() as Server)
      .get('/api/v2/health')
      .expect(200)
      .expect({ data: { status: 'ok' } });
  });

  it('Swagger JSON을 전역 prefix 아래에서 노출한다', () => {
    return request(app.getHttpServer() as Server)
      .get('/api/v2/docs-json')
      .expect(200)
      .expect((response: { body: unknown }) => {
        const body = response.body as SwaggerDocument;

        expect(body.paths['/api/v2/health']?.get).toMatchObject({
          summary: 'API 상태 확인',
          responses: {
            '200': {
              description: 'API가 정상 동작 중입니다.',
              content: {
                'application/json': {
                  schema: {
                    example: { data: { status: 'ok' } },
                  },
                },
              },
            },
          },
        });
      });
  });
});

interface SwaggerDocument {
  paths: {
    [path: string]: {
      get?: unknown;
    };
  };
}
