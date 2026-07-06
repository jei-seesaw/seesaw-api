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
  example: {
    data: {
      id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(CreateUserResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

const nicknameAvailabilityResponseSchema = {
  example: {
    data: {
      available: true,
    },
  },
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
    ApiTags('회원'),
    ApiExtraModels(
      CreateUserRequestDto,
      CreateUserResponseDto,
      NicknameAvailabilityResponseDto,
    ),
  );
}

export function ApiCreateUser() {
  return applyDecorators(
    ApiOperation({ summary: '회원가입' }),
    ApiBody({
      examples: {
        default: {
          summary: '회원가입 요청',
          value: {
            affiliationCode: 'education',
            nickname: 'seesaw-user',
            password: 'password123',
          },
        },
      },
      type: CreateUserRequestDto,
    }),
    ApiCreatedResponse({
      description: '회원가입이 완료되었습니다.',
      schema: createUserResponseSchema,
    }),
    ApiBadRequestResponse({ description: '회원가입 요청 body가 유효하지 않습니다.' }),
    ApiConflictResponse({ description: '이미 사용 중인 닉네임입니다.' }),
    ApiUnprocessableEntityResponse({ description: '존재하지 않는 소속 코드입니다.' }),
  );
}

export function ApiCheckNicknameAvailability() {
  return applyDecorators(
    ApiOperation({ summary: '닉네임 사용 가능 여부 확인' }),
    ApiQuery({
      description: '확인할 닉네임',
      name: 'nickname',
      required: true,
      schema: {
        example: 'seesaw-user',
        maxLength: 120,
        minLength: 1,
        type: 'string',
      },
    }),
    ApiOkResponse({
      description: '닉네임 사용 가능 여부를 반환합니다.',
      schema: nicknameAvailabilityResponseSchema,
    }),
    ApiBadRequestResponse({ description: '닉네임 query가 유효하지 않습니다.' }),
  );
}
