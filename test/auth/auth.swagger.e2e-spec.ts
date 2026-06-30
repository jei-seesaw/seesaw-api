import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { API_PREFIX } from '../../src/config/api-prefix';

describe('Auth Swagger', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: () => Promise.resolve(undefined),
            refresh: () => Promise.resolve(undefined),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Test')
        .setVersion('0.0.0')
        .addCookieAuth('refreshToken')
        .build(),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it('로그인 계약을 Swagger JSON에 노출한다', () => {
    expect(document.components?.schemas?.LoginRequestDto).toMatchObject({
      properties: {
        nickname: {
          description: '사용자 닉네임',
          example: 'seesaw-user',
          maxLength: 120,
          minLength: 1,
          type: 'string',
        },
        password: {
          description: '사용자 비밀번호',
          example: 'password123',
          maxLength: 128,
          minLength: 8,
          type: 'string',
        },
      },
      required: ['nickname', 'password'],
      type: 'object',
    });
    expect(document.components?.schemas?.AccessTokenResponseDto).toMatchObject({
      properties: {
        accessToken: {
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          type: 'string',
        },
      },
      required: ['accessToken'],
      type: 'object',
    });
    expect(document.paths['/api/v2/auth/login']?.post).toMatchObject({
      summary: '로그인',
      responses: {
        '200': { description: '로그인이 완료되었습니다.' },
        '400': { description: '로그인 요청 body가 유효하지 않습니다.' },
        '401': { description: '닉네임 또는 비밀번호가 올바르지 않습니다.' },
      },
    });
  });

  it('토큰 재발급 계약을 Swagger JSON에 노출한다', () => {
    expect(document.paths['/api/v2/auth/refresh']?.post).toMatchObject({
      summary: 'accessToken 재발급',
      responses: {
        '200': { description: 'accessToken을 재발급합니다.' },
        '401': { description: 'refreshToken cookie가 없거나 유효하지 않습니다.' },
      },
    });
    expect(document.paths['/api/v2/auth/refresh']?.post?.security).toEqual([
      { refreshToken: [] },
    ]);
  });
});
