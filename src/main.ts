import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppLogger } from './common/logging/app-logger.service';
import type { EnvConfig } from './config/env';
import { setupSwagger } from './config/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(AppLogger));

  const config = app.get(ConfigService<EnvConfig, true>);

  setupSwagger(app, config.getOrThrow('APP_ENV'));

  await app.listen(config.getOrThrow('PORT'));
}

void bootstrap();
