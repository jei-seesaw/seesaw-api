import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { EnvConfig } from '../config/env';
import { verifyPassword } from '../users/password';
import type { User } from '../users/user.entity';
import { UsersRepository } from '../users/users.repository';
import type { AccessTokenResponseDto, LoginRequestDto } from './dto/login.dto';
import {
  InvalidAccessTokenException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from './auth.exceptions';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

type TokenType = 'access' | 'refresh';

interface AuthTokenPayload {
  sub: string;
  nickname: string;
  type: TokenType;
}

export interface AuthenticatedUser {
  id: string;
  nickname: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  async login(dto: LoginRequestDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.users.findByNickname(dto.nickname);

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new InvalidCredentialsException();
    }

    return this.issueTokens(user);
  }

  async refresh(
    refreshToken: string | null | undefined,
  ): Promise<AccessTokenResponseDto> {
    if (!refreshToken) {
      throw new InvalidRefreshTokenException();
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new InvalidRefreshTokenException();
    }

    return { accessToken: await this.signToken(user, 'access') };
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    const payload = await this.verifyToken(
      token,
      this.config.getOrThrow('JWT_ACCESS_SECRET'),
      new InvalidAccessTokenException(),
    );

    if (payload.type !== 'access') {
      throw new InvalidAccessTokenException();
    }

    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new InvalidAccessTokenException();
    }

    return { id: user.id, nickname: user.nickname };
  }

  private async verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
    const payload = await this.verifyToken(
      token,
      this.config.getOrThrow('JWT_REFRESH_SECRET'),
      new InvalidRefreshTokenException(),
    );

    if (payload.type !== 'refresh') {
      throw new InvalidRefreshTokenException();
    }

    return payload;
  }

  private async issueTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(user, 'access'),
      this.signToken(user, 'refresh'),
    ]);

    return { accessToken, refreshToken };
  }

  private signToken(user: User, type: TokenType): Promise<string> {
    return this.jwt.signAsync(
      { nickname: user.nickname, sub: user.id, type },
      {
        expiresIn:
          type === 'access'
            ? ACCESS_TOKEN_TTL_SECONDS
            : REFRESH_TOKEN_TTL_SECONDS,
        secret: this.config.getOrThrow(
          type === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET',
        ),
      },
    );
  }

  private async verifyToken(
    token: string,
    secret: string,
    exception: InvalidAccessTokenException | InvalidRefreshTokenException,
  ): Promise<AuthTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        token,
        { secret },
      );

      if (isAuthTokenPayload(payload)) {
        return payload;
      }
    } catch {
      throw exception;
    }

    throw exception;
  }
}

function isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
  return (
    isRecord(value) &&
    typeof value.sub === 'string' &&
    typeof value.nickname === 'string' &&
    (value.type === 'access' || value.type === 'refresh')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
