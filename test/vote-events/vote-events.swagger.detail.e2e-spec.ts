import type { OpenAPIObject } from '@nestjs/swagger';
import { createVoteEventsSwaggerContext, type VoteEventsSwaggerContext } from './vote-events.swagger.fixture';

describe('Vote events Swagger detail', () => {
  let context: VoteEventsSwaggerContext;
  let document: OpenAPIObject;

  beforeAll(async () => {
    context = await createVoteEventsSwaggerContext();
    document = context.document;
  });

  afterAll(async () => {
    await context.close();
  });

  it('투표 이벤트 상세 조회 계약을 Swagger JSON에 노출한다', () => {
    expect(document.components?.schemas?.VoteEventDetailResponseDto).toMatchObject({
      properties: {
        affiliationStats: {
          nullable: true,
        },
        bettingResultConfirmedAt: {
          nullable: true,
          type: 'string',
        },
        bettingResultOption: {
          nullable: true,
        },
        bettingInfo: {
          nullable: true,
        },
        canConfirmBettingResult: {
          type: 'boolean',
        },
        categoryName: {
          description: '카테고리 이름',
          example: '배팅',
          type: 'string',
        },
        isOrganizer: {
          type: 'boolean',
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
        'bettingInfo',
        'isParticipated',
        'isOrganizer',
        'selectedOption',
        'totalTokenAmount',
        'bettingResultOption',
        'bettingResultConfirmedAt',
        'canConfirmBettingResult',
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
                    affiliationCode: 'education',
                    affiliationName: '재능교육',
                    optionARatio: 75,
                    optionBRatio: 25,
                  },
                ],
                bettingResultConfirmedAt: null,
                bettingResultOption: null,
                bettingInfo: {
                  earnedTokenAmount: null,
                  myTokenAmount: 25,
                  payoutRate: 62.5,
                  resultConfirmed: false,
                  rewardClaimed: null,
                },
                canConfirmBettingResult: true,
                categoryName: '배팅',
                isOrganizer: true,
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
