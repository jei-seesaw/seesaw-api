import { MikroORM } from '@mikro-orm/mariadb';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_PREFIX } from '../../src/config/api-prefix';
import type {
  LoginEnvelope,
  ParticipationRow,
  UserVoteTokenRow,
  VoteEventAggregate,
  VoteEventAggregateRow,
} from './vote-events.e2e.types';

type VoteEventsOrm = ReturnType<typeof getOrm>;

export interface VoteEventsE2eContext {
  app: INestApplication;
  server: Server;
  orm: VoteEventsOrm;
  close: () => Promise<void>;
  issueAccessToken: (nickname: string) => Promise<string>;
  createUser: (
    nickname: string,
    affiliationCode?: string,
  ) => Promise<{ accessToken: string; userId: string }>;
  insertVoteEvent: (args: InsertVoteEventArgs) => Promise<string>;
  insertParticipation: (
    voteEventId: string,
    userId: string,
    selectedOption?: 'A' | 'B',
    tokenAmount?: number,
  ) => Promise<void>;
  deleteListTestVoteEvents: () => Promise<void>;
  expectVoteEventAggregate: (
    voteEventId: string,
    expected: VoteEventAggregate,
  ) => Promise<void>;
  expectParticipation: (
    voteEventId: string,
    userId: string,
    selectedOption: 'A' | 'B',
    tokenAmount: number,
  ) => Promise<void>;
  expectNoParticipation: (voteEventId: string, userId: string) => Promise<void>;
  expectUserVoteToken: (userId: string, voteToken: number) => Promise<void>;
}

interface InsertVoteEventArgs {
  category: 'betting' | 'daily' | 'balance' | 'work';
  createdAt?: Date;
  deadlineAt: Date;
  optionAImageUrl?: string | null;
  optionAParticipantCount?: number;
  optionATokenAmount?: number;
  optionBImageUrl?: string | null;
  optionBParticipantCount?: number;
  optionBTokenAmount?: number;
  organizerUserId?: string | null;
  title: string;
  totalParticipantCount: number;
  totalTokenAmount?: number;
}

