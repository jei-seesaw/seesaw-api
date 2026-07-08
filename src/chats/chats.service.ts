import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { VoteEventNotFoundException } from '../vote-events/vote-events.exceptions';
import { VoteEventsRepository } from '../vote-events/vote-events.repository';
import {
  ChatMessageRecord,
  ChatMessagesRepository,
} from './chat-messages.repository';
import {
  InvalidChatCursorException,
  InvalidChatMessageException,
} from './chats.exceptions';
import type {
  ChatMessageDto,
  ListChatMessagesQueryDto,
  ListChatMessagesResponseDto,
} from './dto/list-chat-messages.dto';

const CHAT_MESSAGE_MAX_LENGTH = 500;
const CHAT_CURSOR_VERSION = 1;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SendChatMessageCommand {
  clientMessageId: string;
  content: string;
  voteEventId: string;
}

export interface SendChatMessageResult {
  created: boolean;
  message: ChatMessageDto;
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly chatMessages: ChatMessagesRepository,
    private readonly voteEvents: VoteEventsRepository,
  ) {}

  async listMessages(
    voteEventId: string,
    query: ListChatMessagesQueryDto,
  ): Promise<ListChatMessagesResponseDto> {
    await this.assertVoteEventExists(voteEventId);

    const options = {
      limit: query.limit,
      voteEventId,
    };

    const page = await this.chatMessages.list(
      query.cursor ? { ...options, cursor: decodeCursor(query.cursor) } : options,
    );
    const firstMessage = page.items[0];

    return {
      messages: page.items.map(toChatMessageDto),
      pageInfo: {
        hasNext: page.hasNext,
        nextCursor:
          page.hasNext && firstMessage ? encodeCursor(firstMessage) : null,
      },
    };
  }

  async sendMessage(
    command: SendChatMessageCommand,
    user: AuthenticatedUser,
  ): Promise<SendChatMessageResult> {
    const content = command.content.trim();

    assertValidMessage(command, content);
    await this.assertVoteEventExists(command.voteEventId);

    const duplicate = await this.chatMessages.findByUserClientMessageId(
      user.id,
      command.clientMessageId,
    );

    if (duplicate) {
      return { created: false, message: toChatMessageDto(duplicate) };
    }

    const message = await this.chatMessages.create({
      clientMessageId: command.clientMessageId,
      content,
      createdAt: new Date(),
      userId: user.id,
      voteEventId: command.voteEventId,
    });

    return { created: true, message: toChatMessageDto(message) };
  }

  private async assertVoteEventExists(voteEventId: string): Promise<void> {
    const voteEvent = await this.voteEvents.findDetail({
      id: voteEventId,
      now: new Date(),
    });

    if (!voteEvent) {
      throw new VoteEventNotFoundException();
    }
  }
}

function assertValidMessage(
  command: SendChatMessageCommand,
  content: string,
): void {
  if (
    !UUID_PATTERN.test(command.voteEventId) ||
    !UUID_PATTERN.test(command.clientMessageId) ||
    content.length < 1 ||
    content.length > CHAT_MESSAGE_MAX_LENGTH
  ) {
    throw new InvalidChatMessageException();
  }
}

function toChatMessageDto(message: ChatMessageRecord): ChatMessageDto {
  return {
    clientMessageId: message.clientMessageId,
    content: message.content,
    createdAt: message.createdAt,
    id: message.id,
    user: {
      affiliationName: message.userAffiliationName,
      id: message.userId,
      nickname: message.userNickname,
    },
    voteEventId: message.voteEventId,
  };
}

function encodeCursor(message: ChatMessageRecord): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: message.cursorCreatedAt,
      id: message.id,
      version: CHAT_CURSOR_VERSION,
    }),
  ).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: string; id: string } {
  try {
    const value = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as unknown;

    if (!isCursorPayload(value)) {
      throw new InvalidChatCursorException();
    }

    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value.createdAt)) {
      throw new InvalidChatCursorException();
    }

    return { createdAt: value.createdAt, id: value.id };
  } catch (error) {
    if (error instanceof InvalidChatCursorException) {
      throw error;
    }

    throw new InvalidChatCursorException();
  }
}

function isCursorPayload(
  value: unknown,
): value is { createdAt: string; id: string; version: 1 } {
  return (
    isRecord(value) &&
    value.version === CHAT_CURSOR_VERSION &&
    typeof value.createdAt === 'string' &&
    typeof value.id === 'string' &&
    UUID_PATTERN.test(value.id)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
