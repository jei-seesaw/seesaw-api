---
name: tdd-workflow
description: Use for Seesaw API feature implementation, bug fixes, business rules, DTO validation, guards, filters, interceptors, providers, and runtime behavior changes that need tests first. Enforces red-green-refactor before code changes. Skip for docs-only, Swagger-only, mechanical rename, trivial constants or strings, and typecheck/lint-only changes.
---

# TDD Workflow

Use this skill before changing testable runtime behavior. Keep the loop small:
one behavior, one failing test, the minimum code, then cleanup.

## Red

- State the behavior and edge cases the change must prove.
- Write the smallest test that fails on the current code for the right reason.
- Use provider/unit tests for service business rules and branching logic.
- Use request-level e2e tests for validation pipes, guards, filters,
  interceptors, response envelopes, and Nest wiring.
- Mirror `src/` feature paths under `test/` for e2e tests, for example
  `src/health/` -> `test/health/health.e2e-spec.ts`.
- For bugs, start with a regression test that reproduces the bug.
- Run the targeted test first, for example:

```bash
pnpm test -- --runTestsByPath src/example/example.service.spec.ts
pnpm test:e2e -- --runTestsByPath test/health/health.e2e-spec.ts
```

Do not continue until the failure matches the requirement.

## Green

- Write only the code needed to pass the failing test.
- Reuse existing Nest providers, DTO validation, helpers, and standard
  TypeScript before adding new abstractions or dependencies.
- Keep controllers thin; put business rules in injectable services.

## Refactor

- Clean up only code touched by the change.
- Do not change behavior during refactor.
- Rerun the targeted test after each meaningful cleanup.

## What To Test

- Business rules, authorization decisions, state transitions, and workflow
  branching.
- DTO validation and trust-boundary behavior.
- Public error and success response shapes when they can change.
- Guard, filter, interceptor, provider, and module wiring that affects runtime
  behavior.
- Edge cases that would change user-visible behavior or prevent regressions.

## What To Skip

- Swagger metadata-only changes.
- Simple constants, strings, imports, or mechanical renames covered by
  typecheck/lint.
- Tests that only duplicate a controller's implementation detail, such as
  asserting that a mocked service method was called without proving behavior.
- Generated boilerplate and framework behavior that this repo does not own.

## Final Verification

- Run the smallest relevant test during the loop.
- Before finishing feature or bug work, run `pnpm test` or `pnpm test:e2e`
  according to the touched behavior.
- Also follow `AGENTS.md`: TypeScript changes require `pnpm typecheck` and
  `pnpm lint`; Nest module/provider/bootstrap/decorator wiring changes require
  `pnpm build`.
