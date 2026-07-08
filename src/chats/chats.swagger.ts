import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ChatMessageDto,
  ChatMessagesPageInfoDto,
  ChatMessageUserDto,
  ListChatMessagesQueryDto,
  ListChatMessagesResponseDto,
} from './dto/list-chat-messages.dto';

export function ApiChatsController() {
  return applyDecorators(
    ApiTags('채팅'),
    ApiExtraModels(
      ChatMessageDto,
      ChatMessagesPageInfoDto,
      ChatMessageUserDto,
      ListChatMessagesQueryDto,
      ListChatMessagesResponseDto,
    ),
  );
}

export function ApiListChatMessages() {
  return applyDecorators(
    ApiOperation({
      description:
        '로그인한 사용자가 투표 이벤트 채팅방의 최근 메시지 또는 cursor보다 오래된 메시지를 조회합니다. 응답 메시지는 오래된 순서부터 정렬됩니다.',
      summary: '투표 이벤트 채팅 메시지 조회',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: '투표 이벤트 ID',
      name: 'id',
      schema: { type: 'string' },
    }),
    ApiQuery({
      description: '한 번에 조회할 채팅 메시지 수',
      name: 'limit',
      required: false,
      schema: { default: 50, maximum: 50, minimum: 1, type: 'integer' },
    }),
    ApiQuery({
      description: '이전 메시지 페이지 조회용 opaque cursor',
      name: 'cursor',
      required: false,
      schema: { type: 'string' },
    }),
    ApiOkResponse({
      description: '채팅 메시지 목록을 반환합니다.',
      schema: {
        properties: {
          data: { $ref: getSchemaPath(ListChatMessagesResponseDto) },
        },
        type: 'object',
      },
    }),
    ApiBadRequestResponse({
      description: 'cursor 또는 query가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'accessToken이 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description: '투표 이벤트를 찾을 수 없습니다.',
    }),
  );
}
