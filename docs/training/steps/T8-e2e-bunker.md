# Step T8 - e2e-bunker and the full run (Block D)

Model: implementer opus, checker opus (two pages over the net). Deps: T7b (Block C done). Runs e2e-coop and e2e-netmove.

## Read
- FEATURES.md (every row with a bay; the check column; section 11 per-player coverage)
- BAYS.md each bay's "Sequence" and "Co-op split and gate"
- scripts/e2e-course.mjs (T1b's two-page pattern), scripts/e2e-bunker.mjs (T6 / T7b sections), scripts/e2e-lib.mjs
  83-110, 194-271 (launch, openPage, BTN, press, stick, assert)
- scripts/run-e2e.mjs 20-60 (REQUIRED, COVERS); scripts/perf.mjs 70-100 (MAP, params)

## Task (decisions)
1. Grow `scripts/e2e-bunker.mjs` into the course suite: two pages `?net=local&autostart=bunker&mode=course` (host P1,
   client P2). Moves use teleports to debug points plus scripted inputs (pad buttons, sticks) where the verb itself is the
   check; a long walk is never simulated when a teleport and a short scripted move prove the same thing.
2. Per bay (one `section(...)` each, timed, skippable with `--only=B5`):
   - every gate in its now form, once with the host acting and once with the client acting where the gate allows;
   - the airlock: refuses one player, refuses with one downed, cycles with both, near door stays locked, both pages agree
     on door state within 0.5 s, the checkpoint is the new airlock;
   - the bay's "(both)" verbs performed by each player at least once, read from `window.__course` verb log (traversal
     attach kinds, team moves, takedown kinds, gadgets, weapons), with the remote pose checked against the owner's
     (joints within 10 cm, the e2e-netmove limit) for one verb per bay;
   - B4 team moves (brace, boost, human ladder) between the two pages; B7 dual takedown within 1.5 s; B9 pair gate within
     1.0 s (and refused at 1.5 s).
3. A forced restart: in B5 damage both players down; both respawn in A4's checkpoint, B5's squad respawns, MB is back on.
4. The full course order: a final section runs B1 -> L9 using the gates only (teleports between gate spots allowed) and
   checks `courseDone` and the results screen on both pages.
5. Register `e2e-bunker` in run-e2e REQUIRED and COVERS (src/world/maps/bunker*, src/game/course, courseMode).
6. `scripts/perf.mjs`: a `MODE=` env (default as now) so `MAP=bunker MODE=course` works; start the perf scene in B9 with
   its squad (a `PERF_POINT=` debug point env, default none).
7. Per-player coverage: the suite fails if a FEATURES "(both)" row that `exists` today was not done by both players.

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker e2e-course e2e-coop e2e-netmove`; then the full
`npm run e2e` in the background (all REQUIRED suites green except known flaky and pre-existing); the perf trend with
`MAP=bunker MODE=course`; PC-PASS rows 2 and 3 with `E2E_GPU=1` (real numbers on this PC, against the budgets).

## Commit
"training T8: e2e-bunker course suite, perf on the bunker". Docs: docs/systems/testing-tools.md (the suite and the perf
envs), LOG, STATE, PC-PASS results.
