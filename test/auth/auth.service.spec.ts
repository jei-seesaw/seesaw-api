import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Affiliation } from '../../src/affiliations/affiliation.entity';
import { AuthService } from '../../src/auth/auth.service';
import {
  InvalidAccessTokenException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from '../../src/auth/auth.exceptions';
import type { EnvConfig } from '../../src/config/env';
import { hashPassword } from '../../src/users/password';
import { User } from '../../src/users/user.entity';
import { UsersRepository } from '../../src/users/users.repository';

describe('AuthService', () => {
  let repository: FakeUsersRepository;
  let service: AuthService;

  beforeEach(() => {
    repository = new FakeUsersRepository();
    service = new AuthService(
      repository,
      new JwtService(),
      new FakeConfigService({
        APP_ENV: 'local',
        CORS_ORIGINS: ['http://localhost:5173'],
        DB_HOST: 'localhost',
        DB_NAME: 'seesaw',
        DB_PASSWORD: 'seesaw',
        DB_PORT: 3307,
        DB_USER: 'seesaw',
        JWT_ACCESS_SECRET: 'access-secret-for-test',
        JWT_REFRESH_SECRET: 'refresh-secret-for-test',
        CLOUDINARY_CLOUD_NAME: 'seesaw-test',
        CLOUDINARY_API_KEY: 'cloudinary-key',
        CLOUDINARY_API_SECRET: 'cloudinary-secret',
        CLOUDINARY_UPLOAD_FOLDER: 'seesaw/test',
        PORT: 3000,
      }) as unknown as ConfigService<EnvConfig, true>,
    );
  });

  it('닉네임과 비밀번호가 맞으면 accessToken과 refreshToken을 발급한다', async () => {
    repository.user = await makeUser('login-user', 'password123');

    const result = await service.login({
      nickname: 'login-user',
      password: 'password123',
    });

    await expect(service.verifyAccessToken(result.accessToken)).resolves.toEqual({
      id: repository.user.id,
      nickname: 'login-user',
    });
    const refreshResult = await service.refresh(result.refreshToken);

    expect(typeof refreshResult.accessToken).toBe('string');
    expect(refreshResult.accessToken.length).toBeGreaterThan(0);
  });

  it('비밀번호가 틀리면 로그인 요청을 거절한다', async () => {
    repository.user = await makeUser('login-user', 'password123');

    await expect(
      service.login({ nickname: 'login-user', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('없는 닉네임이면 로그인 요청을 거절한다', async () => {
    repository.user = null;

    await expect(
      service.login({ nickname: 'missing-user', password: 'password123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('refreshToken이 아니면 accessToken 재발급을 거절한다', async () => {
    repository.user = await makeUser('login-user', 'password123');
    const { accessToken } = await service.login({
      nickname: 'login-user',
      password: 'password123',
    });

    await expect(service.refresh(accessToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it('accessToken이 아니면 JWT access 검증을 거절한다', async () => {
    repository.user = await makeUser('login-user', 'password123');
    const { refreshToken } = await service.login({
      nickname: 'login-user',
      password: 'password123',
    });

    await expect(service.verifyAccessToken(refreshToken)).rejects.toBeInstanceOf(
      InvalidAccessTokenException,
    );
  });
});

class FakeUsersRepository implements UsersRepository {
  user: User | null = null;

  create(user: User): Promise<User> {
    this.user = user;

    return Promise.resolve(user);
  }

  existsByNickname(nickname: string): Promise<boolean> {
    return Promise.resolve(this.user?.nickname === nickname);
  }

  findAffiliationsByIds(): Promise<never[]> {
    return Promise.resolve([]);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.user?.id === id ? this.user : null);
  }

  findByNickname(nickname: string): Promise<User | null> {
    return Promise.resolve(this.user?.nickname === nickname ? this.user : null);
  }
}

class FakeConfigService {
  constructor(private readonly env: EnvConfig) {}

  getOrThrow<TKey extends keyof EnvConfig>(key: TKey): EnvConfig[TKey] {
    return this.env[key];
  }
}

async function makeUser(nickname: string, password: string): Promise<User> {
  return new User(
    nickname,
    await hashPassword(password),
    new Affiliation('education', '재능교육'),
  );
}
