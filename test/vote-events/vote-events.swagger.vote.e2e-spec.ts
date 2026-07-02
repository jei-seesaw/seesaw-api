import type { OpenAPIObject } from '@nestjs/swagger';
import { createVoteEventsSwaggerContext, type VoteEventsSwaggerContext } from './vote-events.swagger.fixture';

describe('Vote events Swagger vote', () => {
  let context: VoteEventsSwaggerContext;
  let document: OpenAPIObject;

  beforeAll(async () => {
    context = await createVoteEventsSwaggerContext();
    document = context.document;
  });

  afterAll(async () => {
    await context.close();
  });

  it('투표 진행 계약을 Swagger JSON에 노출한다', () => {
    expect(document.components?.schemas?.CastVoteRequestDto).toMatchObject({
      properties: {
        selectedOption: {
          description: '선택한 선택지',
          enum: ['A', 'B'],
          example: 'A',
          type: 'string',
        },
        tokenAmount: {
          description: '배팅 투표에 사용할 토큰 수',
          example: 25,
          minimum: 1,
          type: 'number',
        },
        voteEventId: {
          description: '투표 이벤트 ID',
          example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
          maxLength: 36,
          minLength: 1,
          type: 'string',
        },
      },
      required: ['voteEventId', 'selectedOption'],
      type: 'object',
    });
    expect(document.paths['/api/v2/vote']?.post).toMatchObject({
      summary: '투표 진행',
      responses: {
        '200': { description: '투표가 기록되었습니다.' },
        '400': { description: '투표 진행 요청 body가 유효하지 않습니다.' },
        '401': { description: 'accessToken이 없거나 유효하지 않습니다.' },
        '404': { description: '투표 이벤트를 찾을 수 없습니다.' },
        '409': {
          description:
            '마감, 중복 참여, 또는 보유 토큰 부족으로 투표할 수 없습니다.',
        },
        '422': { description: '투표 카테고리와 토큰 요청이 맞지 않습니다.' },
      },
    });
    expect(document.paths['/api/v2/vote']?.post?.security).toEqual([
      { bearer: [] },
    ]);
    expect(document.paths['/api/v2/vote']?.post?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/CastVoteRequestDto',
          },
        },
      },
      required: true,
    });
    expect(
      document.paths['/api/v2/vote']?.post?.responses['200'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            example: {
              data: null,
            },
          },
        },
      },
    });
  });
});
