import type { OpenAPIObject } from '@nestjs/swagger';
import { createVoteEventsSwaggerContext, type VoteEventsSwaggerContext } from './vote-events.swagger.fixture';

describe('Vote events Swagger list', () => {
  let context: VoteEventsSwaggerContext;
  let document: OpenAPIObject;

  beforeAll(async () => {
    context = await createVoteEventsSwaggerContext();
    document = context.document;
  });

  afterAll(async () => {
    await context.close();
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
  it('내 투표 이벤트 목록 계약을 Swagger JSON에 노출한다', () => {
    expect(document.paths['/api/v2/me/created-vote-events']?.get).toMatchObject({
      summary: '내가 만든 투표 이벤트 목록 조회',
      parameters: [
        expect.objectContaining({ in: 'query', name: 'limit' }),
        expect.objectContaining({ in: 'query', name: 'cursor' }),
      ],
      responses: {
        '200': { description: '내가 만든 투표 이벤트 목록을 반환합니다.' },
        '400': { description: 'cursor 또는 query가 유효하지 않습니다.' },
        '401': { description: 'accessToken이 없거나 유효하지 않습니다.' },
      },
      security: [{ bearer: [] }],
    });
    expect(
      document.paths['/api/v2/me/participated-vote-events']?.get,
    ).toMatchObject({
      summary: '내가 참여한 투표 이벤트 목록 조회',
      parameters: [
        expect.objectContaining({ in: 'query', name: 'limit' }),
        expect.objectContaining({ in: 'query', name: 'cursor' }),
      ],
      responses: {
        '200': { description: '내가 참여한 투표 이벤트 목록을 반환합니다.' },
        '400': { description: 'cursor 또는 query가 유효하지 않습니다.' },
        '401': { description: 'accessToken이 없거나 유효하지 않습니다.' },
      },
      security: [{ bearer: [] }],
    });
    expect(
      document.paths['/api/v2/me/created-vote-events']?.get?.responses['200'],
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
                  expect.objectContaining({
                    id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
                  }),
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
});
