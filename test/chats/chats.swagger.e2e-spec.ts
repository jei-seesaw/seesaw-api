import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AuthService } from '../../src/auth/auth.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { ChatsController } from '../../src/chats/chats.controller';
import { ChatsService } from '../../src/chats/chats.service';
import { API_PREFIX } from '../../src/config/api-prefix';

describe('Chats Swagger', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [
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
          provide: ChatsService,
          useValue: {
            listMessages: () => Promise.resolve(undefined),
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
        .addBearerAuth()
        .build(),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('채팅 메시지 조회 계약을 Swagger JSON에 노출한다', () => {
    expect(document.components?.schemas?.ChatMessageDto).toMatchObject({
      properties: {
        clientMessageId: {
          example: 'c98e6e39-5e83-4308-8f43-a7f5c6f33120',
          type: 'string',
        },
        content: {
          example: '저는 A가 더 좋아요',
          type: 'string',
        },
        createdAt: {
          example: '2026-07-08T12:00:00.000Z',
          format: 'date-time',
          type: 'string',
        },
        id: {
          example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
          type: 'string',
        },
        isMine: {
          example: true,
          type: 'boolean',
        },
        user: {
          $ref: '#/components/schemas/ChatMessageUserDto',
        },
        voteEventId: {
          example: '7c1b6a57-9e4c-48de-a893-7c1d8f4d54fd',
          type: 'string',
        },
      },
      required: [
        'id',
        'voteEventId',
        'clientMessageId',
        'user',
        'content',
        'createdAt',
        'isMine',
      ],
      type: 'object',
    });
    expect(document.components?.schemas?.ChatMessageUserDto).toMatchObject({
      properties: {
        affiliationName: {
          example: '재능교육',
          type: 'string',
        },
        id: {
          example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
          type: 'string',
        },
        nickname: {
          example: 'hyoseok',
          type: 'string',
        },
      },
      required: ['id', 'nickname', 'affiliationName'],
      type: 'object',
    });
    expect(document.components?.schemas?.ListChatMessagesResponseDto).toMatchObject({
      properties: {
        totalCount: {
          description: '채팅방 전체 메시지 수',
          example: 120,
          type: 'number',
        },
      },
      required: ['messages', 'pageInfo', 'totalCount'],
    });
    expect(
      document.paths['/api/v2/vote-events/{id}/chat-messages']?.get,
    ).toMatchObject({
      parameters: [
        {
          description: '투표 이벤트 ID',
          in: 'path',
          name: 'id',
          required: true,
        },
        {
          description: '한 번에 조회할 채팅 메시지 수',
          in: 'query',
          name: 'limit',
          required: false,
        },
        {
          description: '이전 메시지 페이지 조회용 opaque cursor',
          in: 'query',
          name: 'cursor',
          required: false,
        },
      ],
      responses: {
        '200': { description: '채팅 메시지 목록을 반환합니다.' },
        '400': { description: 'cursor 또는 query가 유효하지 않습니다.' },
        '401': { description: 'accessToken이 없거나 유효하지 않습니다.' },
        '404': { description: '투표 이벤트를 찾을 수 없습니다.' },
      },
      security: [{ bearer: [] }],
      summary: '투표 이벤트 채팅 메시지 조회',
    });
  });
});
