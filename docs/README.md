# AI Agent Harness

이 디렉터리는 Seesaw API에서 AI agent가 코드를 파악하고 구현할 때 참고하는
작은 문서 surface다. Harness는 제품 문서나 CI 제품명이 아니라, 이 저장소에서
AI와 함께 개발하기 위한 작업 합의다.

## 기준

- `AGENTS.md`는 agent가 항상 읽는 repo guide다. 명령어, 검증, 작업 규칙처럼
  매번 필요한 짧은 규칙만 둔다.
- `docs/`는 agent가 필요할 때 읽는 reference다. 현재 구조, API 계약, 정책 배경처럼
  길어질 수 있는 내용을 둔다.
- `.agents/skills/`는 반복 workflow를 담는다. API contract, NestJS 구조,
  backend 내부 패턴처럼 작업 유형별로 재사용되는 절차를 둔다.
- Repo skill은 `SKILL.md` frontmatter의 `name`과 `description`으로 발견되고,
  필요한 작업에서만 본문을 읽는 progressive disclosure 방식을 전제로 쓴다.

## 현재 문서

- `PROJECT_STRUCTURE.md`: 현재 소스 트리와 각 디렉터리의 책임.
- `API_CONTRACT.md`: 공통 success/error envelope, Swagger 배치, health endpoint
  응답 규칙.
- `.agents/skills/api-design/SKILL.md`: HTTP contract 설계 작업.
- `.agents/skills/nestjs-patterns/SKILL.md`: Nest module/controller/provider 작업.
- `.agents/skills/backend-patterns/SKILL.md`: persistence, logging, jobs, server
  internals 작업.
- `.agents/skills/tdd-workflow/SKILL.md`: 테스트 가능한 기능 구현과 버그 수정의
  red-green-refactor workflow.

## 만들지 않는 것

- 작은 프로젝트 단계에서는 spec/status/approval-heavy process를 두지 않는다.
- 실제 강제 command가 생기기 전까지 hook, generated policy check, CI gate를
  만들지 않는다.
- 실제 auth, DB, deployment 구조가 생기기 전까지 관련 runbook을 만들지 않는다.
- 특정 agent 전용 instruction file은 실제로 도입할 때만 추가한다.

## 갱신 기준

아래가 바뀌면 같은 변경에서 가장 작은 Harness surface를 갱신한다.

- build, lint, typecheck, local-run command
- test command 또는 반복 테스트 workflow
- public API shape, error response, Swagger 노출 조건
- module boundary, cross-cutting provider, persistence convention
- 같은 review comment나 agent 실수가 두 번 이상 반복되는 규칙
- 반복 workflow가 skill로 분리할 만큼 자주 쓰이는 경우

## 참고

- AGENTS.md: https://agents.md/
- Codex custom instructions and skills: https://developers.openai.com/codex/
- Agent Skills specification: https://agentskills.io/specification
- OpenAI Codex repo example: https://github.com/openai/codex
- Apache Airflow repo example: https://github.com/apache/airflow
