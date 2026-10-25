status: open

# campaign J9 S2: guards notice a held shutter (Opus 5.5)

Cloud (lead ruling ~23:30: desktop CPU 100%; Opus builder; two Opus checkers follow on the desktop). Base: origin/feature/mission-engine
e3798754461005ecd7e95803842138850646d111 (B0 is in it; cut from that sha even if the branch has moved). New branch:
feature/tallow-s2. Lead: Night Shift | Campaign Build. Read `git show origin/master:docs/systems/agent-preamble.md`
(desktop: worktree `C:/NightShift/Mobile-Coop-tallow-s2` and its guard; cloud: "Cloud sessions") and the code hard rules
in `git show origin/master:CLAUDE.md` first. Plan: `docs/missions/slices/J8-J9-PLAN.md` on the base (A17, A18, A27,
section 6 "S2 the notice", section 16 "Brief S2"); this brief wins where they differ.

## Only these files
- `src/game/stealthSystems.ts`: one new private method, its timer field, one call in `fixedUpdate`, one reset line in
  `resetForRestart`, and the imports they need. Nothing else.
- `src/game/kit/shutter.ts`: the pure helper `shutterNoticedBy`, the `noticed` field on `ShutterDevice` (and its
  initial value in `newShutterDevice`), and `resetShutter`. Nothing else.
- `tests/shutterNotice.test.ts` (new).
- `tests/kit/shutter.test.ts` (only if a helper test fits there better; existing cases unchanged).
Not yours: `src/world/shutterDoor.ts`, `src/world/world.ts`, `src/game/teamController.ts`, `src/game/gameState.ts` (S1),
`src/ai/**` (Guard AI), `src/net/**`, any map file. No changelog fragment (the lead's).

## Why
R39 (Player conformance) / J9: a held-open shutter is invisible to guards today. G41 makes a calm guard notice a door
the player left open; a shutter held open is the same story (A17: by sight, not by sound). The hooks exist and are
unused: `SHUTTER_NOTICE = { range: 9, cos: 0.2 }` (`shutter.ts:84`), `shutterNoticePoint` (`:286`),
`ShutterDevice.visible` / `opens` (`:104-118`, kept by `markShutterView` `:273-278`).

## Read first
DECISIONS G41, G44, G143 (`git show origin/master:docs/DECISIONS.md | grep -n -E "^.{0,6}G(41|44|143)\b"`);
`src/game/stealthSystems.ts:20-40`, `:76-90`, `:520-540` (`resetForRestart`), `:610-680` (`noticeOpenDoors`,
`fixedUpdate`); `src/game/kit/shutter.ts:20-30`, `:80-165`, `:240-295`; `src/game/kit/registry.ts:50-130` (`KitDevices`,
`g.team.devices.list`); where `GameState` calls `stealth.fixedUpdate` (`src/game/gameState.ts:1989`) and whether
`stealth` exists on a co-op client (the notice must run on the host / solo only, as the door notice does); Player
conformance R39 (`git show origin/master:docs/conformance-player/CONFORMANCE.md | grep -n R39`).

## What to build
1. `shutter.ts`: `export function shutterNoticedBy(d: ShutterDevice, ex: number, ey: number, ez: number, yaw: number):
   boolean`: true when `d.visible`, the guard's plan distance (`hyp2`) to `shutterNoticePoint(d)`'s x / z is within
   `SHUTTER_NOTICE.range`, `Math.abs(d.y - ey) <= 1.5` (same storey, as the door rule), and the guard faces it:
   `dist <= 0.5 || (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / dist >= SHUTTER_NOTICE.cos` (the door rule,
   `stealthSystems.ts:633-635`). No allocation: a module-level scratch point for `shutterNoticePoint`.
2. `shutter.ts`: `ShutterDevice` gains `noticed: number` (doc: "the `opens` count a guard last noticed; -1 none (J9 S2,
   A18)"); `newShutterDevice` sets `noticed: -1`, so the memory is preallocated with the device (no Map, nothing built
   per tick). `export function resetShutter(d: ShutterDevice): void`: drop shut at once (`open` 0, `phase` 'closed',
   `rate` 0, `user` '', `visible` false, `openFor` 0) and `noticed = -1`; leave `opens` as it is. Doc: "a section
   restart puts the shutter back (J8-J9 A27); S1's `TeamController.resetKit` calls it and ends the team move's own run".
