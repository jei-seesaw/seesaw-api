# AGENTS.md

Seesaw API는 NestJS 11, TypeScript strict mode, `pnpm@11.5.0` 기반의 API
프로젝트다.

이 저장소에서 "Harness"는 AI agent와 함께 개발하기 위한 협업 규약을 뜻한다.
지속 instruction, 가벼운 정책 문서, 재사용 가능한 repo skill을 포함하며,
Harness CI/CD 제품을 뜻하지 않는다.

이 파일은 coding agent가 모든 작업 전에 읽는 repo guide다. 짧고 실행 가능한
규칙만 둔다. 자세한 구조나 API 계약은 `docs/`에 둔다.

## 명령어

- 의존성 설치: `pnpm install`
- 로컬 DB 실행: `docker compose up -d mariadb`
- DB migration 적용: `pnpm db:migrate`
- 로컬 실행: `pnpm start:dev`
- 린트: `pnpm lint`
- 타입 검사: `pnpm typecheck`
- 빌드: `pnpm build`
- 테스트: `pnpm test`
- E2E 테스트: `pnpm test:e2e`

## 작업 규칙

- 수정 전 관련 파일을 먼저 읽는다. 구현에 영향을 주는 가정은 명시한다.
- 저장소에서 해결할 수 없는 고영향도 모호함이 있을 때만 질문한다.
- 변경은 요청 범위에 맞게 작게 유지한다. 관련 없는 리팩터링, 포맷팅,
  정리는 하지 않는다.
- 새 코드나 의존성을 만들기 전에 기존 프로젝트 패턴, NestJS 기능,
  TypeScript, 표준 라이브러리를 먼저 쓴다.
- 명시적 승인 없이 production dependency를 추가하지 않는다.
- 사용자의 기존 변경을 보존한다. 관련 없는 변경을 되돌리지 않는다.
- 모든 변경 라인은 사용자 요청과 직접 연결되어야 한다.
- 기능 구현, 버그 수정, 비즈니스 규칙, DTO validation, guard/filter/interceptor
  같은 런타임 동작 변경은 먼저 실패 테스트를 작성하고 `red -> green ->
  refactor` 순서로 진행한다.
- 문서-only, Swagger metadata-only, 기계적 rename, 단순 문자열/상수 변경처럼
  typecheck/lint로 충분한 변경에는 테스트를 억지로 만들지 않는다.

## 검증

- TypeScript 파일을 수정했다면 `pnpm typecheck`를 실행한다.
- TypeScript 파일이나 lint 설정을 수정했다면 `pnpm lint`를 실행한다.
- Nest module, provider, bootstrap, decorator wiring을 수정했다면
  `pnpm build`를 실행한다.
- 기능/버그 코드를 수정했다면 관련 targeted test가 먼저 실패했는지 확인한 뒤
  통과시킨다. 마지막에는 영향 범위에 맞게 `pnpm test` 또는 `pnpm test:e2e`를
  실행한다.
- 테스트 스크립트가 추가되면 같은 변경에서 이 섹션을 갱신한다.
- 실제로 실행하지 않은 검증을 실행했다고 말하지 않는다.

## NestJS/API 규약

- Controller는 얇게 유지한다. HTTP 입력을 받고 provider를 호출한 뒤 response
  DTO를 반환한다.
- 비즈니스 규칙과 여러 단계의 workflow는 injectable service에 둔다.
- 사용자 입력을 신뢰하기 전에 request DTO 경계에서 검증한다.
- API 응답에 stack trace, SQL error, secret, token, 내부 audit field를 노출하지
  않는다.
- 초기 health endpoint 수준을 넘어서면 feature code는 feature module에 둔다.
- 성공 응답은 전역 `ApiResponseInterceptor`가 `{ data: ... }`로 감싼다.
  Controller에서 직접 `{ data: ... }`를 반환하지 않는다.
- 예외 응답은 전역 `GlobalExceptionFilter`의 `{ error: { code, message,
  details? } }` 형태를 유지한다.
- Swagger bootstrap은 `src/config/swagger.ts`에 두고, controller별 Swagger
  decorator는 controller 옆 `*.swagger.ts`에 둔다.

## Review guidelines

- public API shape, error shape, validation boundary, Swagger 노출 조건이 바뀌면
  docs와 controller Swagger metadata가 함께 맞는지 확인한다.
- `APP_ENV=live`에서는 `/docs`와 `/docs-json`이 노출되지 않아야 한다.
- logging, exception, response envelope 같은 cross-cutting provider 변경은
  `AppModule` wiring과 실행 순서 영향을 같이 본다.

## Repo Skills

- Repo skill은 `.agents/skills/` 아래에 둔다.
- API contract 작업은 `.agents/skills/api-design/SKILL.md`를 읽는다.
- NestJS module/controller/provider 작업은
  `.agents/skills/nestjs-patterns/SKILL.md`를 읽는다.
- Persistence, caching, jobs, logging, server internals 작업은
  `.agents/skills/backend-patterns/SKILL.md`를 읽는다.
- 기능 구현이나 버그 수정처럼 테스트 가능한 런타임 동작 변경은
  `.agents/skills/tdd-workflow/SKILL.md`를 읽는다.

## Harness 관리

- Harness 문서의 entrypoint는 `docs/README.md`다.
- 현재 구조 설명은 `docs/PROJECT_STRUCTURE.md`, API 계약은
  `docs/API_CONTRACT.md`를 따른다.
- 반복되는 규약, 명령어, 검증 규칙, API contract, review expectation이 생기면
  같은 변경에서 `AGENTS.md`, `docs/`, `.agents/skills/` 중 맞는 문서를 갱신한다.
- 특정 subtree에만 적용되는 규칙은 루트 파일을 키우지 말고 해당 subtree의
  nested `AGENTS.md`로 둔다.
- approval-heavy spec/status process, hook, CI gate, plugin, MCP 설정은 실제로
  필요해질 때만 추가한다.
- 커밋을 요청받으면 `.gitmessage.txt`를 따른다.
