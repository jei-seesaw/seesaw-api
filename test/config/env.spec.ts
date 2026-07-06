import { validateEnv } from '../../src/config/env';

describe('validateEnv', () => {
  it('local 환경에서는 인증과 CORS 기본값을 채운다', () => {
    const env = validateEnv({ APP_ENV: 'local' });

    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173']);
    expect(env.JWT_ACCESS_SECRET.length).toBeGreaterThan(0);
    expect(env.JWT_REFRESH_SECRET.length).toBeGreaterThan(0);
    expect(env.CLOUDINARY_CLOUD_NAME.length).toBeGreaterThan(0);
    expect(env.CLOUDINARY_API_KEY.length).toBeGreaterThan(0);
    expect(env.CLOUDINARY_API_SECRET.length).toBeGreaterThan(0);
    expect(env.CLOUDINARY_UPLOAD_FOLDER.length).toBeGreaterThan(0);
  });

  it('CORS_ORIGINS를 쉼표 구분 목록으로 파싱한다', () => {
    expect(
      validateEnv({
        APP_ENV: 'dev',
        CORS_ORIGINS: 'https://app.example.com, https://admin.example.com',
        DB_PASSWORD: 'password',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        CLOUDINARY_CLOUD_NAME: 'seesaw',
        CLOUDINARY_API_KEY: 'cloudinary-key',
        CLOUDINARY_API_SECRET: 'cloudinary-secret',
        CLOUDINARY_UPLOAD_FOLDER: 'seesaw/dev',
      }).CORS_ORIGINS,
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('dev 환경에서 JWT secret이 없으면 부팅을 거절한다', () => {
    expect(() =>
      validateEnv({
        APP_ENV: 'dev',
        CORS_ORIGINS: 'https://app.example.com',
        DB_PASSWORD: 'password',
      }),
    ).toThrow('JWT_ACCESS_SECRET');
  });

  it('dev 환경에서 Cloudinary 설정이 없으면 부팅을 거절한다', () => {
    expect(() =>
      validateEnv({
        APP_ENV: 'dev',
        CORS_ORIGINS: 'https://app.example.com',
        DB_PASSWORD: 'password',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
      }),
    ).toThrow('CLOUDINARY_CLOUD_NAME');
  });

  it('live 환경에서 CORS_ORIGINS가 없으면 부팅을 거절한다', () => {
    expect(() =>
      validateEnv({
        APP_ENV: 'live',
        DB_PASSWORD: 'password',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
      }),
    ).toThrow('CORS_ORIGINS');
  });
});
