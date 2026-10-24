# visual-gate VG2 - check (fresh Opus checker)

Verdict: FIX

Checked: `feature/visual-gate-vg2` @ cb0ba57c (one commit on 0b7f46f4) in `C:/NightShift/Mobile-Coop-visual-gate-vg2`,
against `briefs/VG2.md` (Contract, functions, e2e-visual, tests, acceptance), PLAN sections 1, 3 (pin order :94-114),
7 (:164-176), 8 (parallel table :180-192), `checks/c0-plan-check.md` M1 / M2, `checks/vg2-build.md`. Reused code and
the page fields read at origin/master 1dc3ecfa.

## Must fix

M1. Late-spawned guards are never stubbed or parked for the shot they appear in (determinism hole).
`scripts/visual-gate/harness.mjs:169-184` places only the guards alive when `settle` starts; the wait (:189-193) and
the gap before `pin` (a separate evaluate, `shoot` :356-359) run more fixed steps. Sector modes spawn guards during that
time: `SectorMode.fill()` runs every 0.5 s of sim time (origin/master `src/game/modes/sectorMode.ts:1267-1271`) and
spawns a pending guard once the player is >= 7 m from its slot (`SPAWN_MIN_DIST` :127, :873-878) - exactly what the
teleport does - and an alarm (a camera or laser sees the teleported player) queues alerted reinforcements that spawn at
any distance (:878, :954-960). Such a guard has its brain, walks, can raise a torch and push the rig door open, and is
only parked at the NEXT shot's settle. Spawned during the wait with a torch, `othersLit` throws (loud); spawned without a
torch, or after the wait, it can stand in frame and change the pixels silently, at a wall-clock-dependent place.
Fix: mark every placed guard (e.g. `e.__vgPlaced = true` next to the stub, :174); after the wait loop re-read
`em.enemies`, and when an alive non-quadruped guard is unmarked, stub + park it (`torchOverride = false`) and wait
another `target` of sim time (at most 3 rounds, then throw `settle: guards still spawning`); in `pin` (still one
synchronous evaluate, :232-261) throw `pin: unplaced guard(s) N` when any alive non-quadruped guard is unmarked, so a
spawn between settle and pin fails the shot instead of shooting it. Add `late: number` to the returned settle object
only if the Contract allows (else count it into `guards`).

## Verified (holds)
- Contract block: lines 1-13 of `harness.mjs` are byte-identical to `briefs/VG2.md:29-41` (one extra `Rig` typedef
  after it, deviation 2, harmless).
- Pin order = PLAN :94-114 / C0 M1: `settle` (one async evaluate) sets `timeScale = 1`, `photoFreeze(false)`,
  `photo-mode` off, `team?.end?.(true)`, teleport, `vision.set('off')`, stubs + parks every alive non-quadruped guard,
  places the rig guard with `yaw` and `torchOverride = torch`, all others `torchOverride = false` (:160-184); waits
  >= max(0.3, (torches + 1) / 60) s of `g.time` with a 20 s wall cap (:187-193; `updateTorches` runs every fixed step,
  enemyManager.ts:3501, `FIXED_DT = 1/60` loop.ts:5); reads meter and field in the same task (:195-196); asserts
  timeScale 1, rig `hasTorch`, no other torch, rig door nearest `doorAt` shut and <= 1.5 m (:199-225). Only then `pin`
  (one synchronous evaluate, no await: timeScale 0, flicker 1 + `flickerVersion++`, sway 0 + `swayVersion++`,
  photoFreeze, photo-mode, rigs hidden, :232-261), aim, converge, timeScale 0 re-assert (:368-369), project, capture.
  On -> off is two full `shoot` calls (e2e-visual.mjs:85-86), never a toggle under the pin.
- Campus rig guard (C0 M2): `settle` throws `settle: rig has no guard` (:171) when no alive non-quadruped enemy
  exists, so a `sectorGuards=0` query fails loud; the query itself is VG3's.
- Page fields exist at origin/master: `loop.timeScale` (loop.ts:31, :184), `lights` array indexed by id,
  `flickering` getter, `flicker`, `swx/swy/swz`, `flickerVersion`, `sway`, `swayVersion` (lights.ts:150-174, :246),
  doors `cx/cz/open/target/list` (doors.ts:77-108), `torches` / `hasTorch` (enemyManager.ts:250, :1507),
  `torchOverride` / `yaw` (enemy.ts:1882, :270), `teleport(feet, yaw?)` (playerController.ts:370), `photoCamera` /
  `photoFreeze` (gameState.ts:2259-2265), `bodyLevel(x, feetY, z, height)` (lightField.ts:240),
  `lightBake.sections.done` (sectionJobs.ts:85).
- Zero src diff: `git diff 0b7f46f4 HEAD --stat -- src` empty. Files touched = the brief's four exactly.
- Headless only: `launch` from e2e-lib (headless unless `E2E_HEADED`, which the runner refuses; `fakePointerLock` init
  script; e2e-lib.mjs:31-41, :87-101). No `bringToFront`, click, focus or pointer lock in either script.
- No network / CDN: the only fetch is a `data:` URL inside the page (decode); no Babylon import in node code, e2e-lib
  imported lazily (`harness.mjs:108-111`).
- Determinism otherwise: fixed step via the game loop, convergence = full-frame 16 x 9 grid, last 3 deltas < 0.004,
  30 warm frames, 8 s cap (:300-319); timeScale re-asserted after converge.
- M0 command (`vg2-build.md:105`): every flag is one `request.mjs` reads (origin/master `--sha`, `--alone`, `--set`,
  `--requester`, `--note`, `--step`; `requestProblem` needs a non-empty steps list: met). The alone step runs as one
  `shell: true` line on `ports[0]` with `E2E_PORT` and `E2E_GPU=1` (service.mjs:868-870, :480); `serve.mjs` passes
  `process.argv.slice(2)` to the script and returns its exit code (serve.mjs:16-18). `--png` matches the brief's line
  (PLAN :175 lacks it; harmless). `--sha` may be given as `origin/master` too (request.mjs resolves refs).

## Polish
1. `aim` (`harness.mjs:265-277`): a scene not ready after 30 s is silent; carry `ready` into `ShotRaw` / the JSON row
   (VG5) or throw, so a shot on an unready scene is visible in M0.
2. Alarm side effects: a camera / laser that sees the teleported player raises the alarm stage (lockdown doors,
   reinforcements). Record `g.mode?.run?.alarm` and `g.mode?.reinforced` in the settle result (VG5) or assert they do
   not change across a settle; M0's JSON would then show it.
3. The meter is read at whatever flicker phase the settle stopped on while the image is shot at flicker 1; VG5's
   meter = field parity reads both at the same instant (fine), but a parity card vs meter comparison should note it.
4. `e2e-visual.mjs:89-94` pins once before the cards; the cards then render with the last shot's player position and
   any unparked late guard (see M1) - fine for timing, VG5 should settle first.
5. Quadrupeds are neither stubbed nor parked (brief); they push doors and walk into frame. Park them too when a map has
   any (builder's open item agreed).

## Runs (this check; desktop CPU waited down from 99% to 79% first)
- `npx vitest run tests/visualGateHarness.test.ts --maxWorkers=2`: 1 file, 13 passed.
- `npm run typecheck:fast`: exit 0, no output.
- `node --check` both scripts: ok. `npx eslint tests/visualGateHarness.test.ts`: exit 0.
- `git diff 0b7f46f4 HEAD --stat -- src`: empty. No e2e, no GPU, no build run.
