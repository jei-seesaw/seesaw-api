export const IMAGE_UPLOAD_PURPOSES = ['vote-event-option'] as const;
export type ImageUploadPurpose = (typeof IMAGE_UPLOAD_PURPOSES)[number];

export const IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/webp',
] as const;
export type ImageUploadContentType =
  (typeof IMAGE_UPLOAD_ALLOWED_CONTENT_TYPES)[number];

export const IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_UPLOAD_SIGNATURE_TTL_SECONDS = 10 * 60;
