import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { API_PREFIX } from '../config/api-prefix';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_SECONDS,
  AuthService,
} from './auth.service';
import {
  AccessTokenResponseDto,
  LoginRequestDto,
} from './dto/login.dto';
import {
  ApiAuthController,
  ApiLogin,
  ApiRefreshToken,
} from './auth.swagger';

interface CookieResponse {
  cookie(name: string, value: string, options: RefreshCookieOptions): void;
}

interface RefreshCookieOptions {
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: 'none';
  secure: boolean;
}

@ApiAuthController()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiLogin()
  async login(
    @Body() dto: LoginRequestDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<AccessTokenResponseDto> {
    const { accessToken, refreshToken } = await this.auth.login(dto);

    response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: `/${API_PREFIX}/auth/refresh`,
      sameSite: 'none',
      secure: true,
    });

    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiRefreshToken()
  refresh(
    @Headers('cookie') cookieHeader: string | undefined,
  ): Promise<AccessTokenResponseDto> {
    return this.auth.refresh(
      getCookieValue(cookieHeader, REFRESH_TOKEN_COOKIE_NAME),
    );
  }
}

function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = cookie.trim().split('=');

    if (rawName === name) {
      return rawValue.join('=');
    }
  }

  return null;
}
