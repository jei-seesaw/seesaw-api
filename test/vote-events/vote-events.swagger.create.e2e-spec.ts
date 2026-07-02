import type { OpenAPIObject } from '@nestjs/swagger';
import { createVoteEventsSwaggerContext, type VoteEventsSwaggerContext } from './vote-events.swagger.fixture';

describe('Vote events Swagger create', () => {
  let context: VoteEventsSwaggerContext;
  let document: OpenAPIObject;

  beforeAll(async () => {
    context = await createVoteEventsSwaggerContext();
    document = context.document;
  });

  afterAll(async () => {
    await context.close();
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
});
