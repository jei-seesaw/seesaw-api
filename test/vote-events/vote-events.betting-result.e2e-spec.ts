import type { Server } from 'node:http';
import request from 'supertest';
import {
  createVoteEventsE2eContext,
  minutesFrom,
  type VoteEventsE2eContext,
} from './vote-events.e2e.fixture';
import type {
  ErrorEnvelope,
  VoteEventDetailEnvelope,
} from './vote-events.e2e.types';

interface BettingResultRow {
  betting_result_confirmed_at: Date | string | null;
  betting_result_option: 'A' | 'B' | null;
}

describe('Vote events betting result endpoint', () => {
  let context: VoteEventsE2eContext;
  let orm: VoteEventsE2eContext['orm'];
  let server: Server;
  let createUser: VoteEventsE2eContext['createUser'];
  let insertVoteEvent: VoteEventsE2eContext['insertVoteEvent'];
  let deleteListTestVoteEvents: VoteEventsE2eContext['deleteListTestVoteEvents'];
  let expectUserVoteToken: VoteEventsE2eContext['expectUserVoteToken'];

  beforeAll(async () => {
    context = await createVoteEventsE2eContext();
    ({
      server,
      orm,
      createUser,
      insertVoteEvent,
      deleteListTestVoteEvents,
      expectUserVoteToken,
    } = context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('주최자가 배팅 결과를 확정하면 승자에게 원금과 패자 풀을 정산한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-api-result-${Date.now()}`;
    const organizer = await createUser(`${prefix}-organizer`);
    const earlyWinner = await createUser(`${prefix}-early-winner`);
    const lateWinner = await createUser(`${prefix}-late-winner`);
    const loser = await createUser(`${prefix}-loser`);
    const voteEventId = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(new Date(), 10),
      organizerUserId: organizer.userId,
      title: `${prefix}-settlement`,
      totalParticipantCount: 0,
    });

    await castBettingVote(server, earlyWinner.accessToken, voteEventId, 'A', 1);
    await castBettingVote(server, lateWinner.accessToken, voteEventId, 'A', 1);
    await castBettingVote(server, loser.accessToken, voteEventId, 'B', 1);
    await setParticipationCreatedAt(
      context,
      voteEventId,
      earlyWinner.userId,
      new Date('2026-01-01T00:00:00.000Z'),
    );
    await setParticipationCreatedAt(
      context,
      voteEventId,
      lateWinner.userId,
      new Date('2026-01-01T00:00:01.000Z'),
    );

    await request(server)
      .post(`/api/v2/vote-events/${voteEventId}/betting-result`)
      .set('Authorization', `Bearer ${organizer.accessToken}`)
      .send({ winningOption: 'A' })
      .expect(200)
      .expect((response: { body: unknown }) => {
        expect(response.body).toEqual({ data: null });
      });

    await expectUserVoteToken(earlyWinner.userId, 1001);
    await expectUserVoteToken(lateWinner.userId, 1000);
    await expectUserVoteToken(loser.userId, 999);

    const rows = await orm.em.getConnection().execute<BettingResultRow[]>(
      'select `betting_result_option`, `betting_result_confirmed_at` from `vote_events` where `id` = ?',
      [voteEventId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      betting_result_option: 'A',
    });
    expect(rows[0]!.betting_result_confirmed_at).not.toBeNull();

    const detailResponse = await request(server)
      .get(`/api/v2/vote-events/${voteEventId}`)
      .set('Authorization', `Bearer ${organizer.accessToken}`)
      .expect(200);
    const detail = detailResponse.body as VoteEventDetailEnvelope;

    expect(detail.data).toMatchObject({
      bettingResultOption: 'A',
      canConfirmBettingResult: false,
      isOrganizer: true,
      optionAResultAmount: 2,
      optionARatio: 66.67,
      optionBResultAmount: 1,
      optionBRatio: 33.33,
      remainingTime: null,
    });
    expect(detail.data.bettingResultConfirmedAt).toEqual(expect.any(String));

    const afterClosed = await createUser(`${prefix}-after-closed`);

    await request(server)
      .post('/api/v2/vote')
      .set('Authorization', `Bearer ${afterClosed.accessToken}`)
      .send({ selectedOption: 'A', tokenAmount: 1, voteEventId })
      .expect(409)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'vote_event_closed',
        );
      });
    await expectUserVoteToken(afterClosed.userId, 1000);
  });

  it('승자가 없는 배팅 결과는 토큰 반환 없이 확정한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-api-result-${Date.now()}`;
    const organizer = await createUser(`${prefix}-no-winner-organizer`);
    const loser = await createUser(`${prefix}-only-loser`);
    const voteEventId = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(new Date(), 10),
      organizerUserId: organizer.userId,
      title: `${prefix}-no-winner`,
      totalParticipantCount: 0,
    });

    await castBettingVote(server, loser.accessToken, voteEventId, 'B', 5);

    await request(server)
      .post(`/api/v2/vote-events/${voteEventId}/betting-result`)
      .set('Authorization', `Bearer ${organizer.accessToken}`)
      .send({ winningOption: 'A' })
      .expect(200);

    await expectUserVoteToken(loser.userId, 995);
    const rows = await orm.em.getConnection().execute<BettingResultRow[]>(
      'select `betting_result_option`, `betting_result_confirmed_at` from `vote_events` where `id` = ?',
      [voteEventId],
    );

    expect(rows[0]).toMatchObject({ betting_result_option: 'A' });
    expect(rows[0]!.betting_result_confirmed_at).not.toBeNull();
  });
});

async function castBettingVote(
  server: Server,
  accessToken: string,
  voteEventId: string,
  selectedOption: 'A' | 'B',
  tokenAmount: number,
): Promise<void> {
  await request(server)
    .post('/api/v2/vote')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ selectedOption, tokenAmount, voteEventId })
    .expect(200);
}

async function setParticipationCreatedAt(
  context: VoteEventsE2eContext,
  voteEventId: string,
  userId: string,
  createdAt: Date,
): Promise<void> {
  await context.orm.em.getConnection().execute(
    'update `vote_event_participations` set `created_at` = ? where `vote_event_id` = ? and `user_id` = ?',
    [createdAt, voteEventId, userId],
  );
}
