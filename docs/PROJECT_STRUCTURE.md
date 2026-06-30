# Project Structure

현재 디렉터리 구조만 설명한다. 세부 파일 목록은 코드가 source of truth다.
아직 없는 auth, deployment 구조는 여기에서 선점하지 않는다.

```text
src/
  main.ts
  app.module.ts
  config/
  common/
    logging/
  affiliations/
    dto/
  health/
  migrations/
  users/
    dto/
test/
  affiliations/
  health/
  users/

.agents/
  skills/
    api-design/
    nestjs-patterns/
    backend-patterns/
    tdd-workflow/
```

## Runtime entrypoints

- `src/main.ts` creates the Nest app, installs `AppLogger`, reads typed env via
  `ConfigService<EnvConfig, true>`, applies the global API prefix, configures
  Swagger, and listens on `PORT`.
- `src/app.module.ts` owns global module wiring: config validation, logging,
  request validation, MikroORM, request logging, success response wrapping, and
  exception filtering.

## Config

- `src/config/` owns env file precedence, boot-time env validation, app-level
  Swagger setup, global API prefix, and MikroORM MariaDB configuration.
- `APP_ENV` is `local`, `dev`, or `live`; missing value defaults to `local`.
- `PORT` defaults to `3000` and must be an integer from 1 to 65535.
- Local env values live in `.env.local`, using `127.0.0.1:3307` for host tools.
  The root `docker-compose.yml` is local-only and overrides the API container
  DB host to `mariadb:3306`.
- Dev deployment compose lives in `deploy/docker-compose.dev.yml` with
  `deploy/.env`.
- `APP_ENV=live` requires an explicit `DB_PASSWORD`.
- Swagger is skipped when `APP_ENV=live`.

## Common layer

- `src/common/` owns cross-cutting response wrapping, exception normalization,
  and shared logging.
- Successful controller return values are wrapped as `{ data: ... }`.
- Exceptions are normalized as `{ error: { code, message, details? } }`.
- `src/common/logging/` owns structured console logging and request logging.

## Feature code

- `src/affiliations/` owns Affiliation metadata storage and the affiliation
  list API.
- `src/health/` owns the health check.
- `src/users/` owns User storage and the nickname availability API, with
  MikroORM user data access behind a repository provider.
- Controller Swagger metadata stays beside the controller in `*.swagger.ts`.
- New feature code should live in its own feature directory once it grows beyond
  the initial health endpoint.

## Tests

- `test/**/*.spec.ts` is for focused unit tests when feature code needs them.
- `test/**/*.e2e-spec.ts` is for request-level Nest app behavior.
- Test files live under `test/` and mirror the matching `src/` feature path
  when possible.
- New runtime behavior should follow `.agents/skills/tdd-workflow/SKILL.md`
  unless the change is docs-only, Swagger-only, mechanical, or trivial.

## Generated files

- `dist/` is build output, not source of truth for implementation or docs.
