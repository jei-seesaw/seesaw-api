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
});

interface AffiliationListEnvelope {
  data: AffiliationRow[];
}

interface AffiliationRow {
  code: string;
  name: string;
}
