import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { EnvConfig } from './config/env';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvConfig, true>);

  await app.listen(config.getOrThrow('PORT'));
}

void bootstrap();
