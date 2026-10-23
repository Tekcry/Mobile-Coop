# Hang-down actions - report (spare job #2, CT Core Build, 2026-10-23)

Branch `feature/hang-down` from master 3950f3f8 (4.68.0). The ask, the CT references and the assumed decisions A1-A8:
`BRIEF.md`.

## What and why
The co-op hang-down's hanging player can now act, as in CT 1.5 Drop Line (levels-digest :34; moves-mechanics 1.5):
- **Grab** (A1, A3): hold A while hanging lists GRAB CHARACTER on a guard by the head (the only grab entry, CT). He is
  lifted to the hands and held; then Michael's held rules (G203-G205, G210): RT tap / Z knocks out, RT hold kills (the
  neck snap), INTERROGATE when he knows something, LT aims the pistol over him; no let-go, no carry.
- **Neck snap** (A5): RT on a guard in reach without the menu: tap chokes (KO), hold (0.35 s) snaps the neck (lethal);
  KBM LMB the same, Z the choke. No new binding.
- **Sidearm** (A6): LT draws the pistol one-handed and aims it upside down (the inverted pipe's aim band and spread),
  never the rifle; RT fires; RB while aiming is the jammer (G212); the camera frames the hanging head.
- **KO by default** (A4): the holder pulling up or letting go (or the hold lost) while a guard is held knocks him out.
- The hack in reach: A uses it directly while hanging with no guard there (A9, fix round); by a guard it is a row of
  the hold-A menu (A1); lowering / pull-up keep the old direct press.
- Joiner as the hanger (A7), no wire change: the hanger's MoveState stays `boost` + `HANG_SUB`; the host keeps a
  hanging client's seized guard (no `TD_MAX` let-go) and holds him lifted under its head (`net/hangHold.ts`), allows the
  drawn pistol (`hostHandsFree`) and a shot origin up to 2.2 m under the turned-over root (`checkShot` `under`).

## Files
- `src/game/takedown.ts`: kind / attacker state `hangDown`, `TAKEDOWN.hangReach/hangBelow/hangAbove`, `HANG_GRAB`,
  `hangInReach`, `hangLiftY`, `hangHoldPoint`; `GRAB_KINDS` + `hangDown`.
- `src/game/takedownController.ts`: attacker state from `team.hangActs`, no offer while lowered / pulled; `runHangGrab`;
  the quick run's hang path (no override, no elbow arc, KO on hang end); `release` clears only its own override;
  `holdTalk` / `holdPick` extracted from `runGrab` (behaviour unchanged).
- `src/game/teamController.ts`: `hangActs`; the hanging prompt names the actions.
- `src/game/gameState.ts`: the menu live while hanging (no body pick-up there), the direct A path off then, RT / Z quick
  takedown, the elbow strike never from the hang, the inverted pistol aim (reused object), LT always the pistol while
  hanging, the `inverted` camera, the world prompt "Grab".
- `src/net/hangHold.ts` (new), `src/net/coopHost.ts` (one import line, the `seized` type, one block in the seized loop,
  the `checkShot` call), `src/net/validate.ts` (`hostHandsFree`, `checkShot` `under`, `SHOT_UNDER(_HANG)`).
- Tests: `tests/hangDown.test.ts`, `tests/hangDownTakedown.test.ts`, `tests/hangDownNet.test.ts` (new);
  `scripts/e2e-coop.mjs` new section "hang-down" (in the Infiltration match on the Warehouse).
- Docs: `docs/systems/takedowns.md` (new section), `docs/systems/coop.md`, `docs/systems/ui.md` (one line),
  `TESTING.md` (one item), `changes/feature-hang-down.md`.

## Tests
- Unit (desktop, single files): `tests/hangDown.test.ts` 8, `tests/hangDownTakedown.test.ts` 7, `tests/hangDownNet.test.ts`
  6 - pass; touched-area files `takedown`, `animN4dKill`, `net`, `teamMoves`, `grabMenu`, `grabMenuNav`,
  `g7CloseQuarters`, `committedMoves`, `teamPose`, `coopFix`, `moveState`, `weapons`, `bunkerMap` - pass.
- `tsc --noEmit` clean; eslint clean on every touched src / test file.
- e2e: NOT run here (orchestrator 09:20: no e2e on the desktop, CPU 100%). To run on the laptop, on the head commit:
  `e2e-coop` (the new hang-down section), `e2e-netmove`, `e2e-ctcourse` (station 5's hack now goes through the hold-A
  menu's hold row), `e2e-takedown`, `e2e-anim`.

## Protocol
No wire change; `PROTOCOL_VERSION` stays 31 (asserted in `tests/hangDownNet.test.ts`). 34 (reserved) is not used.

## Open items / polish list
- Animation (A8): the hands go to the guard's neck by the reach IK only; the upside-down grab, choke and neck snap need
  their own poses (team-pose / graph files belong to another agent). The pistol aim upside down uses the generic aim
  with the world-space aim (no `pipeInv` one-handed grip channel: the graph keys it on the traverse pose).
- The host's view of a client's hang knockout shows no limp lowering (the guard drops at the finish); the remote
  hanger shows no hands on the guard (no wire data).
- The jammer from the hang works as on the ground (RB while aiming) but is not covered by a test.
- The hanging player's own "inverse crouch" hide pose (CT) is not built.

## Fix round (2026-10-23, laptop GPU e2e on 0578d554)
- **e2e-coop hang-down, "the second guard offered" timeout: test bug, not a game bug.** Traced on the desktop GPU lane
  (client takedown trace + host kill log): after the grab KO the second guard WAS offered at once, RT held started the
  lethal `hangDown` takedown and the host killed him (melee, by the client) within 1 s. The test then waited on the
  host for `!!e && !e.alive && !e.ko`, but `EnemyManager` drops dead entries from `enemies` the same step, so that never
  held; its retry then waited 15 s for an offer on a dead guard. Fix (`scripts/e2e-coop.mjs`): the section logs the
  host's kills / knockouts (`enemyMgr.onKilled`, restored after) and reads every outcome from that log; a compact
  why-not-offered dump (`hdWhy`) on the offer waits. No unit test: the game was right (KO then the next offer is
  already covered by `hangDownTakedown`).
- **e2e-ctcourse:2 station 5, tap-A hack while hanging (A9, BRIEF).** The branch had moved the settled-hang hack into
  the hold-A menu, so a held A only opened the list. Playability: hanging with no guard on offer or held, A is the
  item's own again (`updateInteract`: a press uses it, a hold fills a hold item, the centre prompt); by a guard the
  hold-A menu takes A (GRAB CHARACTER + the item row). `GameState.hangDirectA` is set once per step in
  `contextMenuStep`, so one reader owns A per step, and an A still held from a list fills nothing (no double fire).
  The hanging prompt reads "A to use what is in reach, hold A by a guard to grab". The test is unchanged.
- Files: `src/game/gameState.ts`, `src/game/teamController.ts` (prompt), `scripts/e2e-coop.mjs`,
  `docs/hang-down/BRIEF.md` (A9), `docs/systems/takedowns.md`, `changes/feature-hang-down.md`.
- Tests: unit (single files) hangDown 8, hangDownTakedown 7, hangDownNet 6, takedown 18, teamMoves 24, grabMenu 3,
  net 72 - pass; `tsc --noEmit` clean; eslint clean (gameState, teamController). e2e on the desktop heavy2 lane
  (`E2E_GPU=1`, port 4192, `E2E_JOBS=1`, CPU ~15%): `e2e-coop` PASS (the hang-down section all ok), `e2e-ctcourse`
  PASS (station 5: A on the panel while hanging, the grid opens).

## Changelog line
- (hang-down) The co-op hang-down's hanging player can grab (hold A), neck-snap (RT tap / hold) and use the pistol (LT);
  a held guard is knocked out when the hang ends; works as the joiner; no protocol change.
