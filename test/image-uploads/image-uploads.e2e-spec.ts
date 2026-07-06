import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AuthService } from '../../src/auth/auth.service';
import { InvalidAccessTokenException } from '../../src/auth/auth.exceptions';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { ApiResponseInterceptor } from '../../src/common/api-response';
import { GlobalExceptionFilter } from '../../src/common/global-exception.filter';
import type { AppLogger } from '../../src/common/logging/app-logger.service';
import { API_PREFIX } from '../../src/config/api-prefix';
import type { EnvConfig } from '../../src/config/env';
import { ImageUploadsController } from '../../src/image-uploads/image-uploads.controller';
import { ImageUploadsService } from '../../src/image-uploads/image-uploads.service';

describe('Image uploads endpoint', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ImageUploadsController],
      providers: [
        ImageUploadsService,
        JwtAuthGuard,
        {
          provide: AuthService,
          useValue: {
            verifyAccessToken: (token: string) =>
              token === 'valid-access-token'
                ? Promise.resolve({ id: 'user-id', nickname: 'user' })
                : Promise.reject(new InvalidAccessTokenException()),
          },
        },
        {
          provide: ConfigService,
          useValue: createConfig({
            CLOUDINARY_API_KEY: 'test-api-key',
            CLOUDINARY_API_SECRET: 'test-api-secret',
            CLOUDINARY_CLOUD_NAME: 'seesaw-test',
            CLOUDINARY_UPLOAD_FOLDER: 'seesaw-test',
          }),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalFilters(
      new GlobalExceptionFilter(
        app.get(HttpAdapterHost),
        { errorEvent: () => undefined } as unknown as AppLogger,
      ),
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('인증된 사용자는 Cloudinary 직접 업로드 서명값을 발급받는다', () => {
    const startedAt = Math.floor(Date.now() / 1000);

    return request(server)
      .post('/api/v2/image-uploads')
      .set('Authorization', 'Bearer valid-access-token')
      .send({
        bytes: 420_000,
        contentType: 'image/jpeg',
        purpose: 'vote-event-option',
      })
      .expect(201)
      .expect((response: { body: ImageUploadEnvelope }) => {
        const finishedAt = Math.floor(Date.now() / 1000);

        expect(response.body.data).toMatchObject({
          allowedContentTypes: ['image/jpeg', 'image/webp'],
          formFields: {
            api_key: 'test-api-key',
          },
          maxBytes: 2_097_152,
          uploadUrl: 'https://api.cloudinary.com/v1_1/seesaw-test/image/upload',
        });
        expect(
          response.body.data.formFields.timestamp,
        ).toBeGreaterThanOrEqual(startedAt);
        expect(response.body.data.formFields.timestamp).toBeLessThanOrEqual(
          finishedAt,
        );
        expect(response.body.data.expiresAt).toBe(
          new Date(
            (response.body.data.formFields.timestamp + 10 * 60) * 1000,
          ).toISOString(),
        );
        expect(response.body.data.formFields.public_id).toMatch(
          /^seesaw-test\/vote-event-option\/[0-9a-f-]{36}$/,
        );
        expect(response.body.data.formFields.signature).toEqual(
          expect.any(String),
        );
      });
  });

  it('accessToken이 없으면 업로드 서명 발급을 거절한다', () => {
    return request(server)
      .post('/api/v2/image-uploads')
      .send({
        bytes: 420_000,
        contentType: 'image/jpeg',
        purpose: 'vote-event-option',
      })
      .expect(401)
      .expect((response: { body: ErrorEnvelope }) => {
        expect(response.body.error.code).toBe('invalid_access_token');
      });
  });

  it('요청 body가 유효하지 않으면 요청 경계에서 거절한다', () => {
    return request(server)
      .post('/api/v2/image-uploads')
      .set('Authorization', 'Bearer valid-access-token')
      .send({
        bytes: 2_097_153,
        contentType: 'image/gif',
        purpose: 'vote-event-option',
      })
      .expect(400)
      .expect((response: { body: ErrorEnvelope }) => {
        expect(response.body.error.code).toBe('validation_error');
      });
  });
});

interface ImageUploadEnvelope {
  data: {
    allowedContentTypes: string[];
    expiresAt: string;
    formFields: {
      api_key: string;
      public_id: string;
      signature: string;
      timestamp: number;
    };
    maxBytes: number;
    uploadUrl: string;
  };
}

interface ErrorEnvelope {
  error: {
    code: string;
  };
}

function createConfig(
  values: Pick<
    EnvConfig,
    | 'CLOUDINARY_API_KEY'
    | 'CLOUDINARY_API_SECRET'
    | 'CLOUDINARY_CLOUD_NAME'
    | 'CLOUDINARY_UPLOAD_FOLDER'
  >,
): ConfigService<EnvConfig, true> {
  return {
    getOrThrow: (key: keyof typeof values) => values[key],
  } as ConfigService<EnvConfig, true>;
}
