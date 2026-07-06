import { MikroORM } from '@mikro-orm/mariadb';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_PREFIX } from '../../src/config/api-prefix';

describe('Affiliations endpoint', () => {
  let app: INestApplication;
  let server: Server;
  let orm: MikroORM;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
    server = app.getHttpServer() as Server;
    orm = app.get(MikroORM);
  });

  afterAll(async () => {
    await app.close();
  });

  it('소속 목록은 이름 오름차순으로 code와 name만 응답한다', async () => {
    const expectedRows = await orm.em
      .getConnection()
      .execute<AffiliationRow[]>(
        'select `code`, `name` from `affiliations` order by `name` asc',
      );

    return request(server)
      .get('/api/v2/affiliations')
      .expect(200)
      .expect((response: { body: unknown }) => {
        const body = response.body as AffiliationListEnvelope;

        expect(body.data).toEqual(expectedRows);
        body.data.forEach((row) => {
          expect(Object.keys(row)).toEqual(['code', 'name']);
        });
      });
  });

  it('신규 소속 8개를 노출하고 기존 소속은 노출하지 않는다', () => {
    return request(server)
      .get('/api/v2/affiliations')
      .expect(200)
      .expect((response: { body: unknown }) => {
        const body = response.body as AffiliationListEnvelope;
        const codes = body.data.map(({ code }) => code);
        const names = body.data.map(({ name }) => name);

        expect(body.data).toEqual(expect.arrayContaining(AFFILIATIONS));
        expect(codes).not.toContain(`teac${'her'}`);
        expect(codes).not.toContain(`head${'quarters'}`);
        expect(names).not.toContain(`선${'생님'}`);
        expect(names).not.toContain(`본${'사'}`);
      });
  });
});

const AFFILIATIONS: AffiliationRow[] = [
  { code: 'education', name: '재능교육' },
  { code: 'holdings', name: '재능홀딩스' },
  { code: 'broadcasting', name: '재능방송' },
  { code: 'retail', name: '재능유통' },
  { code: 'printing', name: '재능인쇄' },
  { code: 'e-academy', name: '재능e아카데미' },
  { code: 'self-learning', name: '재능셀프러닝' },
  { code: 'business-group', name: '사업조' },
];

interface AffiliationListEnvelope {
  data: AffiliationRow[];
}

interface AffiliationRow {
  code: string;
  name: string;
}