export async function createVoteEventsE2eContext(): Promise<VoteEventsE2eContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(API_PREFIX);
  await app.init();

  const server = app.getHttpServer() as Server;
  const orm = getOrm(app);

  async function issueAccessToken(nickname: string): Promise<string> {
    return (await createUser(nickname)).accessToken;
  }

  async function createUser(
    nickname: string,
    affiliationCode = 'teacher',
  ): Promise<{ accessToken: string; userId: string }> {
    await request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode,
        nickname,
        password: 'password123',
      })
      .expect(201);

    const response = await request(server)
      .post('/api/v2/auth/login')
      .send({ nickname, password: 'password123' })
      .expect(200);
    const rows = await orm.em.getConnection().execute<Array<{ id: string }>>(
      'select `id` from `users` where `nickname` = ?',
      [nickname],
    );

    return {
      accessToken: (response.body as LoginEnvelope).data.accessToken,
      userId: rows[0]!.id,
    };
  }

  async function insertVoteEvent(args: InsertVoteEventArgs): Promise<string> {
    const id = randomUUID();
    const createdAt = args.createdAt ?? new Date();

    await orm.em.getConnection().execute(
      'insert into `vote_events` (`id`, `category`, `title`, `option_a`, `option_b`, `option_a_image_url`, `option_b_image_url`, `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `option_a_participant_count`, `option_b_participant_count`, `organizer_user_id`, `deadline_at`, `created_at`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        args.category,
        args.title,
        'A',
        'B',
        args.optionAImageUrl ?? null,
        args.optionBImageUrl ?? null,
        args.totalParticipantCount,
        args.totalTokenAmount ?? 0,
        args.optionATokenAmount ?? 0,
        args.optionBTokenAmount ?? 0,
        args.optionAParticipantCount ?? 0,
        args.optionBParticipantCount ?? 0,
        args.organizerUserId ?? null,
        args.deadlineAt,
        createdAt,
      ],
    );

    return id;
  }

  async function insertParticipation(
    voteEventId: string,
    userId: string,
    selectedOption?: 'A' | 'B',
    tokenAmount = 0,
  ): Promise<void> {
    await orm.em.getConnection().execute(
      'insert into `vote_event_participations` (`id`, `vote_event_id`, `user_id`, `selected_option`, `token_amount`, `created_at`) values (?, ?, ?, ?, ?, ?)',
      [
        randomUUID(),
        voteEventId,
        userId,
        selectedOption ?? null,
        tokenAmount,
        new Date(),
      ],
    );
  }

  async function deleteListTestVoteEvents(): Promise<void> {
    await orm.em.getConnection().execute(
      'delete vep from `vote_event_participations` vep join `vote_events` ve on ve.`id` = vep.`vote_event_id` where ve.`title` like ? or ve.`title` like ? or ve.`title` like ? or ve.`title` like ? or ve.`title` like ? or ve.`title` like ?',
      [
        'vote-api-%',
        'vote-list-%',
        'vote-me-%',
        'vote-ratio-%',
        'vote-cursor-%',
        'vote-detail-%',
      ],
    );
    await orm.em.getConnection().execute(
      'delete from `vote_events` where `title` like ? or `title` like ? or `title` like ? or `title` like ? or `title` like ? or `title` like ?',
      [
        'vote-api-%',
        'vote-list-%',
        'vote-me-%',
        'vote-ratio-%',
        'vote-cursor-%',
        'vote-detail-%',
      ],
    );
  }

  async function expectVoteEventAggregate(
    voteEventId: string,
    expected: VoteEventAggregate,
  ): Promise<void> {
    const rows = await orm.em.getConnection().execute<VoteEventAggregateRow[]>(
      'select `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `option_a_participant_count`, `option_b_participant_count` from `vote_events` where `id` = ?',
      [voteEventId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      option_a_participant_count: expected.optionAParticipantCount,
      option_a_token_amount: expected.optionATokenAmount,
      option_b_participant_count: expected.optionBParticipantCount,
      option_b_token_amount: expected.optionBTokenAmount,
      total_participant_count: expected.totalParticipantCount,
      total_token_amount: expected.totalTokenAmount,
    });
  }

  async function expectParticipation(
    voteEventId: string,
    userId: string,
    selectedOption: 'A' | 'B',
    tokenAmount: number,
  ): Promise<void> {
    const rows = await orm.em.getConnection().execute<ParticipationRow[]>(
      'select `selected_option`, `token_amount` from `vote_event_participations` where `vote_event_id` = ? and `user_id` = ?',
      [voteEventId, userId],
    );

    expect(rows).toEqual([
      {
        selected_option: selectedOption,
        token_amount: tokenAmount,
      },
    ]);
  }

  async function expectNoParticipation(
    voteEventId: string,
    userId: string,
  ): Promise<void> {
    const rows = await orm.em.getConnection().execute<ParticipationRow[]>(
      'select `selected_option`, `token_amount` from `vote_event_participations` where `vote_event_id` = ? and `user_id` = ?',
      [voteEventId, userId],
    );

    expect(rows).toHaveLength(0);
  }

  async function expectUserVoteToken(
    userId: string,
    voteToken: number,
  ): Promise<void> {
    const rows = await orm.em.getConnection().execute<UserVoteTokenRow[]>(
      'select `vote_token` from `users` where `id` = ?',
      [userId],
    );

    expect(rows).toEqual([{ vote_token: voteToken }]);
  }

  return {
    app,
    close: () => app.close(),
    createUser,
    deleteListTestVoteEvents,
    expectNoParticipation,
    expectParticipation,
    expectUserVoteToken,
    expectVoteEventAggregate,
    insertParticipation,
    insertVoteEvent,
    issueAccessToken,
    orm,
    server,
  };
}

export function minutesFrom(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function secondsFrom(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function getOrm(app: INestApplication) {
  return app.get(MikroORM);
}
