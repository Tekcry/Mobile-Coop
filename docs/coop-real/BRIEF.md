# coop-real - BRIEF

Job lead: Night Shift | Player Build. Branch `feature/coop-real`, folder `C:/NightShift/Mobile-Coop-coop-real`, off
master 4c864861 (4.96.0). A test job, not refining (CLAUDE.md "Current goal").

## The ask (orchestrator, 2026-10-24 ~21:35, ROADMAP on origin/feature/menu:61)
"coop-real (... from the process audit: 5 of Michael's ~30 walk finds were co-op bugs every test passed): Player Build
plans an input-only co-op e2e (real client inputs, no state pokes, background tab, rejoin after the host moved, every
offered prompt changes state, one sound per shot, client actions reach the host, E2E_NETSIM=typical). A test job, not
refining."

## The five walk finds (Michael's words; source)
| Id | Words | Source | Fix on master | Why tests passed |
| --- | --- | --- | --- | --- |
| P6a | "coop partner has takedown option when host is holding hostage, but it doesnt do anything" | WALK-4.72-REPORT.md:11 (origin/feature/menu docs/orchestrator) | coop-walk-fixes, train 30 | e2e-coop teleports the host 1.1 m beside the hostage and calls `td.start` (scripts/e2e-coop.mjs:1189-1200) |
| P6b | "if coop partner holds guard, host doesnt have option for takedown." | same :11 | same | same |
| P7 | "coop player shooting doubles audio and doesnt sound suppressed." | same :12 | coop-walk-fixes (`net/remoteShots.ts`) | e2e-weapon-audio is one page; no two-page voice count |
| S2 | "host shot out light, coop game light turned off too, but coop shooting lights does nothing for either game." | same :34 | Sector Ops only (`lampShotOk`, 4a2702b0); Course mode is NOT wired: coopClient.ts:188-197 and coopHost.ts:202 are `sector` only, coop.md:465 "Course mode unchanged", marlow-final/COOP-GAPS.md:34 | no suite fires a client round at a Marlow lamp |
| R7 | "coop client disconnected while multitasking and it spawned him back at the start away from the host while the host was in s3 ... Rejoining still starts at the start" | WALK-4.82-REPORT.md:11 | placement: coop-rejoin #269 + #282 (4.85.0); the drop itself: not addressed (docs/coop-rejoin/REPORT.md:57-65) | no e2e backgrounds a tab; every rejoin test calls `__coop.leave()` on the same page (e2e-coop.mjs:552-580) |

Adjacent, not counted: 4.82 item 4 spawn overlap (slot 1, coop-rejoin X4) and 4.72 M2 co-op restart (Marlow).

## Goal
One input-only two-page suite `e2e-coop-real` on Marlow Yard (`ctcourse`, Course) under `E2E_NETSIM=typical` that fails
on these five classes of bug without a per-bug test, lands with today's failures marked KNOWN BUG, and the fixes that
clear the marks.

## Limits
- Test code in `scripts/` plus the smallest runner / e2e-lib changes; game code only in the fix slices (PLAN F1-F4).
- Wall time: three parts, each <= 2 min on its own laptop slot (`E2E_GPU=1`, CLAUDE.md:66-68; the laptop queue's pr
  requests), so the suite's wall time is its longest part (PLAN-CHECK 14).
- No refining: a dead prompt or bug the sweep finds outside this job's five goes to its owner's list, not fixed here.
- Wire changes do not bump `PROTOCOL_VERSION` (the train does).

## The input line (what "no pokes" means)
Allowed to DRIVE: `__pad` (scripts/e2e-lib.mjs:156-187, read by src/input/gamepadSource.ts:68-100), `page.keyboard` /
`page.mouse` (src/input/keyboardMouseSource.ts:66-145, with `fakePointerLock` e2e-lib.mjs:44-56), the boot URL
(`?autostart=ctcourse&mode=course&net=local&netsim=`), page lifecycle (CDP freeze / visibility, reload, close, a new page),
and `stepHeadless` only on a page that stands for a visible window whose rAF stalled (time, not state). Allowed to READ:
anything, and pass-through wrappers that count calls (`events.emit`, `weaponAudio.shot`) without changing behaviour.
Not allowed: teleports, `onUse`, `takedown.start`, `applyDamage`, `input.state.set` (bypasses the device layer),
`weapons.switchTo`, `cam.yaw` writes, `courseBay` / `session` writes, `events.emit` calls. Why: every walk bug sat
behind a poke that skipped the step Michael's hands take (reach, facing, menu row, real ray, real tab life).
Enforced: every `page.evaluate` goes through the lib's `read` (read-only) or a `drive*` helper; K1 greps for the rest.

## Assumed decisions (Michael not needed; undo in brackets)
- A1 Map: Marlow Yard A1 + A2 from the lounge (no `courseBay` poke); A1 has the passive grabbable `a1-checker`, the
  apron flood lamp (group 11), doors and the wicket bolt (no placed body: the body case makes one); A2 the taught carry. [Pick other sets in PLAN H1.]
- A2 The first boot by the autostart URL counts as launch config, not a poke; the lobby path stays e2e-coop's. Rejoin
  goes Michael's way: B3 reloads without autostart and picks "Rejoin <code>" by pad, B4 (new tab) joins by code by pad
  (PLAN-CHECK 5). [Click the lobby.]
- A3 Host on keyboard + mouse, client on the pad, so both device paths are real. [Swap in `real-lib` `who`.]
- A4 Netsim gates: `E2E_NETSIM_GATE=1` keeps e2e-lib's `assert` failing under netsim (today it only reports,
  e2e-lib.mjs:387-395); the runner sets `E2E_NETSIM=typical` + the gate for this suite. [Drop the runner env entry.]
- A5 KNOWN BUG = an expected-fail case in the suite: only an assert matching the mark's `expect` text prints
  `KNOWN BUG <id> -> <slice>` and does not fail the run (any other throw fails it); a pass prints `UNEXPECTED PASS <id>`
  and fails it, so the fix slice removes the mark. Marked: only failures seen on 2 seeded laptop runs; sweep finds outside
  the five get `T1-<row>` marks naming the owner's ROADMAP item (PLAN-CHECK 9, 10). [Delete the marks.]
- A6 A test-only drop limit `&netdrop=<s>` on `?net=local` (localTransport.ts:79, 60 s today) so a frozen tab drops in
  ~8 s, as a real WebRTC peer does. [Remove the param; the case then waits 60 s.]
- A7 Under automation the bgTick worker is off (`navigator.webdriver`, src/net/bgTicks.ts:10); the suite launches with
  `--disable-blink-features=AutomationControlled` and without e2e-lib's three background-throttling flags
  (e2e-lib.mjs:21), so a hidden page behaves as Michael's does; the H1a probe runs both ways (PLAN-CHECK 6). [Drop both.]
- A8 "Changes game state" = the row kind's expected key (PLAN "The generic checks" table; unlisted kinds: keys beyond a
  pre-row control window) moves, on the host for a client row, within `PROMPT_S` = 3 sim s (takedowns 6 s) after the
  row's hold or finishing strike (PLAN-CHECK 1, 15). [Change `PROMPT_S`.]
- A9 Fix ownership: this job fixes F1a / F1b / F2a / F2b / F3 / F4 in `src/net` / `src/game` / `src/audio` (Opus), PR B
  before #317 coop4. Dead prompts outside the five go to their owner (T1 marks): map data / sets to Marlow Build, guard
  reactions to Guard AI. [Hand a fix to its owner instead.]
