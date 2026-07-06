import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import type { EnvConfig } from '../config/env';
import type { CreateImageUploadResponseDto } from './dto/create-image-upload.dto';
import {
  IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_PURPOSES,
  IMAGE_UPLOAD_SIGNATURE_TTL_SECONDS,
  type ImageUploadContentType,
  type ImageUploadPurpose,
} from './image-uploads.constants';

export {
  IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES,
  IMAGE_UPLOAD_MAX_BYTES,
} from './image-uploads.constants';

@Injectable()
export class ImageUploadsService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  createUploadSignature(
    dto: ImageUploadRequest,
  ): CreateImageUploadResponseDto {
    if (!isValidUploadRequest(dto)) {
      throw new BadRequestException('Invalid image upload request');
    }

    const cloudName = this.config.getOrThrow<string>(
      'CLOUDINARY_CLOUD_NAME',
    );
    const apiKey = this.config.getOrThrow<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.getOrThrow<string>(
      'CLOUDINARY_API_SECRET',
    );
    const folder = normalizeFolder(
      this.config.getOrThrow<string>('CLOUDINARY_UPLOAD_FOLDER'),
    );
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${folder}/${dto.purpose}/${randomUUID()}`;

    return {
      allowedContentTypes: [...IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES],
      expiresAt: new Date(
        (timestamp + IMAGE_UPLOAD_SIGNATURE_TTL_SECONDS) * 1000,
      ).toISOString(),
      formFields: {
        api_key: apiKey,
        public_id: publicId,
        signature: signCloudinaryUpload(
          { public_id: publicId, timestamp },
          apiSecret,
        ),
        timestamp,
      },
      maxBytes: IMAGE_UPLOAD_MAX_BYTES,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    };
  }
}

interface ImageUploadRequest {
  purpose: string;
  contentType: string;
  bytes: number;
}

function isValidUploadRequest(dto: ImageUploadRequest): boolean {
  return (
    isUploadPurpose(dto.purpose) &&
    isUploadContentType(dto.contentType) &&
    Number.isInteger(dto.bytes) &&
    dto.bytes >= 1 &&
    dto.bytes <= IMAGE_UPLOAD_MAX_BYTES
  );
}

function isUploadPurpose(value: string): value is ImageUploadPurpose {
  return IMAGE_UPLOAD_PURPOSES.includes(value as ImageUploadPurpose);
}

function isUploadContentType(value: string): value is ImageUploadContentType {
  return IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES.includes(
    value as ImageUploadContentType,
  );
}

function normalizeFolder(folder: string): string {
  return folder.replace(/^\/+|\/+$/g, '');
}

function signCloudinaryUpload(
  fields: { public_id: string; timestamp: number },
  secret: string,
): string {
  const payload = Object.entries(fields)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1').update(`${payload}${secret}`).digest('hex');
}
