# Project Structure

현재 디렉터리 구조만 설명한다. 세부 파일 목록은 코드가 source of truth다.

```text
src/
  main.ts
  app.module.ts
  config/
  common/
    logging/
  affiliations/
    dto/
  auth/
    dto/
    guards/
  health/
  home/
    dto/
  image-uploads/
    dto/
  migrations/
  users/
    dto/
  vote-events/
    dto/
test/
  affiliations/
  auth/
  config/
  health/
  home/
  image-uploads/
  users/
  vote-events/

.agents/
  skills/
    api-design/
    nestjs-patterns/
    backend-patterns/
    tdd-workflow/
```

## Runtime entrypoints

- `src/main.ts`는 Nest app을 만들고, `AppLogger`를 설치하고,
  `ConfigService<EnvConfig, true>`로 typed env를 읽고, global API prefix를
  적용하고, `CORS_ORIGINS` 기반 credentialed CORS를 켜고, Swagger를 설정한 뒤
  `PORT`로 listen한다.
- `src/app.module.ts` owns global module wiring: config validation, logging,
  request validation, MikroORM, request logging, success response wrapping, and
  exception filtering.

## Config

- `src/config/`는 env file 우선순위, boot-time env validation, CORS origin
  parsing, app-level Swagger setup, global API prefix, MikroORM MariaDB 설정을
  소유한다.
- `APP_ENV` is `local`, `dev`, or `live`; missing value defaults to `local`.
- `PORT` defaults to `3000` and must be an integer from 1 to 65535.
- Local env values live in `.env.local`, using `127.0.0.1:3307` for host tools.
  The root `docker-compose.yml` is local-only and overrides the API container
  DB host to `mariadb:3306`.
- Dev deployment compose lives in `deploy/docker-compose.dev.yml` with
  `deploy/.env`.
- `APP_ENV=live`에서는 `DB_PASSWORD`, `CORS_ORIGINS`,
  `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
  `CLOUDINARY_UPLOAD_FOLDER`를 명시해야 한다.
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
- `src/auth/`는 login, refresh, JWT signing/verification, bearer token guard와
  optional bearer token guard를 소유한다. Refresh token persistence와
  logout/revoke storage는 아직 없다.
- `src/health/` owns the health check.
- `src/home/` owns the main-page summary API. It reads vote event aggregate
  counters and, when an access token is present, the current user's vote token.
- `src/image-uploads/` owns signed Cloudinary direct-upload parameters for
  vote event option images. The API server does not receive image binaries.
- `src/users/`는 User storage, password hashing/verification, nickname
  availability API를 소유하며 MikroORM user data access는 repository provider
  뒤에 둔다.
- `src/vote-events/` owns vote event creation, vote participation writes,
  ongoing/completed vote event reads, result visibility, aggregate counters,
  and vote event persistence.
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
