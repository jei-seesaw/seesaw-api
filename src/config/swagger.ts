import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { AppEnv } from './env';

export function setupSwagger(app: INestApplication, appEnv: AppEnv): void {
  if (appEnv === 'live') {
    return;
  }

  const documentConfig = new DocumentBuilder()
    .setTitle('Seesaw API')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, documentConfig);

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Seesaw API Docs',
    raw: ['json'],
  });
}
