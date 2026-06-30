# Project Structure

현재 구조만 설명한다. 아직 없는 DB, auth, deployment 구조는 여기에서 선점하지
않는다.

```text
src/
  main.ts
  app.module.ts
  config/
    env.ts
    swagger.ts
  common/
    api-response.ts
    global-exception.filter.ts
    logging/
      app-logger.service.ts
      logging.module.ts
      request-logging.interceptor.ts
  health/
    health.controller.ts
    health.swagger.ts

.agents/
  skills/
    api-design/
    nestjs-patterns/
    backend-patterns/
```

## Runtime entrypoints

- `src/main.ts` creates the Nest app, installs `AppLogger`, reads typed env via
  `ConfigService<EnvConfig, true>`, configures Swagger, and listens on `PORT`.
- `src/app.module.ts` owns global module wiring: config validation, logging,
  request logging, success response wrapping, and exception filtering.

## Config

- `src/config/env.ts` owns env file precedence and boot-time env validation.
- `APP_ENV` is `local`, `dev`, or `live`; missing value defaults to `local`.
- `PORT` defaults to `3000` and must be an integer from 1 to 65535.
- `src/config/swagger.ts` owns app-level Swagger setup. Swagger is skipped when
  `APP_ENV=live`.

## Common layer

- `src/common/api-response.ts` wraps successful controller return values as
  `{ data: ... }`.
- `src/common/global-exception.filter.ts` normalizes exceptions as
  `{ error: { code, message, details? } }` and logs unexpected/server errors.
- `src/common/logging/` owns structured console logging and request logging.

## Feature code

- `src/health/` is the current feature surface.
- Controller Swagger metadata stays beside the controller in `*.swagger.ts`.
- New feature code should live in its own feature directory once it grows beyond
  the initial health endpoint.

## Generated files

- `dist/` is build output, not source of truth for implementation or docs.
