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
      { code: 'headquarters', name: '본사' },
      { code: 'teacher', name: '선생님' },
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
