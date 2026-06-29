import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export function ApiHealthController() {
  return ApiTags('Health');
}

export function ApiGetHealth() {
  return applyDecorators(
    ApiOperation({ summary: 'Check API health' }),
    ApiOkResponse({
      description: 'API is healthy',
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
