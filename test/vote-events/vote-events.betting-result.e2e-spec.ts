import { randomUUID } from 'node:crypto';
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
  let insertParticipation: VoteEventsE2eContext['insertParticipation'];
  let deleteListTestVoteEvents: VoteEventsE2eContext['deleteListTestVoteEvents'];
  let expectUserVoteToken: VoteEventsE2eContext['expectUserVoteToken'];

  beforeAll(async () => {
    context = await createVoteEventsE2eContext();
    ({
      server,
      orm,
      createUser,
      insertVoteEvent,
      insertParticipation,
      deleteListTestVoteEvents,
      expectUserVoteToken,
    } = context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('결과 확정은 정답만 저장하고 보상 수령 API가 승자에게 한 번만 지급한다', async () => {
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

    await expectUserVoteToken(earlyWinner.userId, 999);
    await expectUserVoteToken(loser.userId, 999);
    await expectUserVoteToken(lateWinner.userId, 999);

    const rows = await orm.em.getConnection().execute<BettingResultRow[]>(
      'select `betting_result_option`, `betting_result_confirmed_at` from `vote_events` where `id` = ?',
      [voteEventId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      betting_result_option: 'A',
    });
    expect(rows[0]!.betting_result_confirmed_at).not.toBeNull();

    const winnerDetailBeforeClaimResponse = await request(server)
      .get(`/api/v2/vote-events/${voteEventId}`)
      .set('Authorization', `Bearer ${earlyWinner.accessToken}`)
      .expect(200);
    const winnerDetailBeforeClaim =
      winnerDetailBeforeClaimResponse.body as VoteEventDetailEnvelope;

    expect(winnerDetailBeforeClaim.data).toMatchObject({
      bettingInfo: {
        earnedTokenAmount: 2,
        myTokenAmount: 1,
        payoutRate: 50,
        resultConfirmed: true,
        rewardClaimed: false,
      },
      bettingResultOption: 'A',
      isParticipated: true,
      optionAResultAmount: 2,
      optionARatio: 66.67,
      optionBResultAmount: 1,
      optionBRatio: 33.33,
      remainingTime: null,
    });
    expect(winnerDetailBeforeClaim.data.bettingResultConfirmedAt).toEqual(
      expect.any(String),
    );

    await request(server)
      .post(`/api/v2/vote-events/${voteEventId}/betting-reward/claim`)
      .set('Authorization', `Bearer ${earlyWinner.accessToken}`)
      .expect(200)
      .expect((response: { body: unknown }) => {
        expect(response.body).toEqual({
          data: { earnedTokenAmount: 2, rewardClaimed: true },
        });
      });
    await expectUserVoteToken(earlyWinner.userId, 1001);

    await request(server)
      .post(`/api/v2/vote-events/${voteEventId}/betting-reward/claim`)
      .set('Authorization', `Bearer ${earlyWinner.accessToken}`)
      .expect(200)
      .expect((response: { body: unknown }) => {
        expect(response.body).toEqual({
          data: { earnedTokenAmount: 2, rewardClaimed: true },
        });
      });
    await expectUserVoteToken(earlyWinner.userId, 1001);

    const winnerDetailAfterClaimResponse = await request(server)
      .get(`/api/v2/vote-events/${voteEventId}`)
      .set('Authorization', `Bearer ${earlyWinner.accessToken}`)
      .expect(200);
    const winnerDetailAfterClaim =
      winnerDetailAfterClaimResponse.body as VoteEventDetailEnvelope;

    expect(winnerDetailAfterClaim.data.bettingInfo).toMatchObject({
      earnedTokenAmount: 2,
      rewardClaimed: true,
    });

    await request(server)
      .post(`/api/v2/vote-events/${voteEventId}/betting-reward/claim`)
      .set('Authorization', `Bearer ${lateWinner.accessToken}`)
      .expect(200)
      .expect((response: { body: unknown }) => {
        expect(response.body).toEqual({
          data: { earnedTokenAmount: 1, rewardClaimed: true },
        });
      });
    await expectUserVoteToken(lateWinner.userId, 1000);

    await request(server)
      .post(`/api/v2/vote-events/${voteEventId}/betting-reward/claim`)
      .set('Authorization', `Bearer ${loser.accessToken}`)
      .expect(200)
      .expect((response: { body: unknown }) => {
        expect(response.body).toEqual({
          data: { earnedTokenAmount: null, rewardClaimed: true },
        });
      });
    await expectUserVoteToken(loser.userId, 999);

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
    await request(server)
      .post(`/api/v2/vote-events/${voteEventId}/betting-reward/claim`)
      .set('Authorization', `Bearer ${loser.accessToken}`)
      .expect(200)
      .expect((response: { body: unknown }) => {
        expect(response.body).toEqual({
          data: { earnedTokenAmount: null, rewardClaimed: true },
        });
      });
    await expectUserVoteToken(loser.userId, 995);
    const rows = await orm.em.getConnection().execute<BettingResultRow[]>(
      'select `betting_result_option`, `betting_result_confirmed_at` from `vote_events` where `id` = ?',
      [voteEventId],
    );

    expect(rows[0]).toMatchObject({ betting_result_option: 'A' });
    expect(rows[0]!.betting_result_confirmed_at).not.toBeNull();
  });

  it('보상 수령이 불가능한 상태는 계약된 오류 코드를 반환한다', async () => {
    await deleteListTestVoteEvents();

    const prefix = `vote-api-result-${Date.now()}`;
    const organizer = await createUser(`${prefix}-claim-organizer`);
    const participant = await createUser(`${prefix}-claim-participant`);
    const outsider = await createUser(`${prefix}-claim-outsider`);
    const bettingId = await insertVoteEvent({
      category: 'betting',
      deadlineAt: minutesFrom(new Date(), 10),
      organizerUserId: organizer.userId,
      title: `${prefix}-claim-errors`,
      totalParticipantCount: 0,
    });

    await castBettingVote(server, participant.accessToken, bettingId, 'A', 5);

    await request(server)
      .post(`/api/v2/vote-events/${bettingId}/betting-reward/claim`)
      .set('Authorization', 'Bearer invalid-access-token')
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });

    await request(server)
      .post(`/api/v2/vote-events/${bettingId}/betting-reward/claim`)
      .set('Authorization', `Bearer ${participant.accessToken}`)
      .expect(409)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'betting_result_not_confirmed',
        );
      });

    const dailyId = await insertVoteEvent({
      category: 'daily',
      deadlineAt: minutesFrom(new Date(), 10),
      title: `${prefix}-daily-claim`,
      totalParticipantCount: 1,
    });
    await insertParticipation(dailyId, participant.userId, 'A');

    await request(server)
      .post(`/api/v2/vote-events/${dailyId}/betting-reward/claim`)
      .set('Authorization', `Bearer ${participant.accessToken}`)
      .expect(422)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'betting_reward_not_allowed',
        );
      });

    await request(server)
      .post(`/api/v2/vote-events/${bettingId}/betting-result`)
      .set('Authorization', `Bearer ${organizer.accessToken}`)
      .send({ winningOption: 'A' })
      .expect(200);

    await request(server)
      .post(`/api/v2/vote-events/${bettingId}/betting-reward/claim`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(403)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'betting_reward_forbidden',
        );
      });

    await request(server)
      .post(`/api/v2/vote-events/${randomUUID()}/betting-reward/claim`)
      .set('Authorization', `Bearer ${participant.accessToken}`)
      .expect(404)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'vote_event_not_found',
        );
      });
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
