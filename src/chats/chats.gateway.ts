import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService, type AuthenticatedUser } from '../auth/auth.service';
import { ChatsService, type SendChatMessageCommand } from './chats.service';

type SocketAck<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

interface AuthenticatedSocket extends Socket {
  data: {
    user: AuthenticatedUser;
  };
}

@WebSocketGateway({ namespace: '/api/v2/chats' })
export class ChatsGateway implements OnGatewayInit {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly chats: ChatsService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticate(socket, next);
    });
  }

  private async authenticate(
    socket: Socket,
    next: (error?: Error) => void,
  ): Promise<void> {
    const accessToken = getAccessToken(socket.handshake.auth);

    if (!accessToken) {
      next(new Error('invalid_access_token'));
      return;
    }

    try {
      const authenticatedSocket = socket as AuthenticatedSocket;

      authenticatedSocket.data.user =
        await this.auth.verifyAccessToken(accessToken);
      next();
    } catch {
      next(new Error('invalid_access_token'));
    }
  }

  @SubscribeMessage('chat:join')
  handleJoin(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { voteEventId?: unknown },
  ): SocketAck<null> {
    if (typeof body.voteEventId !== 'string') {
      return errorAck('validation_error', 'Request validation failed');
    }

    void socket.join(roomName(body.voteEventId));

    return { data: null, ok: true };
  }

  @SubscribeMessage('chat:message:send')
  async handleSend(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: Partial<SendChatMessageCommand>,
  ): Promise<SocketAck<unknown>> {
    if (
      typeof body.voteEventId !== 'string' ||
      typeof body.clientMessageId !== 'string' ||
      typeof body.content !== 'string'
    ) {
      return errorAck('validation_error', 'Request validation failed');
    }

    try {
      const result = await this.chats.sendMessage(
        {
          clientMessageId: body.clientMessageId,
          content: body.content,
          voteEventId: body.voteEventId,
        },
        socket.data.user,
      );

      if (result.created) {
        this.server
          .to(roomName(body.voteEventId))
          .emit('chat:message:new', result.message);
      }

      return { data: result.message, ok: true };
    } catch (error) {
      return exceptionAck(error);
    }
  }
}

function roomName(voteEventId: string): string {
  return `vote-event:${voteEventId}`;
}

function getAccessToken(auth: unknown): string | null {
  if (!isRecord(auth) || typeof auth.accessToken !== 'string') {
    return null;
  }

  const token = auth.accessToken.trim();

  return token === '' ? null : token;
}

function exceptionAck(error: unknown): SocketAck<never> {
  if (isHttpExceptionLike(error)) {
    const response = error.getResponse();

    if (
      isRecord(response) &&
      typeof response.code === 'string' &&
      typeof response.message === 'string'
    ) {
      return errorAck(response.code, response.message);
    }
  }

  return errorAck('internal_server_error', 'Internal server error');
}

function errorAck(code: string, message: string): SocketAck<never> {
  return {
    error: { code, message },
    ok: false,
  };
}

function isHttpExceptionLike(value: unknown): value is {
  getResponse: () => unknown;
} {
  return isRecord(value) && typeof value.getResponse === 'function';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
