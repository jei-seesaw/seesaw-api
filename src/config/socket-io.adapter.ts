import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerOptions } from 'socket.io';
import type { EnvConfig } from './env';

export class AppSocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      path: '/api/v2/socket.io',
      cors: {
        credentials: true,
        origin: this.config.getOrThrow<string[]>('CORS_ORIGINS'),
      },
    });
  }
}
