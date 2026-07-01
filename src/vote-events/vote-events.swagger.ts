import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CreateVoteEventRequestDto,
  CreateVoteEventResponseDto,
} from './dto/create-vote-event.dto';

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

export function ApiVoteEventsController() {
  return applyDecorators(
    ApiTags('투표 이벤트'),
    ApiExtraModels(CreateVoteEventRequestDto, CreateVoteEventResponseDto),
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
