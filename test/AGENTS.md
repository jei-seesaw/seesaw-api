# test/AGENTS.md

## Purpose

`test/`는 source feature 경로를 mirror하는 unit/e2e spec을 둔다. 새 동작은 테스트로
먼저 설명하고, 문서-only나 기계적 이동은 기존 검증을 재사용한다.

## Patterns

- Unit spec은 provider/service를 fake dependency로 좁게 검증한다.
- E2E spec은 Nest app, global prefix, production과 같은 pipe/filter/interceptor
  wiring을 사용한다.
- Swagger spec은 OpenAPI JSON의 route, schema, security, response example을 본다.
- Test helper는 feature 내부에서만 공유한다.
- Jest `it()` 설명은 한국어 문장으로 작성한다.

## 주의

- Source tree 밖의 feature를 테스트 편의를 위해 직접 우회하지 않는다.
- DB state를 쓰는 e2e는 자기 prefix 데이터만 정리한다.
- Public API shape 변경은 e2e와 Swagger spec을 같이 본다.
- 불필요한 fixture framework를 만들지 않는다.

## Dependencies

- Root rules: [../AGENTS.md](../AGENTS.md)
- Source rules: [../src/AGENTS.md](../src/AGENTS.md)
- API 계약: [../docs/API_CONTRACT.md](../docs/API_CONTRACT.md)
- TDD workflow: [../.agents/skills/tdd-workflow/SKILL.md](../.agents/skills/tdd-workflow/SKILL.md)

## Verification

```bash
pnpm test
pnpm test:e2e
```

TypeScript test 파일을 바꾸면 `pnpm typecheck`와 `pnpm lint`도 실행한다.
