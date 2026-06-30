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
            create: () => Promise.resolve(undefined),
            findOne: () => Promise.resolve(undefined),
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

  it('DTO 스키마를 Swagger JSON에 노출한다', () => {
    const createUserSchema = document.components?.schemas?.CreateUserDto;
    const userResponseSchema = document.components?.schemas?.UserResponseDto;

    expect(createUserSchema).toMatchObject({
      properties: {
        email: { format: 'email', type: 'string' },
        name: { maxLength: 120, minLength: 1, type: 'string' },
      },
      type: 'object',
    });
    expect(createUserSchema).toHaveProperty('required', ['email', 'name']);
    expect(userResponseSchema).toMatchObject({
      properties: {
        id: { format: 'uuid', type: 'string' },
        email: { format: 'email', type: 'string' },
        name: { type: 'string' },
        createdAt: { format: 'date-time', type: 'string' },
      },
      type: 'object',
    });
    expect(userResponseSchema).toHaveProperty('required', [
      'id',
      'email',
      'name',
      'createdAt',
    ]);
    expect(
      document.paths['/api/v2/users']?.post?.responses['201'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            properties: {
              data: { $ref: '#/components/schemas/UserResponseDto' },
            },
          },
        },
      },
    });
  });
});
