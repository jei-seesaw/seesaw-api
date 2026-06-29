import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

export function ApiExamplesController() {
  return ApiTags('Examples');
}

export function ApiGetExampleError() {
  return applyDecorators(
    ApiOperation({ summary: 'Return an example bad request error' }),
    ApiBadRequestResponse({
      description: 'Example error response',
      schema: {
        example: { error: { code: 'bad_request', message: 'Example error' } },
        properties: {
          error: {
            properties: {
              code: { example: 'bad_request', type: 'string' },
              message: { example: 'Example error', type: 'string' },
            },
            required: ['code', 'message'],
            type: 'object',
          },
        },
        required: ['error'],
        type: 'object',
      },
    }),
  );
}
