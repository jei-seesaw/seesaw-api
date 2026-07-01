import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CreateVoteEventRequestDto,
  CreateVoteEventResponseDto,
} from './dto/create-vote-event.dto';
import {
  ListVoteEventsPageInfoDto,
  ListVoteEventsResponseDto,
  VoteEventListItemDto,
} from './dto/list-vote-events.dto';

const createVoteEventResponseSchema = {
  example: {
    data: {
      id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(CreateVoteEventResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

const listVoteEventsResponseSchema = {
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
      $ref: getSchemaPath(ListVoteEventsResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export function ApiVoteEventsController() {
  return applyDecorators(
    ApiTags('투표 이벤트'),
    ApiExtraModels(
      CreateVoteEventRequestDto,
      CreateVoteEventResponseDto,
      ListVoteEventsPageInfoDto,
      ListVoteEventsResponseDto,
      VoteEventListItemDto,
    ),
  );
}

export function ApiListVoteEvents() {
  return applyDecorators(
    ApiOperation({
      description:
        '진행중인 투표 이벤트를 메인 투표와 마감임박순 목록으로 조회합니다. accessToken이 유효하면 참여한 투표의 선택지 비율을 함께 반환합니다.',
      summary: '진행중인 투표 이벤트 목록 조회',
    }),
    ApiBearerAuth(),
    ApiSecurity({}),
    ApiQuery({
      description: '한 번에 조회할 투표 이벤트 수',
      name: 'limit',
      required: false,
      schema: { default: 20, maximum: 50, minimum: 1, type: 'integer' },
    }),
    ApiQuery({
      description: '다음 페이지 조회용 opaque cursor',
      name: 'cursor',
      required: false,
      schema: { type: 'string' },
    }),
    ApiOkResponse({
      description: '진행중인 투표 이벤트 목록을 반환합니다.',
      schema: listVoteEventsResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'cursor 또는 query가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'accessToken이 유효하지 않습니다.',
    }),
  );
}

export function ApiCreateVoteEvent() {
  return applyDecorators(
    ApiOperation({ summary: '투표 이벤트 생성' }),
    ApiBearerAuth(),
    ApiBody({
      examples: {
        default: {
          summary: '투표 이벤트 생성 요청',
          value: {
            category: 'betting',
            optionA: '김치찌개',
            optionAImageUrl: null,
            optionB: '돈까스',
            optionBImageUrl: 'https://example.com/b.jpg',
            title: '점심 메뉴는?',
          },
        },
      },
      type: CreateVoteEventRequestDto,
    }),
    ApiCreatedResponse({
      description: '투표 이벤트가 생성되었습니다.',
      schema: createVoteEventResponseSchema,
    }),
    ApiBadRequestResponse({
      description: '투표 이벤트 생성 요청 body가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'accessToken이 없거나 유효하지 않습니다.',
    }),
  );
}
