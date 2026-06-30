import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { API_PREFIX } from '../../src/config/api-prefix';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';

describe('Users Swagger', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            checkNicknameAvailability: () => Promise.resolve(undefined),
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

  it('닉네임 중복 검사 계약을 Swagger JSON에 노출한다', () => {
    const nicknameAvailabilitySchema =
      document.components?.schemas?.NicknameAvailabilityResponseDto;

    expect(nicknameAvailabilitySchema).toMatchObject({
      properties: {
        available: { type: 'boolean' },
      },
      type: 'object',
    });
    const nicknameParameter = document.paths[
      '/api/v2/users/nickname-availability'
    ]?.get?.parameters?.find(
      (parameter) => 'name' in parameter && parameter.name === 'nickname',
    );

    expect(nicknameParameter).toMatchObject({
      in: 'query',
      name: 'nickname',
      required: true,
      schema: {
        maxLength: 120,
        minLength: 1,
        type: 'string',
      },
    });
    expect(
      document.paths['/api/v2/users/nickname-availability']?.get?.responses[
        '200'
      ],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            properties: {
              data: {
                $ref: '#/components/schemas/NicknameAvailabilityResponseDto',
              },
            },
          },
        },
      },
    });
  });
});
