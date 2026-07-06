import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { EnvConfig } from '../../src/config/env';
import {
  IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES,
  IMAGE_UPLOAD_MAX_BYTES,
  ImageUploadsService,
} from '../../src/image-uploads/image-uploads.service';

describe('ImageUploadsService', () => {
  let service: ImageUploadsService;

  beforeEach(() => {
    service = new ImageUploadsService(
      createConfig({
        CLOUDINARY_API_KEY: 'test-api-key',
        CLOUDINARY_API_SECRET: 'test-api-secret',
        CLOUDINARY_CLOUD_NAME: 'seesaw-test',
        CLOUDINARY_UPLOAD_FOLDER: 'seesaw-test',
      }),
    );
  });

  it('투표 이벤트 선택지 이미지 업로드 서명값을 만든다', () => {
    const startedAt = Math.floor(Date.now() / 1000);
    const result = service.createUploadSignature({
      bytes: 420_000,
      contentType: 'image/jpeg',
      purpose: 'vote-event-option',
    });
    const finishedAt = Math.floor(Date.now() / 1000);

    expect(result).toMatchObject({
      allowedContentTypes: IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES,
      formFields: {
        api_key: 'test-api-key',
      },
      maxBytes: IMAGE_UPLOAD_MAX_BYTES,
      uploadUrl: 'https://api.cloudinary.com/v1_1/seesaw-test/image/upload',
    });
    expect(result.formFields.timestamp).toBeGreaterThanOrEqual(startedAt);
    expect(result.formFields.timestamp).toBeLessThanOrEqual(finishedAt);
    expect(result.expiresAt).toBe(
      new Date((result.formFields.timestamp + 10 * 60) * 1000).toISOString(),
    );
    expect(result.formFields.public_id).toMatch(
      /^seesaw-test\/vote-event-option\/[0-9a-f-]{36}$/,
    );
    expect(result.formFields.signature).toBe(
      signCloudinaryUpload(
        {
          public_id: result.formFields.public_id,
          timestamp: result.formFields.timestamp,
        },
        'test-api-secret',
      ),
    );
  });

  it('허용하지 않는 MIME 타입은 서명하지 않는다', () => {
    expect(() =>
      service.createUploadSignature({
        bytes: 420_000,
        contentType: 'image/gif',
        purpose: 'vote-event-option',
      }),
    ).toThrow('Invalid image upload request');
  });

  it('최대 용량을 넘는 이미지는 서명하지 않는다', () => {
    expect(() =>
      service.createUploadSignature({
        bytes: IMAGE_UPLOAD_MAX_BYTES + 1,
        contentType: 'image/webp',
        purpose: 'vote-event-option',
      }),
    ).toThrow('Invalid image upload request');
  });
});

function signCloudinaryUpload(
  fields: { public_id: string; timestamp: number },
  secret: string,
): string {
  return createHash('sha1')
    .update(
      `public_id=${fields.public_id}&timestamp=${fields.timestamp}${secret}`,
    )
    .digest('hex');
}

function createConfig(
  values: Pick<
    EnvConfig,
    | 'CLOUDINARY_API_KEY'
    | 'CLOUDINARY_API_SECRET'
    | 'CLOUDINARY_CLOUD_NAME'
    | 'CLOUDINARY_UPLOAD_FOLDER'
  >,
): ConfigService<EnvConfig, true> {
  return {
    getOrThrow: (key: keyof typeof values) => values[key],
  } as ConfigService<EnvConfig, true>;
}
