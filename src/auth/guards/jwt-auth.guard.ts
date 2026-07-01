import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  AuthService,
} from '../auth.service';
import { InvalidAccessTokenException } from '../auth.exceptions';

export interface AuthenticatedRequest {
  headers: {
    authorization?: string | string[];
  };
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = getBearerToken(request.headers.authorization);

    if (!token) {
      throw new InvalidAccessTokenException();
    }

    request.user = await this.auth.verifyAccessToken(token);

    return true;
  }
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.headers.authorization === undefined) {
      return true;
    }

    const token = getBearerToken(request.headers.authorization);

    if (!token) {
      throw new InvalidAccessTokenException();
    }

    request.user = await this.auth.verifyAccessToken(token);

    return true;
  }
}

function getBearerToken(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) {
    return null;
  }

  const token = value.slice('Bearer '.length).trim();

  return token === '' ? null : token;
}
