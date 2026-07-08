import type { INestApplication } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/mariadb';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_PREFIX } from '../../src/config/api-prefix';

export interface ChatsE2eContext {
  app: INestApplication;
  baseUrl: string;
  close: () => Promise<void>;
  createUser: (nickname: string) => Promise<{ accessToken: string; userId: string }>;
  deleteChatTestData: () => Promise<void>;
  insertChatMessage: (args: InsertChatMessageArgs) => Promise<string>;
  insertVoteEvent: (title: string) => Promise<string>;
  orm: ChatsOrm;
  server: Server;
}

type ChatsOrm = ReturnType<typeof getOrm>;

interface InsertChatMessageArgs {
  clientMessageId?: string;
  content: string;
  createdAt: Date;
  id?: string;
  userId: string;
  voteEventId: string;
}

interface LoginEnvelope {
  data: {
    accessToken: string;
  };
}

export async function createChatsE2eContext(
  options: { listen: boolean } = { listen: false },
): Promise<ChatsE2eContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix(API_PREFIX);
  if (options.listen) {
    await app.listen(0, '127.0.0.1');
  } else {
    await app.init();
  }

  const server = app.getHttpServer() as Server;
  const address = server.address() as AddressInfo | null;
  const orm = getOrm(app);

  async function createUser(
    nickname: string,
  ): Promise<{ accessToken: string; userId: string }> {
    await request(server)
      .post('/api/v2/register')
      .send({
        affiliationCode: 'education',
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

  async function insertVoteEvent(title: string): Promise<string> {
    const id = randomUUID();

    await orm.em.getConnection().execute(
      'insert into `vote_events` (`id`, `category`, `title`, `option_a`, `option_b`, `option_a_image_url`, `option_b_image_url`, `total_participant_count`, `total_token_amount`, `option_a_token_amount`, `option_b_token_amount`, `option_a_participant_count`, `option_b_participant_count`, `organizer_user_id`, `deadline_at`, `created_at`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        'daily',
        title,
        'A',
        'B',
        null,
        null,
        0,
        0,
        0,
        0,
        0,
        0,
        null,
        new Date(Date.now() + 60 * 60 * 1000),
        new Date(),
      ],
    );

    return id;
  }

  async function insertChatMessage(args: InsertChatMessageArgs): Promise<string> {
    const id = args.id ?? randomUUID();

    await orm.em.getConnection().execute(
      'insert into `vote_event_chat_messages` (`id`, `vote_event_id`, `user_id`, `client_message_id`, `content`, `created_at`) values (?, ?, ?, ?, ?, ?)',
      [
        id,
        args.voteEventId,
        args.userId,
        args.clientMessageId ?? randomUUID(),
        args.content,
        args.createdAt,
      ],
    );

    return id;
  }

  async function deleteChatTestData(): Promise<void> {
    await orm.em.getConnection().execute(
      'delete vcm from `vote_event_chat_messages` vcm join `vote_events` ve on ve.`id` = vcm.`vote_event_id` where ve.`title` like ?',
      ['chat-e2e-%'],
    );
    await orm.em.getConnection().execute(
      'delete from `vote_events` where `title` like ?',
      ['chat-e2e-%'],
    );
  }

  return {
    app,
    baseUrl: address ? `http://127.0.0.1:${address.port}` : '',
    close: () => app.close(),
    createUser,
    deleteChatTestData,
    insertChatMessage,
    insertVoteEvent,
    orm,
    server,
  };
}

function getOrm(app: INestApplication) {
  return app.get(MikroORM);
}
