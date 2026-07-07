import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AuthService } from '../../src/auth/auth.service';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../../src/auth/guards/jwt-auth.guard';
import { API_PREFIX } from '../../src/config/api-prefix';
import { VoteEventsController } from '../../src/vote-events/vote-events.controller';
import { VoteEventsService } from '../../src/vote-events/vote-events.service';

export interface VoteEventsSwaggerContext {
  app: INestApplication;
  document: OpenAPIObject;
  close: () => Promise<void>;
}

export async function createVoteEventsSwaggerContext(): Promise<VoteEventsSwaggerContext> {
  const moduleRef = await Test.createTestingModule({
    controllers: [VoteEventsController],
    providers: [
      {
        provide: AuthService,
        useValue: {
          verifyAccessToken: () =>
            Promise.resolve({ id: 'user-id', nickname: 'user' }),
        },
      },
      {
        provide: JwtAuthGuard,
        useValue: {
          canActivate: () => true,
        },
      },
      {
        provide: OptionalJwtAuthGuard,
        useValue: {
          canActivate: () => true,
        },
      },
      {
        provide: VoteEventsService,
        useValue: {
          claimBettingReward: () => Promise.resolve(undefined),
          create: () => Promise.resolve(undefined),
          confirmBettingResult: () => Promise.resolve(null),
          getDetail: () => Promise.resolve(undefined),
          listCreatedByUser: () => Promise.resolve(undefined),
          listCompleted: () => Promise.resolve(undefined),
          listOngoing: () => Promise.resolve(undefined),
          listParticipatedByUser: () => Promise.resolve(undefined),
          vote: () => Promise.resolve(null),
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(API_PREFIX);
  await app.init();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Test')
      .setVersion('0.0.0')
      .addBearerAuth()
      .build(),
  );

  return {
    app,
    close: () => app.close(),
    document,
  };
}
