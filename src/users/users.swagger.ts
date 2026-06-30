import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

const userResponseSchema = {
  properties: {
    data: {
      $ref: getSchemaPath(UserResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export function ApiUsersController() {
  return applyDecorators(ApiTags('Users'), ApiExtraModels(UserResponseDto));
}

export function ApiCreateUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a user' }),
    ApiBody({ type: CreateUserDto }),
    ApiCreatedResponse({
      description: 'User created',
      schema: userResponseSchema,
    }),
    ApiBadRequestResponse({ description: 'Invalid user payload' }),
  );
}

export function ApiGetUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a user by id' }),
    ApiParam({ format: 'uuid', name: 'id' }),
    ApiOkResponse({
      description: 'User found',
      schema: userResponseSchema,
    }),
    ApiNotFoundResponse({ description: 'User not found' }),
  );
}
