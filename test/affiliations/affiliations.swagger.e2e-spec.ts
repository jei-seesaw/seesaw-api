import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AffiliationsController } from '../../src/affiliations/affiliations.controller';
import { AffiliationsService } from '../../src/affiliations/affiliations.service';
import { API_PREFIX } from '../../src/config/api-prefix';

describe('Affiliations Swagger', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AffiliationsController],
      providers: [
        {
          provide: AffiliationsService,
          useValue: {
            list: () => Promise.resolve(undefined),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test').setVersion('0.0.0').build(),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it('소속 목록 계약을 Swagger JSON에 노출한다', () => {
    const affiliationSchema =
      document.components?.schemas?.AffiliationResponseDto;

    expect(affiliationSchema).toMatchObject({
      properties: {
        code: { description: '소속 코드', example: 'teacher', type: 'string' },
        name: { description: '소속 이름', example: '선생님', type: 'string' },
      },
      type: 'object',
    });
    expect(document.paths['/api/v2/affiliations']?.get).toMatchObject({
      summary: '소속 목록 조회',
      responses: {
        '200': { description: '소속 목록을 반환합니다.' },
      },
    });
    expect(
      document.paths['/api/v2/affiliations']?.get?.responses['200'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            example: {
              data: [
                { code: 'headquarters', name: '본사' },
                { code: 'teacher', name: '선생님' },
              ],
            },
            properties: {
              data: {
                items: { $ref: '#/components/schemas/AffiliationResponseDto' },
                type: 'array',
              },
            },
          },
        },
      },
    });
  });
});
