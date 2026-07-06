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
            create: () => Promise.resolve(undefined),
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
        available: { example: true, type: 'boolean' },
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
      description: '확인할 닉네임',
      schema: {
        example: 'seesaw-user',
        maxLength: 120,
        minLength: 1,
        type: 'string',
      },
    });
    expect(
      document.paths['/api/v2/users/nickname-availability']?.get,
    ).toMatchObject({
      summary: '닉네임 사용 가능 여부 확인',
      responses: {
        '200': { description: '닉네임 사용 가능 여부를 반환합니다.' },
        '400': { description: '닉네임 query가 유효하지 않습니다.' },
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

  it('회원가입 계약을 Swagger JSON에 노출한다', () => {
    expect(document.components?.schemas?.CreateUserRequestDto).toMatchObject({
      properties: {
        affiliationCode: {
          description: '소속 코드',
          example: 'education',
          maxLength: 50,
          minLength: 1,
          type: 'string',
        },
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
      required: ['nickname', 'password', 'affiliationCode'],
      type: 'object',
    });
    expect(document.components?.schemas?.CreateUserResponseDto).toMatchObject({
      properties: {
        id: { example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90', type: 'string' },
      },
      required: ['id'],
      type: 'object',
    });
    expect(document.paths['/api/v2/register']?.post).toMatchObject({
      summary: '회원가입',
      responses: {
        '201': { description: '회원가입이 완료되었습니다.' },
        '400': { description: '회원가입 요청 body가 유효하지 않습니다.' },
        '409': { description: '이미 사용 중인 닉네임입니다.' },
        '422': { description: '존재하지 않는 소속 코드입니다.' },
      },
    });
    expect(document.paths['/api/v2/register']?.post?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/CreateUserRequestDto',
          },
        },
      },
      required: true,
    });
    expect(
      document.paths['/api/v2/register']?.post?.responses['201'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            example: {
              data: {
                id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
              },
            },
            properties: {
              data: { $ref: '#/components/schemas/CreateUserResponseDto' },
            },
          },
        },
      },
    });
    expect(document.paths['/api/v2/users']?.post).toBeUndefined();
  });
});
