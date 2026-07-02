# scripts/AGENTS.md

## Purpose

`scripts/` holds small repo maintenance commands that can run locally and in CI.

## Patterns

- Prefer Python stdlib or shell built-ins.
- Keep scripts runnable with the system `python3`.
- Put project-facing commands in package.json.

## 주의

- Do not add dependencies or hooks for context validation; CI runs the package
  command.

## Dependencies

- Root rules: [../AGENTS.md](../AGENTS.md)
- Harness docs: [../docs/README.md](../docs/README.md)

## Verification

```bash
pnpm context:check
```
