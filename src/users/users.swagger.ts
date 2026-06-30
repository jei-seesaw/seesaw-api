import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CreateUserRequestDto,
  CreateUserResponseDto,
} from './dto/create-user.dto';
import { NicknameAvailabilityResponseDto } from './dto/nickname-availability.dto';

const createUserResponseSchema = {
  properties: {
    data: {
      $ref: getSchemaPath(CreateUserResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

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
    ApiExtraModels(
      CreateUserRequestDto,
      CreateUserResponseDto,
      NicknameAvailabilityResponseDto,
    ),
  );
}

export function ApiCreateUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Create user' }),
    ApiBody({ type: CreateUserRequestDto }),
    ApiCreatedResponse({
      description: 'User created',
      schema: createUserResponseSchema,
    }),
    ApiBadRequestResponse({ description: 'Invalid signup request body' }),
    ApiConflictResponse({ description: 'Nickname already exists' }),
    ApiUnprocessableEntityResponse({ description: 'Invalid affiliation code' }),
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
