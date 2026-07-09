import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';
import { VoteEvent } from '../vote-events/vote-event.entity';
import { ChatMessage } from './chat-message.entity';

export interface ChatMessageRecord {
  clientMessageId: string;
  content: string;
  createdAt: string;
  cursorCreatedAt: string;
  id: string;
  userAffiliationName: string;
  userId: string;
  userNickname: string;
  voteEventId: string;
}

export interface ChatMessageCursor {
  createdAt: string;
  id: string;
}

export interface CreateChatMessageOptions {
  clientMessageId: string;
  content: string;
  createdAt: Date;
  userId: string;
  voteEventId: string;
}

export interface ListChatMessagesOptions {
  cursor?: ChatMessageCursor;
  limit: number;
  voteEventId: string;
}

export interface ChatMessagePage {
  hasNext: boolean;
  items: ChatMessageRecord[];
  totalCount: number;
}

export abstract class ChatMessagesRepository {
  abstract create(options: CreateChatMessageOptions): Promise<ChatMessageRecord>;
  abstract findByUserClientMessageId(
    userId: string,
    clientMessageId: string,
  ): Promise<ChatMessageRecord | null>;
  abstract list(options: ListChatMessagesOptions): Promise<ChatMessagePage>;
}

@Injectable()
export class MikroOrmChatMessagesRepository implements ChatMessagesRepository {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessages: EntityRepository<ChatMessage>,
  ) {}

  async create(options: CreateChatMessageOptions): Promise<ChatMessageRecord> {
    const em = this.chatMessages.getEntityManager().fork();
    const chatMessage = new ChatMessage(
      em.getReference(VoteEvent, options.voteEventId),
      em.getReference(User, options.userId),
      {
        clientMessageId: options.clientMessageId,
        content: options.content,
        createdAt: options.createdAt,
      },
    );

    await em.persist(chatMessage).flush();

    return this.findById(chatMessage.id);
  }

  async findByUserClientMessageId(
    userId: string,
    clientMessageId: string,
  ): Promise<ChatMessageRecord | null> {
    const rows = await this.chatMessages
      .getEntityManager()
      .getConnection()
      .execute<ChatMessageRow[]>(
        `${chatMessageSelect()} where m.\`user_id\` = ? and m.\`client_message_id\` = ? limit 1`,
        [userId, clientMessageId],
      );

    return rows[0] ? toChatMessageRecord(rows[0]) : null;
  }

  async list(options: ListChatMessagesOptions): Promise<ChatMessagePage> {
    const params: Array<number | string> = [options.voteEventId];
    const conditions = ['m.`vote_event_id` = ?'];

    if (options.cursor) {
      conditions.push(
        '(m.`created_at` < ? or (m.`created_at` = ? and m.`id` < ?))',
      );
      params.push(options.cursor.createdAt, options.cursor.createdAt, options.cursor.id);
    }

    params.push(options.limit + 1);

    const connection = this.chatMessages.getEntityManager().getConnection();
    const rows = await connection.execute<ChatMessageRow[]>(
      `${chatMessageSelect()} where ${conditions.join(' and ')} order by m.\`created_at\` desc, m.\`id\` desc limit ?`,
      params,
    );
    const countRows = await connection.execute<ChatMessageCountRow[]>(
      'select count(*) as `totalCount` from `vote_event_chat_messages` where `vote_event_id` = ?',
      [options.voteEventId],
    );
    const items = rows.slice(0, options.limit).map(toChatMessageRecord);

    return {
      hasNext: rows.length > options.limit,
      items: items.reverse(),
      totalCount: Number(countRows[0]?.totalCount ?? 0),
    };
  }

  private async findById(id: string): Promise<ChatMessageRecord> {
    const rows = await this.chatMessages
      .getEntityManager()
      .getConnection()
      .execute<ChatMessageRow[]>(`${chatMessageSelect()} where m.\`id\` = ?`, [
        id,
      ]);

    return toChatMessageRecord(rows[0]!);
  }
}

interface ChatMessageRow {
  clientMessageId: string;
  content: string;
  createdAt: string;
  cursorCreatedAt: string;
  id: string;
  userAffiliationName: string;
  userId: string;
  userNickname: string;
  voteEventId: string;
}

interface ChatMessageCountRow {
  totalCount: number | string;
}

function chatMessageSelect(): string {
  return "select m.`id` as `id`, m.`vote_event_id` as `voteEventId`, m.`client_message_id` as `clientMessageId`, m.`content` as `content`, date_format(m.`created_at`, '%Y-%m-%dT%H:%i:%s.000Z') as `createdAt`, date_format(m.`created_at`, '%Y-%m-%d %H:%i:%s') as `cursorCreatedAt`, u.`id` as `userId`, u.`nickname` as `userNickname`, a.`name` as `userAffiliationName` from `vote_event_chat_messages` m join `users` u on u.`id` = m.`user_id` join `affiliations` a on a.`code` = u.`affiliation_code`";
}

function toChatMessageRecord(row: ChatMessageRow): ChatMessageRecord {
  return {
    clientMessageId: row.clientMessageId,
    content: row.content,
    createdAt: row.createdAt,
    cursorCreatedAt: row.cursorCreatedAt,
    id: row.id,
    userAffiliationName: row.userAffiliationName,
    userId: row.userId,
    userNickname: row.userNickname,
    voteEventId: row.voteEventId,
  };
}
