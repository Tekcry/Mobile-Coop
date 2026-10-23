# pose-parity - REPORT (spare job 6)

Branch `feature/pose-parity` (from `origin/feature/ctcore-batch-23` 58368e10). Evidence, fixes and assumed decisions
A1-A6: `docs/pose-parity/BRIEF.md`. Written by the lead from the builder's hand-back (the builder could not write it).

## What and why
Goal: what a player sees of their partner matches the partner's own page.

1. **Aim side (shoulder swap): done.** The wire carried it only in the last `ground` branch of `localMoveState`
   (sub bit 128), so a partner aiming from the left shoulder while holding a hostage, on a rope, split or inverted pipe,
   or on top of the human ladder showed the gun in the right hand. `localFlags` now sets `PF.aimLeft` (64) with the
   owner's own rule (`!wallCore.active && cam.shoulder < 0 && handSwitchOk`, as `gameState.ts:2651` openLeft);
   `RemoteAvatar` openLeft = the wall's left-hand bit OR the flag. The ground sub bit 128 is no longer written (A1, A2).
2. **Remote melee -1 clamp: done.** `localMoveState.ts:64` clamped `takedown.blowPh` -1 (a choke, the lethal approach)
   to `ph` 0, so the remote posed `killWarp(0)` (elbow wind-up plus the strike action rows) through every choke (n4d
   polish item 6). `takedown` sub bit 1 (`TAKEDOWN_SUB_BLOW`) now means the blow is running; without it
   `poseFromMoveState` poses -1. The remote's follow-through tail starts only on a running blow.
3. **Baked sections on the partner: code path, no visible change today.** The owner applies the baked move sections
   (`moveTune.ts`: co-op roles and traversal) and the Body root offsets and wall gap (`tuneRoot`,
   `TUNE_LOCAL.wallGapAdd`, `player.ts:390-400`, `:566-571`); the remote applied none. It now calls
   `moveTuneSelectBase` (base table only, never the viewer's live tuner, A4) with the role from the wire
   (`teamRowOfWire`) and the contact weight from the wire phase (`teamContactKOfWire`, A5), then `moveTuneRoot`,
   `moveTuneBegin` / `moveTuneEnd` around its `animate`, plus `bodyRigRoot` / `bodyRigWallGap`. Today's `ANIM_BASE`
   has no `sections` and no root rows, so every new call is identity until a bake writes them.

## Files
- `src/net/protocol.ts`: `PROTOCOL_VERSION` 36; `PF.aimLeft` 64.
- `src/net/netShared.ts`: `localFlags` sets `PF.aimLeft`.
- `src/game/localMoveState.ts`: the takedown blow bit; ground sub 128 dropped (`SHOULDER_LEFT_SUB` removed, no other user).
- `src/player/moveState.ts`: `TAKEDOWN_SUB_BLOW`; takedown melee -1 without it; ground leftHand no longer from sub 128.
- `src/net/remoteAvatar.ts`: openLeft from the flag; tail gated on the blow bit; base move sections, Body root offset and wall gap.
- `src/anim/moveTune.ts`: `moveTuneSelectBase`, `teamContactKOfWire` (pure, no allocation).
- `src/anim/tune.ts`: `bodyRigRoot`, `bodyRigWallGap` (pure, no allocation).
- Not touched: `characterRig.ts`, `footPlanner.ts`, the mocap path (switch-OFF byte-identical), `src/ai`, the save shape.
- Docs: `docs/systems/coop.md`, `changes/feature-pose-parity.md`, `docs/pose-parity/BRIEF.md`.

## Wire change
`PROTOCOL_VERSION` 31 -> **36**: after `git fetch`, 32 is reserved for guard-ai, 33 `feature/marlow-final`, 34
`feature/section-rating`, 35 `feature/sector-redesign-p3` and siblings. No new fields: one bit in the player flags `f`
(64, free since protocol 14) and one bit in the takedown MoveState `sub`. Renumbering at merge is one line in
`protocol.ts` plus the tests that assert the number.

## Tests (desktop, one file at a time)
- New `tests/poseParity.test.ts` 12/12.
- Updated, passing: moveState 16, net 72 (hello 35 refused, 36 joins), hangDownNet 6, jammer 39, jammerFixes 10,
  rejoin 12, sectorLampSync 11, sectorStep3 7, animN4dKill 11 (the choke now asserts -1; the old assert pinned the bug).
- Unchanged, passing: animBakeAll 10, animBodyBase 6, animStudio2 20, teamClimb 6.
- tsc and eslint clean. e2e: e2e-coop and e2e-netmove pending on the laptop.

## Open items
- Laptop e2e-coop and e2e-netmove on the branch head.
- A5: the remote's contact weight comes from the wire phase; exact only for the hang-down and rope climber. The
  leg-up and throw windows ride `ph`, the climb clip's phase.
- A6: the Weight section and the camera and gun sections stay local-only (Weight needs the owner's acceleration and
  plant history).
- 36 may need renumbering if guard-ai, marlow-final, section-rating or sector-redesign merge first.
- Not seen in a live two-page session yet (hand mirroring with a hostage or on a rope, the choke pose).

## Changelog line
- (pose-parity) Co-op: the partner's weapon hand follows their shoulder swap in every mode, a partner choking or
  stepping in for a lethal takedown no longer holds the strike wind-up, and baked move sections and Body root offsets
  reach the partner's rig. Protocol 36.

## Check (fresh Opus, 2026-10-23): PASS
No blockers. Polish applied by the lead: the gameState.ts:2650 comment, a blank line in localMoveState.ts, the
hangDownNet test title, a TESTING.md line. Open: the relay climber (`relayUp`) arrives as 'boost' with no bit, so once a
bake writes `team.relay.a` the partner would play `team.boost.a` (older, documented in `teamRowOfWire`; a relay sub bit in
a later job); `teamRowOfWire` computed twice per frame (remoteAvatar.ts:572, :625); stale test titles in net.test.ts:676.
