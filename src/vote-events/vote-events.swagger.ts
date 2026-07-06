import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CastVoteRequestDto } from './dto/cast-vote.dto';
import {
  CreateVoteEventRequestDto,
  CreateVoteEventResponseDto,
  VOTE_EVENT_CATEGORIES,
} from './dto/create-vote-event.dto';
import {
  VoteEventAffiliationStatDto,
  VoteEventDetailResponseDto,
} from './dto/vote-event-detail.dto';
import {
  ListCompletedVoteEventsResponseDto,
  ListVoteEventsPageInfoDto,
  ListVoteEventsResponseDto,
  VOTE_EVENT_LIST_SORTS,
  VoteEventListItemDto,
} from './dto/list-vote-events.dto';
import {
  castVoteResponseSchema,
  createVoteEventResponseSchema,
  listCompletedVoteEventsResponseSchema,
  listMyVoteEventsResponseSchema,
  listVoteEventsResponseSchema,
  voteEventDetailResponseSchema,
} from './vote-events.swagger.schemas';

export function ApiVoteEventsController() {
  return applyDecorators(
    ApiTags('투표 이벤트'),
    ApiExtraModels(
      CastVoteRequestDto,
      CreateVoteEventRequestDto,
      CreateVoteEventResponseDto,
      ListCompletedVoteEventsResponseDto,
      ListVoteEventsPageInfoDto,
      ListVoteEventsResponseDto,
      VoteEventAffiliationStatDto,
      VoteEventDetailResponseDto,
      VoteEventListItemDto,
    ),
  );
}

