import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AuthService } from '../../src/auth/auth.service';
import { OptionalJwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { API_PREFIX } from '../../src/config/api-prefix';
import { HomeController } from '../../src/home/home.controller';
import { HomeService } from '../../src/home/home.service';

describe('Home Swagger', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            verifyAccessToken: () =>
              Promise.resolve({ id: 'user-id', nickname: 'user' }),
          },
        },
        OptionalJwtAuthGuard,
        {
          provide: HomeService,
          useValue: {
            getHome: () => Promise.resolve(undefined),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Test')
        .setVersion('0.0.0')
        .addBearerAuth()
        .build(),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it('메인페이지 조회 계약을 Swagger JSON에 노출한다', () => {
    expect(document.components?.schemas?.HomeSummaryResponseDto).toMatchObject({
      properties: {
        completedVoteEventCount: {
          description: '완료된 투표 이벤트 수',
          example: 4,
          type: 'number',
        },
        isLoggedIn: {
          description: '현재 요청의 로그인 여부',
          example: true,
          type: 'boolean',
        },
        ongoingVoteEventCount: {
          description: '진행중인 투표 이벤트 수',
          example: 8,
          type: 'number',
        },
        participantCount: {
          description: '투표 이벤트에 참여한 참여자 수 합계',
          example: 128,
          type: 'number',
        },
        voteToken: {
          description: '로그인한 사용자의 현재 투표 토큰 수',
          example: 1000,
          type: 'number',
        },
      },
      required: [
        'isLoggedIn',
        'ongoingVoteEventCount',
        'completedVoteEventCount',
        'participantCount',
      ],
      type: 'object',
    });
    expect(document.paths['/api/v2/home']?.get).toMatchObject({
      summary: '메인페이지 정보 조회',
      responses: {
        '200': { description: '메인페이지 정보를 조회했습니다.' },
        '401': { description: '전달된 accessToken이 유효하지 않습니다.' },
      },
    });
    expect(document.paths['/api/v2/home']?.get?.security).toEqual(
      expect.arrayContaining([{ bearer: [] }, {}]),
    );
  });
});
