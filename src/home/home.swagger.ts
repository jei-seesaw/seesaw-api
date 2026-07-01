import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { HomeSummaryResponseDto } from './dto/home-summary.dto';

const homeSummaryResponseSchema = {
  example: {
    data: {
      completedVoteEventCount: 4,
      isLoggedIn: true,
      ongoingVoteEventCount: 8,
      participantCount: 128,
      voteToken: 1000,
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(HomeSummaryResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export function ApiHomeController() {
  return applyDecorators(
    ApiTags('메인페이지'),
    ApiExtraModels(HomeSummaryResponseDto),
  );
}

export function ApiGetHome() {
  return applyDecorators(
    ApiOperation({
      description:
        '로그인하지 않아도 공개 집계를 조회할 수 있고, accessToken이 유효하면 voteToken을 함께 반환합니다.',
      summary: '메인페이지 정보 조회',
    }),
    ApiBearerAuth(),
    ApiSecurity({}),
    ApiOkResponse({
      description: '메인페이지 정보를 조회했습니다.',
      schema: homeSummaryResponseSchema,
    }),
    ApiUnauthorizedResponse({
      description: '전달된 accessToken이 유효하지 않습니다.',
    }),
  );
}
