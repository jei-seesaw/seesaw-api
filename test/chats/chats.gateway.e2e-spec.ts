import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import {
  createChatsE2eContext,
  type ChatsE2eContext,
} from './chats.e2e.fixture';

describe('Chats gateway', () => {
  let context: ChatsE2eContext;
  let baseUrl: string;
  let createUser: ChatsE2eContext['createUser'];
  let insertVoteEvent: ChatsE2eContext['insertVoteEvent'];

  beforeAll(async () => {
    context = await createChatsE2eContext({ listen: true });
    ({ baseUrl, createUser, insertVoteEvent } = context);
  });

  afterAll(async () => {
    if (context) {
      await context.deleteChatTestData();
      await context.close();
    }
  });

  it('valid token으로 연결한 사용자가 room join 후 메시지를 전송한다', async () => {
    const now = Date.now();
    const senderUser = await createUser(`chat-sender-${now}`);
    const receiverUser = await createUser(`chat-receiver-${now}`);
    const voteEventId = await insertVoteEvent(`chat-e2e-socket-${now}`);
    const sender = await connectChatSocket(baseUrl, senderUser.accessToken);
    const receiver = await connectChatSocket(baseUrl, receiverUser.accessToken);

    try {
      await expectAck(emitAck<null>(sender, 'chat:join', { voteEventId }));
      await expectAck(emitAck<null>(receiver, 'chat:join', { voteEventId }));

      const newMessage = onceNewMessage(receiver);
      const clientMessageId = randomUUID();
      const sendAck = await expectAck<ChatMessage>(
        emitAck(sender, 'chat:message:send', {
          clientMessageId,
          content: '  저는 A가 더 좋아요  ',
          voteEventId,
        }),
      );
      const broadcastMessage = await newMessage;

      expect(sendAck.data).toMatchObject({
        clientMessageId,
        content: '저는 A가 더 좋아요',
        user: {
          affiliationName: '재능교육',
          id: senderUser.userId,
          nickname: `chat-sender-${now}`,
        },
        voteEventId,
      });
      expect(broadcastMessage.id).toBe(sendAck.data.id);

      const duplicateEvent = onceNewMessage(receiver);
      const duplicateAck = await expectAck<ChatMessage>(
        emitAck(sender, 'chat:message:send', {
          clientMessageId,
          content: '다시 보낸 메시지',
          voteEventId,
        }),
      );

      expect(duplicateAck.data.id).toBe(sendAck.data.id);
      await expect(
        Promise.race([duplicateEvent.then(() => 'broadcast'), delay(100)]),
      ).resolves.toBe('timeout');
    } finally {
      sender.disconnect();
      receiver.disconnect();
    }
  });

  it('invalid token 연결을 거절한다', async () => {
    await expect(connectChatSocket(baseUrl, 'invalid-token')).rejects.toThrow(
      'invalid_access_token',
    );
  });
});

interface SocketAck<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface ChatMessage {
  clientMessageId: string;
  content: string;
  createdAt: string;
  id: string;
  user: {
    affiliationName: string;
    id: string;
    nickname: string;
  };
  voteEventId: string;
}

async function connectChatSocket(
  baseUrl: string,
  accessToken: string,
): Promise<Socket> {
  const socket = io(`${baseUrl}/api/v2/chats`, {
    auth: { accessToken },
    forceNew: true,
    path: '/api/v2/socket.io',
    reconnection: false,
    transports: ['websocket'],
  });

  return new Promise((resolve, reject) => {
    socket.once('connect', () => {
      resolve(socket);
    });
    socket.once('connect_error', (error) => {
      socket.disconnect();
      reject(error);
    });
  });
}

async function expectAck<T>(
  ackPromise: Promise<SocketAck<T>>,
): Promise<{ data: T; ok: true }> {
  const ack = await ackPromise;

  if (!ack.ok) {
    throw new Error(JSON.stringify(ack.error));
  }

  return ack as { data: T; ok: true };
}

function onceNewMessage(socket: Socket): Promise<ChatMessage> {
  return new Promise((resolve) => {
    socket.once('chat:message:new', (message: ChatMessage) => {
      resolve(message);
    });
  });
}

function emitAck<T>(
  socket: Socket,
  event: string,
  payload: Record<string, unknown>,
): Promise<SocketAck<T>> {
  return socket.timeout(1000).emitWithAck(event, payload);
}

function delay(ms: number): Promise<'timeout'> {
  return new Promise((resolve) => {
    setTimeout(() => resolve('timeout'), ms);
  });
}
