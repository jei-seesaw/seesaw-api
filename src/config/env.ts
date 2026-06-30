import { existsSync } from 'node:fs';

export const APP_ENV_VALUES = ['local', 'dev', 'live'] as const;

export type AppEnv = (typeof APP_ENV_VALUES)[number];

export interface EnvConfig {
  APP_ENV: AppEnv;
  PORT: number;
  CORS_ORIGINS: string[];
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
}

export function getEnvFilePaths(): string[] {
  const appEnv = process.env.APP_ENV ?? 'local';

  return [`.env.${appEnv}`, '.env'];
}

export function loadEnvFiles(): void {
  for (const envFilePath of getEnvFilePaths()) {
    if (existsSync(envFilePath)) {
      process.loadEnvFile(envFilePath);
    }
  }
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const APP_ENV = parseAppEnv(config.APP_ENV);

  return {
    APP_ENV,
    PORT: parsePort(config.PORT),
    CORS_ORIGINS: parseStringList(
      config.CORS_ORIGINS,
      'CORS_ORIGINS',
      APP_ENV === 'local' ? 'http://localhost:5173' : undefined,
    ),
    DB_HOST: parseString(config.DB_HOST, 'DB_HOST', 'localhost'),
    DB_PORT: parseInteger(config.DB_PORT, 'DB_PORT', 3307),
    DB_USER: parseString(config.DB_USER, 'DB_USER', 'seesaw'),
    DB_PASSWORD: parseString(
      config.DB_PASSWORD,
      'DB_PASSWORD',
      APP_ENV === 'live' ? undefined : 'seesaw',
    ),
    DB_NAME: parseString(config.DB_NAME, 'DB_NAME', 'seesaw'),
    JWT_ACCESS_SECRET: parseString(
      config.JWT_ACCESS_SECRET,
      'JWT_ACCESS_SECRET',
      APP_ENV === 'local' ? 'local-jwt-access-secret' : undefined,
    ),
    JWT_REFRESH_SECRET: parseString(
      config.JWT_REFRESH_SECRET,
      'JWT_REFRESH_SECRET',
      APP_ENV === 'local' ? 'local-jwt-refresh-secret' : undefined,
    ),
  };
}

function parseAppEnv(value: unknown): AppEnv {
  if (value === undefined) {
    return 'local';
  }

  if (typeof value !== 'string' || !isAppEnv(value)) {
    throw new Error(
      `Invalid environment: APP_ENV must be one of ${APP_ENV_VALUES.join(', ')}`,
    );
  }

  return value;
}

function parsePort(value: unknown): number {
  if (value === undefined) {
    return 3000;
  }

  return parseInteger(value, 'PORT');
}

function parseInteger(
  value: unknown,
  name: string,
  defaultValue?: number,
): number {
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue;
  }

  const port = typeof value === 'string' ? Number(value) : value;

  if (
    typeof port !== 'number' ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      `Invalid environment: ${name} must be an integer between 1 and 65535`,
    );
  }

  return port;
}

function parseString(
  value: unknown,
  name: string,
  defaultValue?: string,
): string {
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid environment: ${name} must be a non-empty string`);
  }

  return value;
}

function parseStringList(
  value: unknown,
  name: string,
  defaultValue?: string,
): string[] {
  const rawValue = value === undefined ? defaultValue : value;

  if (typeof rawValue !== 'string') {
    throw new Error(`Invalid environment: ${name} must be a non-empty string`);
  }

  const values = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

  if (values.length === 0) {
    throw new Error(`Invalid environment: ${name} must be a non-empty string`);
  }

  return values;
}

function isAppEnv(value: string): value is AppEnv {
  return APP_ENV_VALUES.includes(value as AppEnv);
}
