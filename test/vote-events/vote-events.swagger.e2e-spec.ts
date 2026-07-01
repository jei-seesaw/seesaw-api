import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AuthService } from '../../src/auth/auth.service';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../../src/auth/guards/jwt-auth.guard';
import { API_PREFIX } from '../../src/config/api-prefix';
import { VoteEventsController } from '../../src/vote-events/vote-events.controller';
import { VoteEventsService } from '../../src/vote-events/vote-events.service';

describe('Vote events Swagger', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VoteEventsController],
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
          provide: OptionalJwtAuthGuard,
          useValue: {
            canActivate: () => true,
          },
        },
        {
          provide: VoteEventsService,
          useValue: {
            create: () => Promise.resolve(undefined),
            getDetail: () => Promise.resolve(undefined),
            listCompleted: () => Promise.resolve(undefined),
            listOngoing: () => Promise.resolve(undefined),
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
    await app?.close();
  });

  it('투표 이벤트 생성 계약을 Swagger JSON에 노출한다', () => {
    expect(
      document.components?.schemas?.CreateVoteEventRequestDto,
    ).toMatchObject({
      properties: {
        category: {
          description: '투표 이벤트 카테고리',
          enum: ['betting', 'daily', 'balance', 'work'],
          example: 'betting',
          type: 'string',
        },
        optionA: {
          description: 'A 선택지',
          example: '김치찌개',
          maxLength: 120,
          minLength: 1,
          type: 'string',
        },
        optionAImageUrl: {
          description: 'A 선택지 이미지 URL',
          example: null,
          maxLength: 2048,
          nullable: true,
          type: 'string',
        },
        optionB: {
          description: 'B 선택지',
          example: '돈까스',
          maxLength: 120,
          minLength: 1,
          type: 'string',
        },
        optionBImageUrl: {
          description: 'B 선택지 이미지 URL',
          example: 'https://example.com/b.jpg',
          maxLength: 2048,
          nullable: true,
          type: 'string',
        },
        title: {
          description: '투표 이벤트 제목',
          example: '점심 메뉴는?',
          maxLength: 120,
          minLength: 1,
          type: 'string',
        },
      },
      required: ['category', 'title', 'optionA', 'optionB'],
      type: 'object',
    });
    expect(
      document.components?.schemas?.CreateVoteEventResponseDto,
    ).toMatchObject({
      properties: {
        id: { example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90', type: 'string' },
      },
      required: ['id'],
      type: 'object',
    });
    expect(document.paths['/api/v2/vote-events']?.post).toMatchObject({
      summary: '투표 이벤트 생성',
      responses: {
        '201': { description: '투표 이벤트가 생성되었습니다.' },
        '400': { description: '투표 이벤트 생성 요청 body가 유효하지 않습니다.' },
        '401': { description: 'accessToken이 없거나 유효하지 않습니다.' },
      },
    });
    expect(document.paths['/api/v2/vote-events']?.post?.security).toEqual([
      { bearer: [] },
    ]);
    expect(
      document.paths['/api/v2/vote-events']?.post?.requestBody,
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/CreateVoteEventRequestDto',
          },
        },
      },
      required: true,
    });
    expect(
      document.paths['/api/v2/vote-events']?.post?.responses['201'],
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
              data: {
                $ref: '#/components/schemas/CreateVoteEventResponseDto',
              },
            },
          },
        },
      },
    });
  });

  it('진행중인 투표 이벤트 목록 계약을 Swagger JSON에 노출한다', () => {
    expect(document.components?.schemas?.ListVoteEventsResponseDto).toMatchObject({
      properties: {
        mainVote: {
          nullable: true,
        },
        otherVoteEvents: {
          type: 'array',
        },
        pageInfo: {
          $ref: '#/components/schemas/ListVoteEventsPageInfoDto',
        },
      },
      required: ['mainVote', 'otherVoteEvents', 'pageInfo'],
      type: 'object',
    });
    expect(
      document.components?.schemas?.ListVoteEventsPageInfoDto,
    ).toMatchObject({
      properties: {
        hasNext: { type: 'boolean' },
        nextCursor: { nullable: true, type: 'string' },
      },
      required: ['hasNext', 'nextCursor'],
      type: 'object',
    });
    expect(document.paths['/api/v2/ongoing-vote-events']?.get).toMatchObject({
      summary: '진행중인 투표 이벤트 목록 조회',
      parameters: [
        expect.objectContaining({ in: 'query', name: 'limit' }),
        expect.objectContaining({ in: 'query', name: 'cursor' }),
      ],
      responses: {
        '200': { description: '진행중인 투표 이벤트 목록을 반환합니다.' },
        '400': { description: 'cursor 또는 query가 유효하지 않습니다.' },
        '401': { description: 'accessToken이 유효하지 않습니다.' },
      },
    });
    expect(
      document.paths['/api/v2/ongoing-vote-events']?.get?.responses['200'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            example: {
              data: {
                mainVote: {
                  categoryName: '배팅',
                  id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
                  isParticipated: true,
                  optionA: '김치찌개',
                  optionAImageUrl: null,
                  optionARatio: 25,
                  optionB: '돈까스',
                  optionBImageUrl: 'https://example.com/b.jpg',
                  optionBRatio: 75,
                  remainingTime: '12:34:56',
                  title: '점심 메뉴는?',
                  totalParticipantCount: 120,
                  totalTokenAmount: 1000,
                },
                otherVoteEvents: [],
                pageInfo: {
                  hasNext: false,
                  nextCursor: null,
                },
              },
            },
            properties: {
              data: {
                $ref: '#/components/schemas/ListVoteEventsResponseDto',
              },
            },
          },
        },
      },
    });
  });

  it('완료된 투표 이벤트 목록 계약을 Swagger JSON에 노출한다', () => {
    expect(
      document.components?.schemas?.ListCompletedVoteEventsResponseDto,
    ).toMatchObject({
      properties: {
        pageInfo: {
          $ref: '#/components/schemas/ListVoteEventsPageInfoDto',
        },
        voteEvents: {
          type: 'array',
        },
      },
      required: ['voteEvents', 'pageInfo'],
      type: 'object',
    });
    expect(document.paths['/api/v2/completed-vote-events']?.get).toMatchObject({
      summary: '완료된 투표 이벤트 목록 조회',
      parameters: [
        expect.objectContaining({ in: 'query', name: 'limit' }),
        expect.objectContaining({ in: 'query', name: 'cursor' }),
      ],
      responses: {
        '200': { description: '완료된 투표 이벤트 목록을 반환합니다.' },
        '400': { description: 'cursor 또는 query가 유효하지 않습니다.' },
        '401': { description: 'accessToken이 유효하지 않습니다.' },
      },
    });
    expect(
      document.paths['/api/v2/completed-vote-events']?.get?.responses['200'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            example: {
              data: {
                pageInfo: {
                  hasNext: false,
                  nextCursor: null,
                },
                voteEvents: [
                  {
                    categoryName: '배팅',
                    id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
                    isParticipated: false,
                    optionA: '김치찌개',
                    optionAImageUrl: null,
                    optionARatio: 25,
                    optionB: '돈까스',
                    optionBImageUrl: 'https://example.com/b.jpg',
                    optionBRatio: 75,
                    remainingTime: '00:00:00',
                    title: '점심 메뉴는?',
                    totalParticipantCount: 120,
                    totalTokenAmount: 1000,
                  },
                ],
              },
            },
            properties: {
              data: {
                $ref: '#/components/schemas/ListCompletedVoteEventsResponseDto',
              },
            },
          },
        },
      },
    });
  });

  it('투표 이벤트 상세 조회 계약을 Swagger JSON에 노출한다', () => {
    expect(document.components?.schemas?.VoteEventDetailResponseDto).toMatchObject({
      properties: {
        affiliationStats: {
          nullable: true,
        },
        categoryName: {
          description: '카테고리 이름',
          example: '배팅',
          type: 'string',
        },
        isParticipated: {
          type: 'boolean',
        },
        optionAResultAmount: {
          nullable: true,
          type: 'number',
        },
        remainingTime: {
          nullable: true,
          type: 'string',
        },
        selectedOption: {
          nullable: true,
        },
      },
      required: [
        'categoryName',
        'title',
        'totalParticipantCount',
        'remainingTime',
        'optionA',
        'optionB',
        'optionAImageUrl',
        'optionBImageUrl',
        'optionARatio',
        'optionBRatio',
        'optionAResultAmount',
        'optionBResultAmount',
        'affiliationStats',
        'isParticipated',
        'selectedOption',
        'totalTokenAmount',
      ],
      type: 'object',
    });
    expect(document.paths['/api/v2/vote-events/{id}']?.get).toMatchObject({
      summary: '투표 이벤트 상세 조회',
      parameters: [expect.objectContaining({ in: 'path', name: 'id' })],
      responses: {
        '200': { description: '투표 이벤트 상세 정보를 반환합니다.' },
        '401': { description: 'accessToken이 유효하지 않습니다.' },
        '404': { description: '투표 이벤트를 찾을 수 없습니다.' },
      },
    });
    expect(
      document.paths['/api/v2/vote-events/{id}']?.get?.responses['200'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            example: {
              data: {
                affiliationStats: [
                  {
                    affiliationCode: 'teacher',
                    affiliationName: '선생님',
                    optionARatio: 75,
                    optionBRatio: 25,
                  },
                ],
                categoryName: '배팅',
                isParticipated: true,
                optionA: '김치찌개',
                optionAImageUrl: null,
                optionAResultAmount: 40,
                optionARatio: 40,
                optionB: '돈까스',
                optionBImageUrl: 'https://example.com/b.jpg',
                optionBResultAmount: 60,
                optionBRatio: 60,
                remainingTime: '12:34:56',
                selectedOption: 'B',
                title: '점심 메뉴는?',
                totalParticipantCount: 3,
                totalTokenAmount: 100,
              },
            },
            properties: {
              data: {
                $ref: '#/components/schemas/VoteEventDetailResponseDto',
              },
            },
          },
        },
      },
    });
  });
});
