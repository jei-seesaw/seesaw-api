import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { API_PREFIX } from '../../src/config/api-prefix';
import type { EnvConfig } from '../../src/config/env';
import { ImageUploadsController } from '../../src/image-uploads/image-uploads.controller';
import { ImageUploadsService } from '../../src/image-uploads/image-uploads.service';

describe('Image uploads Swagger', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ImageUploadsController],
      providers: [
        ImageUploadsService,
        {
          provide: AuthService,
          useValue: {
            verifyAccessToken: () =>
              Promise.resolve({ id: 'user-id', nickname: 'user' }),
          },
        },
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: () => true,
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
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Test')
        .setVersion('0.0.0')
        .addBearerAuth()
        .build(),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('이미지 업로드 서명 발급 계약을 Swagger JSON에 노출한다', () => {
    expect(
      document.components?.schemas?.CreateImageUploadRequestDto,
    ).toMatchObject({
      properties: {
        bytes: {
          description: '업로드할 이미지 파일 크기',
          example: 420000,
          maximum: 2097152,
          minimum: 1,
          type: 'number',
        },
        contentType: {
          description: '업로드할 이미지 MIME 타입',
          enum: ['image/jpeg', 'image/webp'],
          example: 'image/jpeg',
          type: 'string',
        },
        purpose: {
          description: '이미지 업로드 목적',
          enum: ['vote-event-option'],
          example: 'vote-event-option',
          type: 'string',
        },
      },
      required: ['purpose', 'contentType', 'bytes'],
      type: 'object',
    });
    expect(
      document.components?.schemas?.CreateImageUploadResponseDto,
    ).toMatchObject({
      properties: {
        allowedContentTypes: {
          example: ['image/jpeg', 'image/webp'],
          items: { type: 'string' },
          type: 'array',
        },
        expiresAt: {
          example: '2026-07-06T00:10:00.000Z',
          format: 'date-time',
          type: 'string',
        },
        formFields: {
          allOf: [
            {
              $ref: '#/components/schemas/CloudinaryUploadFormFieldsDto',
            },
          ],
        },
        maxBytes: {
          example: 2097152,
          type: 'number',
        },
        uploadUrl: {
          example: 'https://api.cloudinary.com/v1_1/seesaw/image/upload',
          type: 'string',
        },
      },
      required: [
        'uploadUrl',
        'formFields',
        'expiresAt',
        'maxBytes',
        'allowedContentTypes',
      ],
      type: 'object',
    });
    expect(document.paths['/api/v2/image-uploads']?.post).toMatchObject({
      summary: '이미지 직접 업로드 서명 발급',
      responses: {
        '201': { description: 'Cloudinary 직접 업로드 서명값을 발급했습니다.' },
        '400': { description: '이미지 업로드 요청 body가 유효하지 않습니다.' },
        '401': { description: 'accessToken이 없거나 유효하지 않습니다.' },
      },
    });
    expect(document.paths['/api/v2/image-uploads']?.post?.security).toEqual([
      { bearer: [] },
    ]);
  });
});

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
