import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  ApiResponseInterceptor,
  GlobalExceptionFilter,
} from './common/http-response';
import { ExamplesController } from './examples.controller';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, ExamplesController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
