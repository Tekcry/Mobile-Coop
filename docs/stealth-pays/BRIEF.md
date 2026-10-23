# stealth-pays (Player Build, CT Core share of "Stealth over shooting")

Branch `feature/stealth-pays`, folder `C:/NightShift/Mobile-Coop-stealth-pays`, base master 4f6db420 (4.79.0).

## Michael's words
ROADMAP Decided "Stealth over shooting" (2026-10-23 ~10:10, `docs/ROADMAP.md:68`): theme "reward stealth over shooting as
sections get harder". This job's items, verbatim:
- "(7) gunfire alerts the section, limited suppressor ammo; no ammo inside a section; one ammo refill between sections, a
  weapons crate each player can use once"
- "(9) interrogation gives door codes, camera routes, patrol timing"
- "(12) co-op synced takedowns reward more than shooting"

ROADMAP Next (`docs/ROADMAP.md:55`): "CT Core (spare jobs): interrogation gives door codes, camera routes, patrol timing
(9); co-op synced takedowns rewarded (12); limited suppressor ammo (7)."

## Goal
Finish what is still missing of CT Core's share, prototype-sized (CLAUDE.md "Current goal": no polish). Most of it is
already on master:
- (9) interrogation-intel (merged): `src/game/intel.ts`, `src/game/intelReveal.ts`, the host relay in
  `src/net/coopHost.ts:259`, `Enemy.patrolRoute` (`src/ai/enemy.ts:705`). Interrogation shows door codes, nearby camera
  count / sweep times and patrol loop times as feed lines, and hands each code flag to `GameMode.onIntelCode`
  (`src/game/modes/gameMode.ts:94`). **Missing: part B** (`docs/interrogation-intel/BRIEF.md` A5): no mode implements
  `onIntelCode`, and Sector Ops does not copy a slot's `info` onto its guard, so a code is text only.
- (12) dual-reward (merged): `src/game/dualTakedown.ts`, `StealthRating.duals` (`src/game/playstyle.ts:11`), the
  `dualTakedown` event (`src/game/gameEvents.ts:24`), counted in `CoopHost.takedownDone` (`src/net/coopHost.ts:300`).
  **Nothing missing on our side**: the reward is section-rating's (below).
- (7) sd-rounds (merged): `src/weapons/sdRounds.ts`, quiet rounds per suppressed gun, HUD "SD n", loud at 0, checkpoint
  restore. **Nothing missing on our side.**

## Limits
- Read-only on `src/ai` (Guard AI Build). Writing `e.info` from a mode is the existing pattern (`courseMode.ts:667`).
- No map data: authoring `codes` on a guard belongs to the map's owner (Sector Ops: Sector maps; Marlow Build:
  `src/world/maps/ctcourse.ts`).
- No wire, save or PROTOCOL change in the active slices.
- No rating screen or rewards (Marlow Build, section-rating).

## Owners of the rest of (7), (9), (12)
| Part | Owner | Note |
| --- | --- | --- |
| gunfire alerts the section (7) | Guard AI (S14, `docs/guard-ai/PLAN.md:44`) | a spent suppressor already fires loud (`sdOpenNoise`) |
| no ammo inside a section, the weapons crate (7) | Sector Ops (E9-crate, `docs/sector-redesign/PLAN.md:112`) | see A3 |
| the synced-takedown reward and the rating card (12) | Marlow Build, section-rating (`origin/feature/section-rating`, PLAN R4) | see A2 |
| "No kills" reward = suppressor rounds refilled | Marlow Build, section-rating (its PLAN line 112) | `addSd(slot, 1)` per slot exists; no new API |
| authored guard codes (9) | the map owners | `GuardIntel.codes` + the flag in `externalFlags` (course) |

## Assumed decisions
- A1 (9) Course: `CourseMode.onIntelCode(flag)` = `this.state?.setFlag(flag)` (host / solo; the flag is dropped on a bay
  restart like any other, `courseState.ts:380`). A course gate that reads such a flag must list it in
  `def.externalFlags` (`courseDef.ts:133`, `validateCourse`). Undo: remove the method.
- A2 (12) Ours is the event and the count only, already done (dual-reward A1-A4): a synced takedown = the dual takedown,
  two players' finished takedowns within `DUAL_WINDOW` 1.5 s, host-judged. section-rating owns what it pays. Its
  PLAN builds its own `SyncedDetector` with the same window; it could read `g.events.on('dualTakedown')` /
  `g.style.duals` instead (hand-off note, their call). Undo: n/a.
- A3 (7) Quiet rounds count as weapon ammo: the between-section weapons crate (Sector Ops) refills them to the start count
  like the magazines (`PlayerWeapons.addAmmo` already calls `addSd`, `playerWeapons.ts:562-567`). Undo: the crate skips
  `addSd`.
- A4 (9) Sector: a guard's `info` is copied from his slot at spawn (`sectorMode.ts:754-756`, as `courseMode.ts:667`).
  A code from a guard is held by the team for the section it was found in (`SectorCodes.grantCode(flag, sec)`) and is
  dropped by that section's restart (A50, as every code); the respawned guard has his information again. Keypad prompts
  refresh. `checkSectorCodes` is unchanged: a guard is an extra source, every keypad still needs a board / overhear /
  objective source. Undo: remove the copy and `grantCode`.
- A5 (9) "Camera routes" = the nearby cameras' count and sweep times (interrogation-intel A2, merged). No map marks.
  Undo: n/a.
- A6 (9) The client interrogating from the hang-down still gets only the guard's own lines (interrogation-intel A4 gap):
  the host cannot see that interrogation without a wire change (the hang MoveState is `m: 'boost'` with `HANG_SUB`,
  `src/net/hangHold.ts:27`). Parked as P1 in PLAN.md; not built in this job unless the orchestrator says so.
  Undo: n/a.
