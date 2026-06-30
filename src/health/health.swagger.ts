import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export function ApiHealthController() {
  return ApiTags('상태');
}

export function ApiGetHealth() {
  return applyDecorators(
    ApiOperation({ summary: 'API 상태 확인' }),
    ApiOkResponse({
      description: 'API가 정상 동작 중입니다.',
      schema: {
        example: { data: { status: 'ok' } },
        properties: {
          data: {
            properties: {
              status: { enum: ['ok'], type: 'string' },
            },
            required: ['status'],
            type: 'object',
          },
        },
        required: ['data'],
        type: 'object',
      },
    }),
  );
}
