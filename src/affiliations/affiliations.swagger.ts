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
    ApiTags('Affiliations'),
    ApiExtraModels(AffiliationResponseDto),
  );
}

export function ApiListAffiliations() {
  return applyDecorators(
    ApiOperation({ summary: 'List affiliations' }),
    ApiOkResponse({
      description: 'Affiliations listed',
      schema: affiliationListResponseSchema,
    }),
  );
}
