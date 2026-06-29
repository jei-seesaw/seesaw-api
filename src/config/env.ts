export const APP_ENV_VALUES = ['local', 'dev', 'live'] as const;

export type AppEnv = (typeof APP_ENV_VALUES)[number];

export interface EnvConfig {
  APP_ENV: AppEnv;
  PORT: number;
}

export function getEnvFilePaths(): string[] {
  const appEnv = process.env.APP_ENV ?? 'local';

  return [`.env.${appEnv}`, '.env'];
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  return {
    APP_ENV: parseAppEnv(config.APP_ENV),
    PORT: parsePort(config.PORT),
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

  const port = typeof value === 'string' ? Number(value) : value;

  if (
    typeof port !== 'number' ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'Invalid environment: PORT must be an integer between 1 and 65535',
    );
  }

  return port;
}

function isAppEnv(value: string): value is AppEnv {
  return APP_ENV_VALUES.includes(value as AppEnv);
}
