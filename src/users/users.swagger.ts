import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { NicknameAvailabilityResponseDto } from './dto/nickname-availability.dto';

const nicknameAvailabilityResponseSchema = {
  properties: {
    data: {
      $ref: getSchemaPath(NicknameAvailabilityResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export function ApiUsersController() {
  return applyDecorators(
    ApiTags('Users'),
    ApiExtraModels(NicknameAvailabilityResponseDto),
  );
}

export function ApiCheckNicknameAvailability() {
  return applyDecorators(
    ApiOperation({ summary: 'Check nickname availability' }),
    ApiQuery({
      name: 'nickname',
      required: true,
      schema: { maxLength: 120, minLength: 1, type: 'string' },
    }),
    ApiOkResponse({
      description: 'Nickname availability checked',
      schema: nicknameAvailabilityResponseSchema,
    }),
    ApiBadRequestResponse({ description: 'Invalid nickname query' }),
  );
}
