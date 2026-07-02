## 변경 요약

-

## 검증

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e`
- [ ] `pnpm build`
- [ ] 실행하지 않은 항목은 사유를 적었다.

## Review Gate

- [ ] Public API shape, success/error envelope, status code가 `docs/API_CONTRACT.md`와 맞다.
- [ ] Swagger summary, description, example이 실제 사용 흐름과 맞고 한국어다.
- [ ] Provider boundary를 지켰다. 다른 feature 데이터는 owning provider를 통해 접근한다.
- [ ] Service가 public `{ code, message }` payload를 직접 조립하지 않는다.
- [ ] 새 dependency, hook, generated checker를 추가했다면 이유와 승인 근거가 있다.
- [ ] 영향 범위가 큰 변경은 independent review 또는 self-review 근거를 남겼다.
