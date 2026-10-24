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

## 2026-10-23 ~20:26 (Opus audit)
Train 32: built 19:41, laptop pass 20:04 (43/43, sharded 564 / 560 s), release CI red 20:14 (3 stale unit files; the old build ran 198 / 425), fix 20:22: ~78 min release gap vs 51 mean.

| # | Wait | Cost | Cause | Fix | Who |
| --- | --- | --- | --- | --- | --- |
| 1 | Laptop queue backlog | 7 requests / 26 suites, oldest 25 min | hand-run alone chains hold 4189, 4192 idle | Test Runner drains it; alone chains become queue requests after trains (told 20:30) | Test Runner |
| 2 | Train built on red member CI | ~17 min | #237 / #248 check red at build | gh pr checks green first; the new build runs all unit files | orchestrator |
| 3 | Label relay, no auto trains | #249 missed train 32 by minutes | auto mode blocks gh pr edit --add-label (laptop); auto-train not registered | allow rule on the laptop; register auto-train after 4.81.0 | Michael / orchestrator |
| 4 | Player idle, AF7-AF9 gated | spare list empty | gated on Michael walking AF0-AF6 | earlier walk on a preview of #247 | Michael |
| 5 | Desktop capacity unused | CPU 27-37% vs 80% | no desktop e2e (19:15) | desktop as queue overflow slot (JOBS=1) when backlog > 3 | Michael |

## 2026-10-23 ~23:08 (orchestrator, Michael: "clear the queued tests faster")
Laptop queue 26 open requests / ~135 suites while train 36 held both laptop slots. 8 requests (~36 suites) sat at shas
whose branch had since changed real code (verdict cannot count): 0981cae6, 6eb6a863, 842c4140, f078e49d, afea69d3,
961ca660, 1fcab6e3, 0356bd58. Guard AI / Sector Ops requests ask 6-10 suites each against the "1-2 suites" rule.
Oldest-first pick runs the stalest requests first. Fixes: leads withdraw superseded requests (told 23:08); Test
Runner builds auto-supersede + newest-first per requester + stale-claim drop; desktop second slot 4192 (cc56baed) and
4191 CPU gate 80 (Michael 23:05) go live at the desktop service's next restart; leads held to 1-2 suites per non-net PR.

## 2026-10-24 ~21:00 (orchestrator, Michael: "a lot of bottlenecks caused by trains")
Trains 44-64 (13 h): green train 14-25 min (CI ~15 min, full e2e 705-768 s); train-ready label -> master median ~43 min, tail 154-227 min. 5 of 20 trains closed (11-61 min each).

| # | Wait | Cost | Cause | Fix | Who |
| --- | --- | --- | --- | --- | --- |
| 1 | Failed trains | 5/20, 11-61 min each for every member | 3 process bugs (fixed #293, #330); 2 member bugs caught only in the train; auto-train then waits for the orchestrator to pick the culprit | auto-drop on failure; #251 affected suites before the label | orchestrator (agent) / Test Runner |
| 2 | One train in flight | ~half the 43 min median | next train built only after release | overlapping trains (N+1 on N, other machine) | orchestrator (Opus plan) |
| 3 | 5-min task ticks | up to ~15 min per train (pickup, verdict -> release, release -> build) | auto-train and desktop queue tasks every 5 min; desktop queue still follows origin/feature/laptop-queue | auto-train 1 min (done 21:00); #335 install-task commands | orchestrator / Michael |
| 4 | Train-ready PR conflicting with master | #313 227 min | owner must merge master | cron flags CONFLICTING within 10 min | orchestrator |

## 2026-10-24 ~21:10 (Opus audit 20:30-21:04)
Train 64 went to the desktop (~2x slower) because a 30-min laptop alone run (guard-cap, claimed 18 s after #323 was labelled) pushes no heartbeat, so desktopTrainGate read the laptop as silent after 10 min; the desktop then preempted its own guard-ai coop4 run at 15/15 shards (52.7 desktop-min lost). Build waited 5 min on heavy.lock (trains 63, 64). Fixes: open laptop claim = alive; no preempt past ~80% weight; trainSoon holds alone runs while a green train-ready PR waits; alone runs yield between steps / preempt under 10 min (Test Runner, feature/overlap-queue); heavy.lock wait at build (checked in #344's review). The desktop re-register dropped LQ_DESKTOP_CPU=80 / LQ_DESKTOP_BACKLOG=0: restored on the task 21:12; install-task.ps1 to keep them (Test Runner).
