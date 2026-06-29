import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ApiResponseInterceptor } from './common/api-response';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { LoggingModule } from './common/logging/logging.module';
import { RequestLoggingInterceptor } from './common/logging/request-logging.interceptor';
import { getEnvFilePaths, validateEnv } from './config/env';
import { ExamplesController } from './examples.controller';
import { HealthController } from './health.controller';

@Module({
  imports: [
    LoggingModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePaths(),
      validate: validateEnv,
    }),
  ],
  controllers: [HealthController, ExamplesController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
