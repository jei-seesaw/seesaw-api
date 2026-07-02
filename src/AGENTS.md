# src/AGENTS.md

## Purpose

`src/`는 NestJS runtime code의 source of truth다. Feature module, global provider,
config, entity, repository, DTO, controller, Swagger decorator를 이곳에 둔다.

## Patterns

- Feature code는 `src/<feature>/` 안에 모은다.
- Controller는 HTTP 입력을 받고 service/provider 호출 결과 DTO를 반환한다.
- Service는 business rule, authorization decision, workflow를 소유한다.
- Repository/provider는 DB와 ORM detail을 숨기고 domain language로 말한다.
- Swagger metadata는 controller 옆 `*.swagger.ts`에 둔다.
- Public response shape은 global interceptor/filter가 소유한다.

## 주의

- Controller에서 `{ data: ... }`를 직접 만들지 않는다.
- Service에서 public `{ code, message }` payload를 조립하지 않는다.
- 다른 feature table이 필요하면 owning feature provider를 export/import한다.
- `APP_ENV=live`에서는 Swagger docs가 노출되면 안 된다.
- 새 dependency는 승인 없이 추가하지 않는다.

## Dependencies

- Root rules: `../AGENTS.md`
- 구조 설명: `../docs/PROJECT_STRUCTURE.md`
- API 계약: `../docs/API_CONTRACT.md`
- Architecture map: `../docs/ARCHITECTURE.md`
- Nest patterns: `../.agents/skills/nestjs-patterns/SKILL.md`
- Backend patterns: `../.agents/skills/backend-patterns/SKILL.md`
- TDD workflow: `../.agents/skills/tdd-workflow/SKILL.md`

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm build
```

런타임 동작이 바뀌면 관련 test를 먼저 실패시킨 뒤 통과시킨다.
