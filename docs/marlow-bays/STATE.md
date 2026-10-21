# marlow-bays - state

Now (2026-10-21 ~15:05): slice T = PR Tekcry/Mobile-Coop#82 (branch `feature/marlow-tuner`, worktree
`C:/NightShift/Mobile-Coop-marlow-tuner`, head f3b77e38, master 4.34.0 merged): items 9, 10, 11, 13, 14. Check,
e2e-studio, e2e-menus, e2e-mouse pass; checker's two findings fixed; full e2e running on the laptop (Character Build,
15:00). Slice T1a (items 15-19, COVERAGE gaps 3-5) is being built by an implementer subagent on
`feature/marlow-tuner-t1` (worktree `C:/NightShift/Mobile-Coop-marlow-t1`, cut from T f3b77e38). Master 4.34.0 is
merged here (protocol 25).
Next: T1a PR; T1b (COVERAGE gaps 1-2: Joints / Hands & feet / IK / Weapon bake and reach every rig and the partner;
move and action rows; Michael's existing exports must bake, backward compatible, tested with a literal old export);
T3 (rig: per-finger control, a real clavicle, per-key legs; prototype first, screenshot of the new joints to the
orchestrator before building it all); T2 (UI redesign; screenshot before its PR); then B, J, M.
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
Polish list (not done, no fix round needed): none raised yet.

## Done
- 2026-10-21: slices B + M (cloud): items 1, 2, 3, 4, 6; PR to master.
- 2026-10-21: BRIEF.md (Michael's list after his co-op run to bay 3).

## Resume prompt
```
Night Shift | Course Ready Build. Read CLAUDE.md, docs/ROADMAP.md, then docs/marlow-bays/BRIEF.md and STATE.md on feature/marlow-bays (C:/NightShift/Mobile-Coop-marlow-bays). Resume at STATE "Next".
```
