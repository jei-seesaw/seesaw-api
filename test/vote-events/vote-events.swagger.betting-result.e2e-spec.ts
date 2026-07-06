import type { OpenAPIObject } from '@nestjs/swagger';
import {
  createVoteEventsSwaggerContext,
  type VoteEventsSwaggerContext,
} from './vote-events.swagger.fixture';

describe('Vote events Swagger betting result', () => {
  let context: VoteEventsSwaggerContext;
  let document: OpenAPIObject;

  beforeAll(async () => {
    context = await createVoteEventsSwaggerContext();
    document = context.document;
  });

  afterAll(async () => {
    await context.close();
  });

  it('배팅 결과 확정 계약을 Swagger JSON에 노출한다', () => {
    expect(
      document.components?.schemas?.ConfirmBettingResultRequestDto,
    ).toMatchObject({
      properties: {
        winningOption: {
          description: '정답 선택지',
          enum: ['A', 'B'],
          example: 'A',
          type: 'string',
        },
      },
      required: ['winningOption'],
      type: 'object',
    });
    expect(
      document.paths['/api/v2/vote-events/{id}/betting-result']?.post,
    ).toMatchObject({
      summary: '배팅 결과 확정',
      parameters: [expect.objectContaining({ in: 'path', name: 'id' })],
      responses: {
        '200': { description: '배팅 결과가 확정되고 정산되었습니다.' },
        '400': { description: '배팅 결과 확정 요청 body가 유효하지 않습니다.' },
        '401': { description: 'accessToken이 없거나 유효하지 않습니다.' },
        '403': { description: '투표 이벤트 주최자가 아닙니다.' },
        '404': { description: '투표 이벤트를 찾을 수 없습니다.' },
        '409': { description: '이미 배팅 결과가 확정되었습니다.' },
        '422': { description: '배팅 이벤트가 아니므로 결과를 확정할 수 없습니다.' },
      },
    });
    expect(
      document.paths['/api/v2/vote-events/{id}/betting-result']?.post
        ?.security,
    ).toEqual([{ bearer: [] }]);
    expect(
      document.paths['/api/v2/vote-events/{id}/betting-result']?.post
        ?.requestBody,
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ConfirmBettingResultRequestDto',
          },
        },
      },
      required: true,
    });
  });
});
