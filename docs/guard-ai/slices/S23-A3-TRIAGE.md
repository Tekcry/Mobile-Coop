# S23 A3 triage: "LANTERN's 'the other way round' line reaches the client" (e2e-ctcourse:2)

Opus triage agent, 2026-10-24 ~01:30. Failure: trains 35, 37, 38 (every train with #254 S23), `scripts/e2e-ctcourse/a3OfficeRange.mjs:363`
(master file; not on `feature/guard-ai-s23`), deterministic (6 of 6 runs incl. reruns: `C:/NightShift/scratch/laptop-queue/runs/train-3{5,7,8}-*`).
Everything before it passes: the relay jams, "the relay cost no send-back", `a3-far1` and `a3-in` tick.

## Verdict
**S23 is right; the A3 scenario (Marlow's test) relies on the pre-S23 nearest-only blind spot.** Same class as the A7 verdict
(`4298148b`, fixed by Marlow's cabinet `4aa56900`). No `src/ai` change: the suggested alerted-fallback change cannot affect this
(below). Not proven by a trace yet: three laptop runs are queued to confirm (below).

## Mechanism (master + S23 line numbers)
1. The radio is held while any guard is in combat: `src/game/modes/courseMode.ts:615-617` (`!g.enemyMgr.anyAlerted`). The swap
   line is queued at `a3-in` (`src/world/maps/ctcourseSets/a3OfficeRange.ts:340`), so 90 s without it = the cleaner in combat
   for (nearly) the whole wait.
2. Step 4 ("the window miss") ends with a send-back (`a3OfficeRange.mjs:335`): the camera reached stage 2 on the client in the
   corridor (88.25, 10.75). Since guard-ai S17 that is a device incident: `src/game/ctDevices.ts:1071-1074` (`onCamera` ->
   `hooks.alertAt`) -> `courseMode.ts:292` -> `EnemyManager.deviceAlert` (`src/ai/enemyManager.ts:828`) -> the calm cleaner is
   sent, hurrying, to search the corridor (`enemyManager.ts:2075` -> `Enemy.respondDevice`, `src/ai/enemy.ts:1369-1379`). After
   step 3 the test waits for him to be calm ("A3 calm", `:317`); after step 4 it does not: the relay (step 5) starts at once,
   with the cleaner on his way into the corridor (office 3's corridor door, x 91.4-92.6, or office 2's recess door). The set doc's
   "the cleaner never enters the corridor" (`docs/marlow-final/sets/a3OfficeRange.md:21`) predates S17.
3. During the relay the host stands at the west post (78.5, 10.75), lit (lobby 0.6), on the corridor's axis: in plain view of
   anyone in the corridor. The client is nearer to a guard in the corridor's east half and hidden from him: first at the hide
   spot against the recess's camera-side (east) cheek, then in the east lobby south of the archway (behind the x 97 wall).
4. Before S23 (`TARGETS.all` false path) the guard perceived only the nearest live player: the hidden client, so no ray ever
   went to the host and he saw nobody; the search ran out, the radio flowed. Since S23 (`enemy.ts:1991`, `pickTarget`) a calm or
   searching guard fills on the best seen player: the host in plain view -> combat. In combat `seen = this.los`
   (`enemy.ts:2064`) and the target is the one he sees (`targetPick.ts:63-74`); the host never moves (he holds the jam until
   `:373`) and cannot be hurt (`damageMul` 0), so the cleaner fights him from cover for the whole 90 s (`ALERT.lostSight` 12 s,
   `alertState.ts:184`, never runs out). This is exactly S23's goal case (brief "Goal", `coopPerception.test.ts` (a)): "a hidden
   nearer partner no longer blinds a guard to the one standing in his light" (G41 / A143).

Why the suggested fix (prefer the nearest live player over a lost `cur`) does not help: it changes only the case where he sees
nobody; then `seen` is false whichever player he targets, and in combat without sight he chases the shared LKP
(`enemy.ts:2508`, `:2795`), not the target. Combat is held only by a real line of sight, here to the host.

## Proposed test fix (for Marlow, `scripts/e2e-ctcourse/a3OfficeRange.mjs`, after `await sentBack('A3 window miss', n0);`)
Wait out the camera alarm's search like after step 3: both players into the L2 holding room behind the shut far door, wait for the
cleaner calm (unaware / cooldown) and back in the offices, then the host to the west post and the client to the send-back spot.
Exact code: `feature/guard-ai-s23-a3test` 829cffe1 (`git show 829cffe1`); it reuses the step-3 helpers (`L2_HIDE`, `l2Far`,
`l2Aid`, `traced`). The alternative "fix ours" (hide the host from a guard in the corridor) would undo S23.

## Trace note for Marlow (the swap-line wait)
`feature/guard-ai-s23-train` 5d1331fe (test-only) wraps `:363` in `traced('A3 swap line', ...)`, adds to `npcDiag` the guard's
target id, `los`, `seesIndex(0/1)`, incident and mode, device-alert count and `sinceSeen`, and a host-step watch for his first
combat since step 4 (place, yaw, both feet, target, sight, incident), printed at the timeout. Worth keeping in the real file.

## Tests
- `tests/targetPick.test.ts` 7/7, `tests/coopPerception.test.ts` 5/5 on master + S23 (the clean merge, 83a45464).
- No `src` change on `feature/guard-ai-s23`, so tsc / unit / the S23 laptop sets (s23-coop, s23-regress) stand.

## Laptop requests (queued; not waited for)
All on test-only branches = origin/master cd229330 + S23 dc964d15 (clean merge) + the trace; the queue runs a sha as is, and A3
is not on `feature/guard-ai-s23`. None of these branches goes to master.
| Set | Request id | Branch / sha | Suite | Expect |
| --- | --- | --- | --- | --- |
| s23-a3fix | 20261023T143232-night-shift-guard-ai-829cffe1-3ae5 | feature/guard-ai-s23-a3test 829cffe1 (scenario fix) | e2e-ctcourse:2 | PASS |
| s23-a3probe | 20261023T143237-night-shift-guard-ai-60f85ea5-dcfd | feature/guard-ai-s23-probe 60f85ea5 (`TARGETS.all` false) | e2e-ctcourse:2 | PASS |
| s23-a3diag | 20261023T143243-night-shift-guard-ai-5d1331fe-c313 | feature/guard-ai-s23-train 5d1331fe (trace only) | e2e-ctcourse:2 | FAIL + trace |

Reading them: probe PASS + diag trace showing the cleaner in combat with target = the host's id, `sees` [true, false], from the
corridor, after a device incident -> mechanism confirmed; s23-a3fix PASS -> Marlow applies the fix to master and #254 goes back
in the train unchanged. If s23-a3fix fails, its trace (`A3 calm after the window miss` or `A3 swap line`) says where.
e2e-coop / e2e-stealth-ai were not requested: no AI code changed.

## Open
- Marlow: apply the step-4 calm wait (or an equivalent) on master; keep the swap-line trace.
- Worktrees made here: `C:/NightShift/Mobile-Coop-guard-ai-s23-train`, `-s23-probe`, `-s23-a3test` (node_modules junction to
  `-s23`'s in -train); delete with their branches once the verdicts are in (Michael's call for the branches).
