import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import {
  IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_PURPOSES,
  type ImageUploadContentType,
  type ImageUploadPurpose,
} from '../image-uploads.constants';

export class CreateImageUploadRequestDto {
  @ApiProperty({
    description: '이미지 업로드 목적',
    enum: IMAGE_UPLOAD_PURPOSES,
    example: 'vote-event-option',
  })
  @IsIn(IMAGE_UPLOAD_PURPOSES)
  purpose!: ImageUploadPurpose;

  @ApiProperty({
    description: '업로드할 이미지 MIME 타입',
    enum: IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES,
    example: 'image/jpeg',
  })
  @IsIn(IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES)
  contentType!: ImageUploadContentType;

  @ApiProperty({
    description: '업로드할 이미지 파일 크기',
    example: 420_000,
    maximum: IMAGE_UPLOAD_MAX_BYTES,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(IMAGE_UPLOAD_MAX_BYTES)
  bytes!: number;
}

export class CloudinaryUploadFormFieldsDto {
  @ApiProperty({
    description: 'Cloudinary API key',
    example: '123456789012345',
  })
  api_key!: string;

  @ApiProperty({
    description: 'Cloudinary 서명 timestamp',
    example: 1_783_305_600,
  })
  timestamp!: number;

  @ApiProperty({
    description: 'Cloudinary public id',
    example: 'seesaw/vote-event-option/8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
  })
  public_id!: string;

  @ApiProperty({
    description: 'Cloudinary 업로드 서명',
    example: 'b5c4c38f4d5c2e5f4c3b2a190807060504030201',
  })
  signature!: string;
}

export class CreateImageUploadResponseDto {
  @ApiProperty({
    description: 'Cloudinary image upload endpoint',
    example: 'https://api.cloudinary.com/v1_1/seesaw/image/upload',
  })
  uploadUrl!: string;

  @ApiProperty({
    description: 'Cloudinary multipart form fields',
    type: CloudinaryUploadFormFieldsDto,
  })
  formFields!: CloudinaryUploadFormFieldsDto;

  @ApiProperty({
    description: '서명값 권장 사용 만료 시각',
    example: '2026-07-06T00:10:00.000Z',
    format: 'date-time',
  })
  expiresAt!: string;

  @ApiProperty({
    description: '허용 이미지 최대 크기',
    example: IMAGE_UPLOAD_MAX_BYTES,
  })
  maxBytes!: number;

  @ApiProperty({
    description: '허용 이미지 MIME 타입 목록',
    enum: IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES,
    example: ['image/jpeg', 'image/webp'],
    isArray: true,
  })
  allowedContentTypes!: ImageUploadContentType[];
}
