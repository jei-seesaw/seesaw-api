import { Module, ValidationPipe } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ApiResponseInterceptor } from './common/api-response';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { LoggingModule } from './common/logging/logging.module';
import { RequestLoggingInterceptor } from './common/logging/request-logging.interceptor';
import { AffiliationsModule } from './affiliations/affiliations.module';
import { AuthModule } from './auth/auth.module';
import { getEnvFilePaths, validateEnv } from './config/env';
import mikroOrmConfig from './config/mikro-orm.config';
import { HealthController } from './health/health.controller';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    LoggingModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePaths(),
      validate: validateEnv,
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    AffiliationsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
