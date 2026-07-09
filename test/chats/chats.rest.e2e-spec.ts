import type { Server } from 'node:http';
import request from 'supertest';
import {
  createChatsE2eContext,
  type ChatsE2eContext,
} from './chats.e2e.fixture';

describe('Chat messages REST endpoint', () => {
  let context: ChatsE2eContext;
  let server: Server;
  let createUser: ChatsE2eContext['createUser'];
  let insertChatMessage: ChatsE2eContext['insertChatMessage'];
  let insertVoteEvent: ChatsE2eContext['insertVoteEvent'];

  beforeAll(async () => {
    context = await createChatsE2eContext();
    ({
      createUser,
      insertChatMessage,
      insertVoteEvent,
      server,
    } = context);
  });

  afterAll(async () => {
    if (context) {
      await context.deleteChatTestData();
      await context.close();
    }
  });

  it('로그인 사용자가 최근 채팅 기록을 오래된 순서로 조회한다', async () => {
    const now = Date.now();
    const { accessToken, userId } = await createUser(`chat-rest-${now}`);
    const otherUser = await createUser(`chat-rest-other-${now}`);
    const voteEventId = await insertVoteEvent(`chat-e2e-rest-${now}`);

    await insertChatMessage({
      content: '첫 번째',
      createdAt: new Date('2026-07-08T12:00:00.000Z'),
      userId: otherUser.userId,
      voteEventId,
    });
    const secondId = await insertChatMessage({
      content: '두 번째',
      createdAt: new Date('2026-07-08T12:01:00.000Z'),
      userId: otherUser.userId,
      voteEventId,
    });
    const thirdId = await insertChatMessage({
      content: '세 번째',
      createdAt: new Date('2026-07-08T12:02:00.000Z'),
      userId,
      voteEventId,
    });

    const firstPage = await request(server)
      .get(`/api/v2/vote-events/${voteEventId}/chat-messages`)
      .query({ limit: 2 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = firstPage.body as ChatMessagesEnvelope;

    expect(body.data.messages.map((message) => message.id)).toEqual([
      secondId,
      thirdId,
    ]);
    expect(body.data.messages[0]).toMatchObject({
      content: '두 번째',
      isMine: false,
      user: {
        affiliationName: '재능교육',
        id: otherUser.userId,
        nickname: `chat-rest-other-${now}`,
      },
      voteEventId,
    });
    expect(body.data.messages[1]).toMatchObject({
      content: '세 번째',
      isMine: true,
      user: {
        id: userId,
      },
    });
    expect(body.data.pageInfo.hasNext).toBe(true);
    expect(typeof body.data.pageInfo.nextCursor).toBe('string');
    expect(body.data.totalCount).toBe(3);
    const nextCursor = body.data.pageInfo.nextCursor;

    if (!nextCursor) {
      throw new Error('nextCursor is required');
    }

    await request(server)
      .get(`/api/v2/vote-events/${voteEventId}/chat-messages`)
      .query({ cursor: nextCursor, limit: 2 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response: { body: unknown }) => {
        const nextBody = response.body as ChatMessagesEnvelope;

        expect(nextBody.data.messages.map((message) => message.content)).toEqual([
          '첫 번째',
        ]);
        expect(nextBody.data.pageInfo).toEqual({
          hasNext: false,
          nextCursor: null,
        });
        expect(nextBody.data.totalCount).toBe(3);
      });
  });

  it('accessToken이 없으면 채팅 기록 조회를 거절한다', async () => {
    const voteEventId = await insertVoteEvent(`chat-e2e-unauth-${Date.now()}`);

    await request(server)
      .get(`/api/v2/vote-events/${voteEventId}/chat-messages`)
      .expect(401)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_access_token',
        );
      });
  });

  it('유효하지 않은 cursor는 거절한다', async () => {
    const { accessToken } = await createUser(`chat-cursor-${Date.now()}`);
    const voteEventId = await insertVoteEvent(`chat-e2e-cursor-${Date.now()}`);

    await request(server)
      .get(`/api/v2/vote-events/${voteEventId}/chat-messages`)
      .query({ cursor: 'not-a-cursor' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'invalid_cursor',
        );
      });
  });

  it('없는 투표 이벤트의 채팅 기록 조회는 404를 반환한다', async () => {
    const { accessToken } = await createUser(`chat-missing-${Date.now()}`);

    await request(server)
      .get('/api/v2/vote-events/00000000-0000-4000-8000-000000000000/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404)
      .expect((response: { body: unknown }) => {
        expect((response.body as ErrorEnvelope).error.code).toBe(
          'vote_event_not_found',
        );
      });
  });
});

interface ChatMessagesEnvelope {
  data: {
    messages: Array<{
      clientMessageId: string;
      content: string;
      createdAt: string;
      id: string;
      isMine: boolean;
      user: {
        affiliationName: string;
        id: string;
        nickname: string;
      };
      voteEventId: string;
    }>;
    pageInfo: {
      hasNext: boolean;
      nextCursor: string | null;
    };
    totalCount: number;
  };
}

interface ErrorEnvelope {
  error: {
    code: string;
  };
}
