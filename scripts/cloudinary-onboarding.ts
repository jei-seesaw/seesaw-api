#!/usr/bin/env node

import { existsSync } from 'node:fs';

const { v2: cloudinary } = require('cloudinary') as typeof import('cloudinary');

for (const envFilePath of ['.env.local', '.env']) {
  if (existsSync(envFilePath)) process.loadEnvFile(envFilePath);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  cloudinary.config({
    cloud_name: requiredEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: requiredEnv('CLOUDINARY_API_KEY'),
    api_secret: requiredEnv('CLOUDINARY_API_SECRET'),
    secure: true,
  });

  const upload = await cloudinary.uploader.upload(
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    {
      folder: 'onboarding',
      resource_type: 'image',
    },
  );

  console.log(`Uploaded secure URL: ${upload.secure_url}`);
  console.log(`Uploaded public ID: ${upload.public_id}`);

  const details = await cloudinary.api.resource(upload.public_id, {
    resource_type: 'image',
    type: 'upload',
  });

  console.log(`Width: ${details.width}`);
  console.log(`Height: ${details.height}`);
  console.log(`Format: ${details.format}`);
  console.log(`Bytes: ${details.bytes}`);

  const optimizedUrl = cloudinary.url(upload.public_id, {
    secure: true,
    fetch_format: 'auto', // f_auto: choose the best image format for the browser.
    quality: 'auto', // q_auto: balance image quality and file size automatically.
  });

  console.log(
    'Done! Click link below to see optimized version of the image. Check the size and the format.',
  );
  console.log(optimizedUrl);
}

main().catch((error: unknown) => {
  console.error('Cloudinary onboarding failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
