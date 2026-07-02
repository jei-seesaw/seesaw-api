# Agent Evals

이 디렉터리는 Seesaw API에서 agent workflow 회귀를 수동으로 기록하는 작은
surface다. 자동 evaluator, hook, dependency는 아직 만들지 않는다.

## Tasks

- `agent-tasks.json`: 대표 agent 작업과 pass criteria.
- `agent-results.json`: 현재 기준 결과와 남은 gap.

## Run

```bash
python3 <ai-readiness scorer> . --json <score output>
```

작업 결과가 바뀌면 같은 변경에서 결과 JSON을 갱신한다.
