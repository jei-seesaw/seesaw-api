# 0001. API Boundaries And Agent Workflow

Date: 2026-07-02

## Status

Accepted

## Context

Seesaw API is small enough that heavy spec/status gates would add friction, but
large enough that repeated agent mistakes around response envelopes, Swagger,
feature ownership, and tests are expensive.

## Decision

- Keep root `AGENTS.md` short and move durable reference material into `docs/`.
- Keep repo skills under `./.agents/skills/` for task-specific workflows.
- Use TDD for runtime behavior changes, but skip forced tests for docs-only,
  Swagger-only, mechanical moves, and trivial constants.
- Keep public success/error envelopes in global providers.
- Keep cross-feature persistence behind the owning feature provider.
- Use PR template review gates instead of CODEOWNERS until actual owners exist.

## Consequences

- Agents have a smaller always-loaded context and can opt into deeper docs.
- Provider boundary and public API review become checklist items.
- CODEOWNERS remains intentionally absent until repository ownership is known.
- No new hooks, generated policy checkers, or dependencies are introduced.