3. `stealthSystems.ts`: a field `private shutterNoticeT = 0;` and `private noticeOpenShutters(dt: number): void` with
   **its own timer** (counted down every fixed step, fires every `DOOR_NOTICE_EVERY`; do not reuse `noticeT`, which only
   counts inside `noticeOpenDoors`, itself called only while a player-opened door exists, `:665`). It returns after one
   length check when `this.g.team.devices.list` is empty. Index loops only (no `for...of`, closures, `Map`, new arrays):
   for each device that `isShutterDevice`, is `visible` and has `opens !== noticed`, the first enemy that is alive and
   not alerted (as the door notice's `!e.alive || e.alerted` skip), passes `shutterNoticedBy`, and has a clear line
   `this.g.ballistics.clear(eye, point, MASK.SIGHT)` (reuse the preallocated `noticeA` for the eye at `e.pos.y + 1.6`
   and `noticeB` for `shutterNoticePoint`), calls `e.hear(d.x, d.z, SHUTTER_NOTICE.range + 2)` and sets
   `d.noticed = d.opens`. Call it from `fixedUpdate` beside the door notice: `this.noticeOpenShutters(1 / 60);`
   (unconditional; the method's own length check is the cheap exit). If `stealthSystems` runs on a co-op client too,
   gate the call the way the host-only parts of `fixedUpdate` are gated and say so; if no such gate exists, stop and
   report. `resetForRestart` also sets `this.shutterNoticeT = 0`. A comment cites G41, R39 and A18. Nothing grows or
   allocates per tick.
4. `tests/shutterNotice.test.ts`: the helper (in range and facing: true; behind; 9.5 m away; 2 m above; `visible`
   false: false), the once-per-opening rule (a stub host with one calm guard and one held device: the first fire calls
   `hear` once and sets `noticed`; later fires in the same opening do not; after the device closes and opens again
   (`opens` + 1) it fires again), a notice **with no door open anywhere** (the own timer runs: `playerOpened` empty), a
   blocked sight line gives none, and `resetShutter` (shut, `user` '', `visible` false, `noticed` -1). Test the method
   through the smallest stub that compiles (a `StealthSystems` built on a fake `g`, or the loop factored as an exported
   pure function in `stealthSystems.ts` that the method calls); say which in the report.

## Checks (tsc and these vitest files only; no e2e, no GPU, no npm run check)
- `npm run typecheck:fast`
- `npx vitest run tests/shutterNotice.test.ts tests/kit/shutter.test.ts tests/kit/registry.test.ts --maxWorkers=2`
- `npx eslint src/game/stealthSystems.ts src/game/kit/shutter.ts tests/shutterNotice.test.ts`
- Pending PC run (the lead requests it on PR S): laptop `e2e-coop e2e-netmove e2e-ctcourse` (the door notice must be
  unchanged: `e2e-ctcourse` A7 data hall) and, after S3 / S4, `e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl`.

## Done
- Checks green; the door notice code path unchanged; with no shutter devices the new method returns after one length
  check; the report states that nothing grows or allocates per tick.
- Commits on feature/tallow-s2 prefixed `tallow S2:`, trailer "Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>"; `git add <file>` per file, never `-A`. Never merge, rebase, force-push, or push to
  feature/mission-engine.
- Coordination for the lead: Guard AI Build is offered one of PR S's two checkers (not blocking);
  `origin/feature/guard-rules` (PR #450) edits `stealthSystems.ts` at master `:589-596` only (the response team), clear
  of this method and its call.

## Report (append below, then set line 1 to `status: done feature/tallow-s2 <sha>`)
What changed, the host-only finding, which test seam you used, test counts, check results, deviations, "pending PC
run" for the laptop suites.
