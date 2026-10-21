# marlow-bays - state

B + M (cloud): see "Slices B + M" below; PR to master open, waiting on the orchestrator's PC full e2e and GPU look.
Track A (Course Ready Build), 2026-10-21 ~19:30:
- Merged: slice T #82 (4.35.0), T1a #83 (4.36.0).
- T2 (tuner redesign) = PR Tekcry/Mobile-Coop#86, branch `feature/marlow-tuner-t2` (worktree
  `C:/NightShift/Mobile-Coop-marlow-t2`), head e4105dea; laptop short check passed; checker fixed; full e2e running on
  the desktop at E2E_JOBS=1. Shots: `t2-layout-2026-10-21.png` (Michael OK'd), `t2-final-2026-10-21.png`,
  `t2-stage-light-before-after.png`.
- Item 26 (tuner on phones, M21 exception for the tuner and Anim Studio only) building on `feature/tuner-phone`
  (worktree `C:/NightShift/Mobile-Coop-tuner-phone`, from T2 e4105dea; rebase on master after #86). Phone-size
  screenshot to the orchestrator before its PR.
- Item 23 (key timing) PARKED at 2781d490 on `feature/marlow-key-timing` (worktree `C:/NightShift/Mobile-Coop-key-timing`,
  from T2): retime logic, live preview, export via the key `phase` field, Keys tab controls, e2e steps. Left: docs, the
  e2e run, and (orchestrator ~19:25) the key `time` bake rule + keyMetaText write in `src/anim/tuneBake.ts` (track B's
  file, done by A, minimal, keys-only, named in the PR body). Then item 25 (add / delete keys). Tell Menu Notes (track
  C) when 23 / 25 open and land; keep the optional-channel path in key_clip.py / build.mjs.
- T1b is track B (CT Core), T3 track C (Menu Notes). Bays J after the animation tracks.
Open: none.

## Slices B + M (cloud session "Night Shift | Bays Cloud", 2026-10-21)
Branch `feature/marlow-bays` (master 4.35.0 merged). One PR for B + M. Cloud ran check and the logic e2e only; the GPU
look (item 6's grid, station 3) is pending PC run, as is the full e2e (the orchestrator runs it on the PCs).
Found and fixed:
- Item 1 (co-op hold slow / odd): on the joiner the held guard is an `EnemyPuppet`, which had no `setSolid`, so the
  takedown's `setSolid?.(false)` did nothing; the puppet's solid capsule 0.33 m in front kept shoving the joiner's
  character controller (eaten forward speed, sideways shoves, jitter). No double speed cap, no host correction. Fix:
  `EnemyPuppet.setSolid` (restored on release / deny), the partner's hostage non-solid there too (`remoteHeld`); on the
  host, the joiner's hostage is placed from the joiner's drawn (interpolated) pose, not its raw 20 Hz state (it ran
  0.1 s ahead in steps). Solo speeds untouched (`GRAB.speedCap`, `BODY.carrySpeed`). e2e-coop asserts the joiner's
  held guard is not solid.
- Item 2 (station 2 bolt): not the client path (that worked). Since 2026-10-20 the host's own presses pass `'local'`,
  and `CourseMode.idx` read anything but `undefined` as P2: the host's Unbolt was tested on the joiner's feet (refused
  until the joiner was over too: "worked with both players on that side") and the refusal banner went to the joiner.
  Fix: `courseUser()` (`courseDef.ts`). Also fixes the host's hold consoles, pickups and finish credit, and solo
  unbolt. The e2e helpers called `onUse(it)` with no `by`, which hid it; they now pass `'local'` like the game.
- Item 6: the flashing red surround was the frame-edge pulse while a camera sees a player; removed (grid only). The red
  lines on station 3's floor are the camera's +-30 deg sweep edges painted on the floor (course spec M2,
  `sweepLines` in `ctcourseBunker.ts`): a deliberate training mark, not debug, so kept. With the grid now showing
  coverage they are redundant: removing them is a one-line change if Michael wants (`ctcourse.ts`, the `sweepLines`
  call).
- Item 3: pause > Restart at checkpoint (Sector Ops solo and co-op, the co-op course): `GameMode.restartCheckpoint`, the
  everyone-down restart (section / bay), confirm opens on Stay.
- Item 4: pause > Return to lobby (co-op): the existing `backToLobby` (the client follows on the lobby broadcast). No
  protocol change (stays 25).
- A1: in co-op both are host only; the joiner's rows are blocked, "Host only", and keep Quit to menu.
Tests (cloud, software GL, 4 cores): `npm run check` passes. e2e-sectorops, e2e-ctcourse and e2e-netmove pass (with
`E2E_SUITE_TIMEOUT=2400`: at the default 600 s this VM is too slow for them). The new steps pass: e2e-ctcourse's pause
rows (host live, joiner "Host only") and host restart bringing the joiner back, the station 2 host unbolt with the real
`'local'` press; e2e-sectorops' pause restart; e2e-coop's "held guard not solid". Pre-existing on this VM, master
fails the same way: e2e-menus "holding right repeats and accelerates" (slider repeat timing), and e2e-coop stalls when
a match starts after a return to the lobby (a dialog over the joiner's lobby; master 4.35.0 at origin/master stalls at
the same step). So e2e-coop's new pause "Return to lobby" block (in its infiltration section) did not run here:
pending the PC full run.
Checkers: B no defects; M no blockers. Fix round: e2e-ctcourse restart step on a clear spot (8, 7) and the spawn
protection reset after it.
Polish list: the host's view of a joiner's hostage may flicker its gait slightly below 60 fps (`holdAt` velocity per
fixed step from a render-rate pose); a restart refused (already pending / op ending) closes the menu with no line.

## Done
- 2026-10-21: slices B + M (cloud): items 1, 2, 3, 4, 6; PR to master.
- 2026-10-21: BRIEF.md (Michael's list after his co-op run to bay 3).

## Resume prompt
```
Night Shift | Course Ready Build. Read CLAUDE.md, docs/ROADMAP.md, then docs/marlow-bays/BRIEF.md and STATE.md on feature/marlow-bays (C:/NightShift/Mobile-Coop-marlow-bays). Resume at STATE "Next".
```
