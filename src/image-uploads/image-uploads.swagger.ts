import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CloudinaryUploadFormFieldsDto,
  CreateImageUploadRequestDto,
  CreateImageUploadResponseDto,
} from './dto/create-image-upload.dto';
import { createImageUploadResponseSchema } from './image-uploads.swagger.schemas';

export function ApiImageUploadsController() {
  return applyDecorators(
    ApiTags('이미지 업로드'),
    ApiExtraModels(
      CloudinaryUploadFormFieldsDto,
      CreateImageUploadRequestDto,
      CreateImageUploadResponseDto,
    ),
  );
}

export function ApiCreateImageUpload() {
  return applyDecorators(
    ApiOperation({
      description:
        '투표 생성 버튼을 누른 뒤 최종 선택된 선택지 이미지를 Cloudinary에 직접 업로드할 수 있도록 짧은 만료 시각의 signed upload 값을 발급합니다.',
      summary: '이미지 직접 업로드 서명 발급',
    }),
    ApiBearerAuth(),
    ApiBody({
      examples: {
        default: {
          summary: '투표 이벤트 선택지 이미지 업로드 요청',
          value: {
            bytes: 420_000,
            contentType: 'image/jpeg',
            purpose: 'vote-event-option',
          },
        },
      },
      type: CreateImageUploadRequestDto,
    }),
    ApiCreatedResponse({
      description: 'Cloudinary 직접 업로드 서명값을 발급했습니다.',
      schema: createImageUploadResponseSchema,
    }),
    ApiBadRequestResponse({
      description: '이미지 업로드 요청 body가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'accessToken이 없거나 유효하지 않습니다.',
    }),
  );
}
