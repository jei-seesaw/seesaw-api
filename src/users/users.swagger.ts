import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';

const userResponseSchema = {
  properties: {
    data: {
      properties: {
        id: { format: 'uuid', type: 'string' as const },
        email: { format: 'email', type: 'string' as const },
        name: { type: 'string' as const },
        createdAt: { format: 'date-time', type: 'string' as const },
      },
      required: ['id', 'email', 'name', 'createdAt'],
      type: 'object' as const,
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export function ApiUsersController() {
  return ApiTags('Users');
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
