# Bottleneck audits (orchestrator, hourly; Michael 2026-10-23 ~18:55 "constantly find bottlenecks")

## 2026-10-23 ~19:05 (Opus audit, measured on 10-23)
19 releases; daytime mean 51 min apart (median 43, max 118). Per train (19-30): release -> next build 279 min/day
(45%, mean 23), build -> laptop verdict 253 min/day (41%, ~126 min runs + ~127 min pickup / relay / reruns), release CI
81 min/day (13%, fixed by release-speed #244).

| # | Wait | Cost | Cause | Fix | Who |
| --- | --- | --- | --- | --- | --- |
| 1 | All sessions across swaps | ~2.3 h/day idle (7 swaps, 10-40 min to all up); ~9% of each window to restart; 5+ agent jobs lost | one account for both machines; prompts rewritten each swap and drift | fixed PROMPTS.md (six stable prompts, pasted at once); laptop on an offset account | orchestrator / Michael |
| 2 | Train runs waiting on Test Runner pickup and relay | ~127 min/day | LLM-written chain scripts (43 on 10-23, 5+ void), verdicts by message, bridge drops | laptop queue service: JSON requests, priority order, trains preempt, GitHub `laptop-e2e` statuses | orchestrator (Test Runner builds) |
| 3 | Ready PRs waiting for a build | 279 min/day | "3+ ready or 2 h" rule, orchestrator only | rolling / automatic trains after #244 | Michael (auto-merge to master) |
| 4 | Trains slowed by the second laptop slot | 20-30 min/day (616-908 s vs 408-514 s) | no train preemption | in the queue service | orchestrator |
| 5 | Cross-area failures only in the train | ~20 min per 6 trains | suites picked by hand | `run-e2e.mjs --affected` map | orchestrator (Sonnet) |
| 6 | Desktop CPU | single suites ~2x laptop; builds 1.5 vs 6.4 min | i7-7700K under 3 sessions | hardware / cloud, or PR area e2e on Actions (software GL) | Michael |
| 7 | Orchestrator / Michael as gates | 3 permission blocks; 6 stale stacked PRs | permissions, manual housekeeping | lock PID + stale-lock break; release closes merged members | orchestrator / Michael (allow rules) |
| 8 | Alone-measurements starved | #226 perf open 4 h+ | "only while no train is queued" | run them right after each release and in swap gaps | orchestrator |

Not measured: laptop run dirs (not reachable from the desktop), heavy.lock history, message counts.
