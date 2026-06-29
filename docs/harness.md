# AI Agent Harness

이 저장소는 가벼운 AI Agent Harness를 사용한다. AI agent가 이 프로젝트에서 어떻게
일해야 하는지 알려주고, 코드베이스가 커질수록 그 지침을 함께 갱신하기 위한
작은 파일 묶음이다.

Harness는 제품 문서, API 문서, CI의 대체물이 아니다. AI와 함께 개발하기 위한
작업 합의다.

## 기준 자료

- `AGENTS.md`는 coding agent가 읽는 repository guide 형식의 공개 규약이다.
  https://agents.md/

이 저장소의 Harness는 특정 AI agent 제품명에 묶지 않는다. 사용하는 agent가
바뀌어도 유지되어야 하는 프로젝트 규칙만 문서화한다.

## 현재 Harness 파일

- `AGENTS.md`: 프로젝트 명령어, 작업 규칙, 검증, Nest/API 규약, Harness 관리
  규칙.
- `docs/harness.md`: 이 문서.
- `.agents/skills/api-design/SKILL.md`: REST API contract pattern.
- `.agents/skills/nestjs-patterns/SKILL.md`: NestJS 구조와 validation pattern.
- `.agents/skills/backend-patterns/SKILL.md`: data access, transaction, caching,
  jobs, logging 등 backend 내부 pattern.

## 어디에 무엇을 둘지

- AI agent가 모든 작업에서 따라야 하는 짧은 규칙은 `AGENTS.md`에 둔다.
- 긴 설명, 정책 배경, decision history는 `docs/`에 둔다.
- 예시나 script가 필요한 반복 workflow는 `.agents/skills/`에 둔다.
- 기계적으로 강제할 규칙은 실제 command가 생긴 뒤 script, test, hook, CI에 둔다.

중복 instruction file은 만들지 않는다. 특정 agent 전용 파일은 실제로 그 agent를
도입할 때만 추가한다.

## Harness를 갱신해야 하는 경우

아래 상황에서는 같은 변경에서 Harness도 갱신한다.

- 같은 agent 실수나 review comment가 두 번 이상 반복된다.
- build, test, lint, migration, local-run command가 바뀐다.
- public API shape, error response, auth boundary, validation policy가 생기거나
  바뀐다.
- module boundary, architecture rule, persistence convention이 프로젝트 규약이
  된다.
- 반복 workflow가 skill로 분리할 만큼 자주 쓰인다.
- 특정 directory에만 적용되는 규칙이 생겨 nested `AGENTS.md`가 필요하다.

## 현재 하지 않는 것

- 프로젝트가 작은 동안 approval-heavy spec/status process는 두지 않는다.
- 실제로 강제할 command가 생기기 전까지 hook, CI gate, generated policy check는
  만들지 않는다.
- 특정 agent 전용 instruction file은 만들지 않는다.
- 실제 architecture가 생기기 전까지 넓은 architecture 문서를 만들지 않는다.

## 유지보수 체크리스트

feature나 refactor를 끝내기 전, 새로 생긴 durable rule이 있는지 확인한다. 있다면
가장 작은 Harness surface를 갱신한다.

1. 모든 작업에 적용되는 규칙은 `AGENTS.md`.
2. 자세한 정책이나 배경은 `docs/`.
3. 반복 workflow는 `.agents/skills/`.

Harness는 작고 단순해야 한다. 실제 반복 실수를 막는 규칙만 남긴다.
