import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppLogger } from './common/logging/app-logger.service';
import { API_PREFIX } from './config/api-prefix';
import type { EnvConfig } from './config/env';
import { setupSwagger } from './config/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(AppLogger));
  app.setGlobalPrefix(API_PREFIX);

  const config = app.get(ConfigService<EnvConfig, true>);
  const corsOrigins = config.getOrThrow<string[]>('CORS_ORIGINS');

  app.enableCors({
    credentials: true,
    origin: corsOrigins,
  });
  setupSwagger(app, config.getOrThrow('APP_ENV'));

  await app.listen(config.getOrThrow('PORT'));
}

void bootstrap();
