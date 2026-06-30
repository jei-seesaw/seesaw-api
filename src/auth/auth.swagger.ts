import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  AccessTokenResponseDto,
  LoginRequestDto,
} from './dto/login.dto';

const accessTokenResponseSchema = {
  example: {
    data: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(AccessTokenResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export function ApiAuthController() {
  return applyDecorators(
    ApiTags('인증'),
    ApiExtraModels(LoginRequestDto, AccessTokenResponseDto),
  );
}

export function ApiLogin() {
  return applyDecorators(
    ApiOperation({ summary: '로그인' }),
    ApiBody({
      examples: {
        default: {
          summary: '로그인 요청',
          value: {
            nickname: 'seesaw-user',
            password: 'password123',
          },
        },
      },
      type: LoginRequestDto,
    }),
    ApiOkResponse({
      description: '로그인이 완료되었습니다.',
      schema: accessTokenResponseSchema,
    }),
    ApiBadRequestResponse({ description: '로그인 요청 body가 유효하지 않습니다.' }),
    ApiUnauthorizedResponse({
      description: '닉네임 또는 비밀번호가 올바르지 않습니다.',
    }),
  );
}

export function ApiRefreshToken() {
  return applyDecorators(
    ApiOperation({ summary: 'accessToken 재발급' }),
    ApiCookieAuth('refreshToken'),
    ApiOkResponse({
      description: 'accessToken을 재발급합니다.',
      schema: accessTokenResponseSchema,
    }),
    ApiUnauthorizedResponse({
      description: 'refreshToken cookie가 없거나 유효하지 않습니다.',
    }),
  );
}
