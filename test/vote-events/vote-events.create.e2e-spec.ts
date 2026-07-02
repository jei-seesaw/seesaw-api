import type { Server } from 'node:http';
import request from 'supertest';
import { createVoteEventsE2eContext, type VoteEventsE2eContext } from './vote-events.e2e.fixture';
import type { CreateVoteEventEnvelope, ErrorEnvelope, VoteEventRow } from './vote-events.e2e.types';

describe('Vote events create endpoint', () => {
  let context: VoteEventsE2eContext;
  let orm: VoteEventsE2eContext['orm'];
  let server: Server;
  let issueAccessToken: VoteEventsE2eContext['issueAccessToken'];

  beforeAll(async () => {
    context = await createVoteEventsE2eContext();
    ({ server, orm, issueAccessToken } = context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('투표 이벤트를 만들면 id만 응답하고 초기 집계값을 저장한다', async () => {
    const startedAt = Date.now();
    const accessToken = await issueAccessToken(`vote-event-${startedAt}`);

    const response = await request(server)
      .post('/api/v2/vote-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        category: 'betting',
        optionA: '김치찌개',
        optionAImageUrl: null,
        optionB: '돈까스',
        optionBImageUrl: 'https://example.com/b.jpg',
        title: `점심 메뉴는? ${startedAt}`,
      })
      .expect(201)
      .expect((response: { body: unknown }) => {
        expect(Object.keys((response.body as CreateVoteEventEnvelope).data)).toEqual([
          'id',
        ]);
      });

    const { id } = (response.body as CreateVoteEventEnvelope).data;
    const rows = await orm.em.getConnection().execute<VoteEventRow[]>(
      'select `category`, `title`, `option_a`, `option_b`, `option_a_image_url`, `option_b_image_url`, `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `option_a_participant_count`, `option_b_participant_count`, `created_at`, `deadline_at` from `vote_events` where `id` = ?',
      [id],
    );

    expect(rows).toHaveLength(1);
    const row = rows[0]!;

    expect(row).toMatchObject({
      category: 'betting',
      option_a: '김치찌개',
      option_a_image_url: null,
      option_b: '돈까스',
      option_b_image_url: 'https://example.com/b.jpg',
      total_participant_count: 0,
      total_token_amount: 0,
      option_a_token_amount: 0,
      option_b_token_amount: 0,
      option_a_participant_count: 0,
      option_b_participant_count: 0,
    });
    expect(
      new Date(row.deadline_at).getTime() -
        new Date(row.created_at).getTime(),
    ).toBe(24 * 60 * 60 * 1000);
  });
  it('accessToken이 없으면 투표 이벤트 생성을 거절한다', () => {
    return request(server)
      .post('/api/v2/vote-events')
      .send({
        category: 'betting',
        optionA: '김치찌개',
        optionB: '돈까스',
        title: '점심 메뉴는?',
      })
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });
  });
  it('투표 이벤트 요청 body가 유효하지 않으면 요청 경계에서 거절한다', async () => {
    const accessToken = await issueAccessToken(`invalid-vote-event-${Date.now()}`);

    return request(server)
      .post('/api/v2/vote-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        category: 'unknown',
        optionA: '',
        optionAImageUrl: 'not-a-url',
        optionB: '',
        title: '',
      })
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'validation_error',
        );
      });
  });
});
