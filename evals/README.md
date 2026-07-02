# Agent Evals

이 디렉터리는 Seesaw API에서 agent workflow 회귀를 수동으로 기록하는 작은
surface다. 주의: 자동 evaluator, hook, dependency는 아직 만들지 않는다.

## Tasks

- [agent-tasks.json](agent-tasks.json): 대표 agent 작업과 pass criteria.
- [agent-results.json](agent-results.json): 현재 기준 결과와 남은 gap.

## Result Fields

- `durationMinutes`: 수동 측정한 작업 시간이다. 미측정이면 `null`로 둔다.
- `toolCalls`: 수동 집계한 도구 호출 수다. 미측정이면 `null`로 둔다.

## Run

```bash
python3 <ai-readiness scorer> . --json <score output>
```

작업 결과가 바뀌면 같은 변경에서 결과 JSON을 갱신한다.
