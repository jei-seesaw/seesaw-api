import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../src/auth/auth.service';
import type {
  ChatMessagePage,
  ChatMessageRecord,
  ChatMessagesRepository,
  CreateChatMessageOptions,
} from '../../src/chats/chat-messages.repository';
import { ChatsService } from '../../src/chats/chats.service';
import { VoteEventNotFoundException } from '../../src/vote-events/vote-events.exceptions';
import type { VoteEventsRepository } from '../../src/vote-events/vote-events.repository';

const USER: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  nickname: 'hyoseok',
};
const VOTE_EVENT_ID = '22222222-2222-4222-8222-222222222222';
const CLIENT_MESSAGE_ID = '33333333-3333-4333-8333-333333333333';

describe('ChatsService', () => {
  it('메시지를 저장하면 trim된 내용과 사용자 정보를 응답한다', async () => {
    const { chatMessages, service } = createServiceContext();

    const result = await service.sendMessage(
      {
        clientMessageId: CLIENT_MESSAGE_ID,
        content: '  저는 A가 더 좋아요  ',
        voteEventId: VOTE_EVENT_ID,
      },
      USER,
    );

    expect(result.created).toBe(true);
    expect(result.message).toMatchObject({
      clientMessageId: CLIENT_MESSAGE_ID,
      content: '저는 A가 더 좋아요',
      user: {
        ...USER,
        affiliationName: '재능교육',
      },
      voteEventId: VOTE_EVENT_ID,
    });
    expect(chatMessages.created).toMatchObject({
      clientMessageId: CLIENT_MESSAGE_ID,
      content: '저는 A가 더 좋아요',
      userId: USER.id,
      voteEventId: VOTE_EVENT_ID,
    });
  });

  it('빈 문자열 메시지는 저장하지 않는다', async () => {
    const { service } = createServiceContext();

    await expect(
      service.sendMessage(
        {
          clientMessageId: CLIENT_MESSAGE_ID,
          content: '   ',
          voteEventId: VOTE_EVENT_ID,
        },
        USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('500자를 초과한 메시지는 저장하지 않는다', async () => {
    const { service } = createServiceContext();

    await expect(
      service.sendMessage(
        {
          clientMessageId: CLIENT_MESSAGE_ID,
          content: '가'.repeat(501),
          voteEventId: VOTE_EVENT_ID,
        },
        USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('없는 투표 이벤트에는 메시지를 저장하지 않는다', async () => {
    const { service, voteEvents } = createServiceContext();
    voteEvents.exists = false;

    await expect(
      service.sendMessage(
        {
          clientMessageId: CLIENT_MESSAGE_ID,
          content: '메시지',
          voteEventId: VOTE_EVENT_ID,
        },
        USER,
      ),
    ).rejects.toThrow(VoteEventNotFoundException);
  });

  it('같은 clientMessageId 재전송은 기존 메시지를 반환한다', async () => {
    const { chatMessages, service } = createServiceContext();
    chatMessages.duplicate = chatMessageRecord({
      content: '이미 저장된 메시지',
      id: '44444444-4444-4444-8444-444444444444',
    });

    const result = await service.sendMessage(
      {
        clientMessageId: CLIENT_MESSAGE_ID,
        content: '다시 보낸 메시지',
        voteEventId: VOTE_EVENT_ID,
      },
      USER,
    );

    expect(result.created).toBe(false);
    expect(result.message.content).toBe('이미 저장된 메시지');
    expect(chatMessages.created).toBeUndefined();
  });

  it('유효하지 않은 cursor는 거절한다', async () => {
    const { service } = createServiceContext();

    await expect(
      service.listMessages(
        VOTE_EVENT_ID,
        { cursor: 'not-a-cursor', limit: 50 },
        USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('채팅 기록 조회 시 현재 사용자가 보낸 메시지를 표시한다', async () => {
    const { chatMessages, service } = createServiceContext();

    chatMessages.page = {
      hasNext: false,
      items: [
        chatMessageRecord({ userId: USER.id }),
        chatMessageRecord({
          id: '66666666-6666-4666-8666-666666666666',
          userId: '77777777-7777-4777-8777-777777777777',
        }),
      ],
    };

    const result = await service.listMessages(
      VOTE_EVENT_ID,
      { limit: 50 },
      USER,
    );

    expect(result.messages.map((message) => message.isMine)).toEqual([
      true,
      false,
    ]);
  });
});

function createServiceContext(): {
  chatMessages: FakeChatMessagesRepository;
  service: ChatsService;
  voteEvents: FakeVoteEventsRepository;
} {
  const chatMessages = new FakeChatMessagesRepository();
  const voteEvents = new FakeVoteEventsRepository();

  return {
    chatMessages,
    service: new ChatsService(
      chatMessages,
      voteEvents as unknown as VoteEventsRepository,
    ),
    voteEvents,
  };
}

class FakeChatMessagesRepository implements ChatMessagesRepository {
  created?: CreateChatMessageOptions;
  duplicate: ChatMessageRecord | null = null;
  page: ChatMessagePage = {
    hasNext: false,
    items: [],
  };

  create(options: CreateChatMessageOptions): Promise<ChatMessageRecord> {
    this.created = options;

    return Promise.resolve(
      chatMessageRecord({
        clientMessageId: options.clientMessageId,
        content: options.content,
        userAffiliationName: '재능교육',
        userId: options.userId,
        userNickname: USER.nickname,
        voteEventId: options.voteEventId,
      }),
    );
  }

  findByUserClientMessageId(): Promise<ChatMessageRecord | null> {
    return Promise.resolve(this.duplicate);
  }

  list(): Promise<ChatMessagePage> {
    return Promise.resolve(this.page);
  }
}

class FakeVoteEventsRepository {
  exists = true;

  findDetail(): Promise<Record<string, never> | null> {
    return Promise.resolve(this.exists ? {} : null);
  }
}

function chatMessageRecord(
  overrides: Partial<ChatMessageRecord> = {},
): ChatMessageRecord {
  return {
    clientMessageId: CLIENT_MESSAGE_ID,
    content: '저는 A가 더 좋아요',
    createdAt: '2026-07-08T12:00:00.000Z',
    cursorCreatedAt: '2026-07-08 12:00:00',
    id: '55555555-5555-4555-8555-555555555555',
    userAffiliationName: '재능교육',
    userId: USER.id,
    userNickname: USER.nickname,
    voteEventId: VOTE_EVENT_ID,
    ...overrides,
  };
}
