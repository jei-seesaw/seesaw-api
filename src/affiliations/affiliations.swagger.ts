import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { AffiliationResponseDto } from './dto/affiliation.dto';

const affiliationListResponseSchema = {
  example: {
    data: [
      { code: 'business-group', name: '사업조직' },
      { code: 'e-academy', name: '재능e아카데미' },
      { code: 'education', name: '재능교육' },
      { code: 'broadcasting', name: '재능방송' },
      { code: 'self-learning', name: '재능셀프러닝' },
      { code: 'retail', name: '재능유통' },
      { code: 'printing', name: '재능인쇄' },
      { code: 'holdings', name: '재능홀딩스' },
    ],
  },
  properties: {
    data: {
      items: { $ref: getSchemaPath(AffiliationResponseDto) },
      type: 'array' as const,
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export function ApiAffiliationsController() {
  return applyDecorators(
    ApiTags('소속'),
    ApiExtraModels(AffiliationResponseDto),
  );
}

export function ApiListAffiliations() {
  return applyDecorators(
    ApiOperation({ summary: '소속 목록 조회' }),
    ApiOkResponse({
      description: '소속 목록을 반환합니다.',
      schema: affiliationListResponseSchema,
    }),
  );
}
