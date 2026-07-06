import { getSchemaPath } from '@nestjs/swagger';
import { CreateImageUploadResponseDto } from './dto/create-image-upload.dto';

export const createImageUploadResponseSchema = {
  example: {
    data: {
      allowedContentTypes: ['image/jpeg', 'image/webp'],
      expiresAt: '2026-07-06T00:10:00.000Z',
      formFields: {
        api_key: '123456789012345',
        public_id:
          'seesaw/vote-event-option/8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
        signature: 'b5c4c38f4d5c2e5f4c3b2a190807060504030201',
        timestamp: 1_783_305_600,
      },
      maxBytes: 2_097_152,
      uploadUrl: 'https://api.cloudinary.com/v1_1/seesaw/image/upload',
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(CreateImageUploadResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};
