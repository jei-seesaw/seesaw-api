import { UnauthorizedException } from '@nestjs/common';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({
      code: 'invalid_credentials',
      message: 'Invalid nickname or password',
    });
  }
}

export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor() {
    super({
      code: 'invalid_refresh_token',
      message: 'Invalid refresh token',
    });
  }
}

export class InvalidAccessTokenException extends UnauthorizedException {
  constructor() {
    super({
      code: 'invalid_access_token',
      message: 'Invalid access token',
    });
  }
}