export function ApiListVoteEvents() {
  return applyDecorators(
    ApiOperation({
      description:
        '진행중인 투표 이벤트를 참여자 수 우선(동률이면 마감임박순) 메인 투표와 선택한 정렬 목록으로 조회합니다. accessToken이 유효하면 참여한 투표의 선택지 비율을 함께 반환합니다.',
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
    ApiQuery({
      description:
        '정렬 기준. latest는 최신 생성순, deadline은 마감 기준순, participants는 참여자 많은 순입니다.',
      name: 'sort',
      required: false,
      schema: { default: 'latest', enum: [...VOTE_EVENT_LIST_SORTS], type: 'string' },
    }),
    ApiQuery({
      description: '조회할 투표 이벤트 카테고리. 생략하면 전체를 조회합니다.',
      name: 'category',
      required: false,
      schema: { enum: [...VOTE_EVENT_CATEGORIES], type: 'string' },
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

export function ApiListCompletedVoteEvents() {
  return applyDecorators(
    ApiOperation({
      description:
        '완료된 투표 이벤트를 최근 완료순으로 조회합니다. 완료된 투표는 로그인 또는 참여 여부와 무관하게 선택지 비율을 반환합니다.',
      summary: '완료된 투표 이벤트 목록 조회',
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
    ApiQuery({
      description:
        '정렬 기준. latest는 최신 생성순, deadline은 마감 기준순, participants는 참여자 많은 순입니다.',
      name: 'sort',
      required: false,
      schema: { default: 'latest', enum: [...VOTE_EVENT_LIST_SORTS], type: 'string' },
    }),
    ApiQuery({
      description: '조회할 투표 이벤트 카테고리. 생략하면 전체를 조회합니다.',
      name: 'category',
      required: false,
      schema: { enum: [...VOTE_EVENT_CATEGORIES], type: 'string' },
    }),
    ApiOkResponse({
      description: '완료된 투표 이벤트 목록을 반환합니다.',
      schema: listCompletedVoteEventsResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'cursor 또는 query가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'accessToken이 유효하지 않습니다.',
    }),
  );
}

export function ApiListCreatedVoteEvents() {
  return applyDecorators(
    ApiOperation({
      description:
        '로그인한 사용자가 만든 투표 이벤트를 진행/완료 구분 없이 최신 생성순으로 조회합니다.',
      summary: '내가 만든 투표 이벤트 목록 조회',
    }),
    ApiBearerAuth(),
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
    ApiQuery({
      description:
        '정렬 기준. latest는 최신 생성순, deadline은 진행중 마감임박순 뒤 완료 최근순, participants는 참여자 많은 순입니다.',
      name: 'sort',
      required: false,
      schema: { default: 'latest', enum: [...VOTE_EVENT_LIST_SORTS], type: 'string' },
    }),
    ApiQuery({
      description: '조회할 투표 이벤트 카테고리. 생략하면 전체를 조회합니다.',
      name: 'category',
      required: false,
      schema: { enum: [...VOTE_EVENT_CATEGORIES], type: 'string' },
    }),
    ApiOkResponse({
      description: '내가 만든 투표 이벤트 목록을 반환합니다.',
      schema: listMyVoteEventsResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'cursor 또는 query가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'accessToken이 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiListParticipatedVoteEvents() {
  return applyDecorators(
    ApiOperation({
      description:
        '로그인한 사용자가 참여한 투표 이벤트를 진행/완료 구분 없이 최신 생성순으로 조회합니다.',
      summary: '내가 참여한 투표 이벤트 목록 조회',
    }),
    ApiBearerAuth(),
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
    ApiQuery({
      description:
        '정렬 기준. latest는 최신 생성순, deadline은 진행중 마감임박순 뒤 완료 최근순, participants는 참여자 많은 순입니다.',
      name: 'sort',
      required: false,
      schema: { default: 'latest', enum: [...VOTE_EVENT_LIST_SORTS], type: 'string' },
    }),
    ApiQuery({
      description: '조회할 투표 이벤트 카테고리. 생략하면 전체를 조회합니다.',
      name: 'category',
      required: false,
      schema: { enum: [...VOTE_EVENT_CATEGORIES], type: 'string' },
    }),
    ApiOkResponse({
      description: '내가 참여한 투표 이벤트 목록을 반환합니다.',
      schema: listMyVoteEventsResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'cursor 또는 query가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'accessToken이 없거나 유효하지 않습니다.',
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
            deadlineAt: '2026-07-06T11:00:00+09:00',
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
    ApiUnprocessableEntityResponse({
      description: '투표 마감시간 의미 규칙이 유효하지 않습니다.',
    }),
  );
}

export function ApiVote() {
  return applyDecorators(
    ApiOperation({
      description:
        '로그인한 사용자가 진행중인 투표 이벤트에서 A 또는 B 선택지를 선택합니다. 배팅 투표는 tokenAmount가 필요하고, 일반 투표는 tokenAmount를 보내지 않습니다.',
      summary: '투표 진행',
    }),
    ApiBearerAuth(),
    ApiBody({
      examples: {
        betting: {
          summary: '배팅 투표 요청',
          value: {
            selectedOption: 'A',
            tokenAmount: 25,
            voteEventId: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
          },
        },
        default: {
          summary: '일반 투표 요청',
          value: {
            selectedOption: 'B',
            voteEventId: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
          },
        },
      },
      type: CastVoteRequestDto,
    }),
    ApiOkResponse({
      description: '투표가 기록되었습니다.',
      schema: castVoteResponseSchema,
    }),
    ApiBadRequestResponse({
      description: '투표 진행 요청 body가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'accessToken이 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description: '투표 이벤트를 찾을 수 없습니다.',
    }),
    ApiConflictResponse({
      description:
        '마감, 중복 참여, 또는 보유 토큰 부족으로 투표할 수 없습니다.',
    }),
    ApiUnprocessableEntityResponse({
      description: '투표 카테고리와 토큰 요청이 맞지 않습니다.',
    }),
  );
}

export function ApiGetVoteEventDetail() {
  return applyDecorators(
    ApiOperation({
      description:
        '투표 이벤트 상세 정보를 조회합니다. 진행중인 투표의 결과 정보는 참여한 사용자에게만 공개하고, 완료된 투표는 모두에게 공개합니다.',
      summary: '투표 이벤트 상세 조회',
    }),
    ApiBearerAuth(),
    ApiSecurity({}),
    ApiParam({
      description: '투표 이벤트 ID',
      name: 'id',
      schema: { type: 'string' },
    }),
    ApiOkResponse({
      description: '투표 이벤트 상세 정보를 반환합니다.',
      schema: voteEventDetailResponseSchema,
    }),
    ApiUnauthorizedResponse({
      description: 'accessToken이 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description: '투표 이벤트를 찾을 수 없습니다.',
    }),
  );
}
