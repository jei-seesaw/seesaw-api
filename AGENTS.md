# AGENTS.md

Seesaw API는 NestJS 11, TypeScript strict mode, `pnpm@11.5.0` 기반 API다.
이 파일은 agent가 항상 읽는 짧은 repo guide다. 세부 구조와 계약은 `./docs/`
문서를 따른다.

## Purpose

- HTTP API를 작고 검증 가능하게 바꾼다.
- Public API shape, error envelope, Swagger 노출 조건은
  `./docs/API_CONTRACT.md`가 source of truth다.
- 구조와 feature ownership은 `./docs/PROJECT_STRUCTURE.md`와
  `./docs/ARCHITECTURE.md`를 먼저 본다.

## Commands

```bash
pnpm install
docker compose up -d mariadb
pnpm db:migrate
pnpm start:dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

## Patterns

- 수정 전 관련 파일을 읽고, 고영향도 모호함만 질문한다.
- 변경은 요청 범위에 맞게 작게 유지한다. 관련 없는 리팩터링과 포맷팅은 하지
  않는다.
- 새 dependency는 명시적 승인 없이는 추가하지 않는다.
- Controller는 얇게 두고, 비즈니스 규칙은 injectable service에 둔다.
- 성공 응답은 전역 interceptor가 `{ data: ... }`로 감싼다. Controller에서 직접
  `{ data: ... }`를 반환하지 않는다.
- 예상 가능한 도메인 4xx는 feature-local custom exception이 HTTP status,
  public code, message를 소유한다.
- Swagger bootstrap은 `src/config/swagger.ts`, controller별 decorator는
  controller 옆 `*.swagger.ts`에 둔다.
- Swagger summary, description, example은 한국어로 작성한다.
- 다른 feature 데이터가 필요하면 owning feature provider를 export/import한다.

## Testing

- 런타임 동작 변경은 먼저 실패 테스트를 만들고 `red -> green -> refactor`로
  진행한다.
- 테스트 파일은 `test/` 아래에 두고 source feature 경로를 가능한 한 mirror한다.
- Jest `it()` 설명은 한국어 문장으로 작성한다.
- 문서-only, Swagger metadata-only, 기계적 rename, 단순 문자열/상수 변경에는
  테스트를 억지로 만들지 않는다.

## Verification

- TypeScript 파일 수정: `pnpm typecheck`, `pnpm lint`.
- Nest module/provider/bootstrap/decorator wiring 수정: `pnpm build`.
- 기능/버그 코드 수정: 관련 targeted test 후 영향 범위에 맞게 `pnpm test` 또는
  `pnpm test:e2e`.
- 실제로 실행하지 않은 검증을 실행했다고 말하지 않는다.

## Dependencies

- API contract 작업: `./.agents/skills/api-design/SKILL.md`.
- Nest module/controller/provider 작업: `./.agents/skills/nestjs-patterns/SKILL.md`.
- Persistence/logging/server internals 작업:
  `./.agents/skills/backend-patterns/SKILL.md`.
- 테스트 가능한 런타임 동작 변경: `./.agents/skills/tdd-workflow/SKILL.md`.

## Notes

- Harness는 이 저장소에서 AI와 함께 개발하기 위한 협업 규약이며, CI/CD 제품명이
  아니다.
- 반복 규칙이 생기면 `AGENTS.md`, `./docs/`, `./.agents/skills/` 중 가장 작은
  surface를 갱신한다.
- 커밋을 요청받으면 `.gitmessage.txt`를 따른다.
