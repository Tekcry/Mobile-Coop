# guard-ai mill-hunt: plan
Owner: Guard AI Build. Status: current.

From `BRIEF.md` (Michael's words, A1-A16). Opus plan, prototype mode (G421): build the playable hunt fast, no tuning
before Michael plays. Base: origin/master 593b22c58. Line numbers are master's; `enemy.ts` is being edited by the aim
fix (`feature/guard-ai-aim-fix`), so builders grep, not trust, its lines.

## Claims
- Files: new `src/ai/millHunt.ts` (pure); `src/ai/enemy.ts` (a small hook, ~60 lines); `src/ai/enemyManager.ts` (glue);
  `src/game/sectors.ts` (an optional `hunt` field and its types, type only); `src/world/maps/thornbeckMill.ts` (the hunt
  data); `src/core/flags.ts` (`millHunt`); `scripts/e2e-piano.mjs`, `scripts/e2e-affected.mjs`; tests below; the
  fragment `changes/feature-guard-ai-mill-hunt.md` (`kind: minor`); a `TESTING.md` line; `docs/systems/ai.md` section.
- Maps: `thornbeckMill` only. Nothing changes off the scene or with `millHunt` off.
- Wire: none (host-side AI; `searching` is wire level 2, torch and look bits exist). Save: none.
- No scene file change: `src/game/pianoScene.ts` keeps setting `sceneDark` and calling `blackoutSearchSlots`.

## The hunt (what Michael will see)
At the EMP every guard is already searching (weapon up, torch on), and stays so to the end. Each storey has one fixed
line of stops through its rooms. Every unit (a pair or a solo) walks its line towards the stop nearest where the players
were last known (W1 at first), stop by stop at 0.45 m/s; at each stop it turns torch and gun onto each listed corner and
holds it. No room ever holds more than 2 guards and no two units stand within 6 m, so the units come in spaced out, one
group at a time. A unit that may not step holds its stop and re-clears its corners. The unit at the target clears that
room round and round. Seen or heard: that unit checks the spot, then goes back to its line. Same every run.

## Data (H1): `SectorDef.hunt` (in `src/game/sectors.ts`, after `routes` at `:156`)
```ts
export interface HuntRoom { id: string; box: readonly [number, number, number, number] } // x0, z0, x1, z1
export interface HuntStop {
  pt: RoutePt;            // the leader's / solo's spot (y = the line's floor)
  pt2: RoutePt;           // the partner's spot, 1.0-1.5 m from pt (GA6 lanes, the paired kill)
  room: string;           // a HuntRoom id of this line
  aims: readonly number[]; // yaws (rad, 0 = +z, grows to +x), left to right: corners, cover backs, doorways (1-3)
}
export interface HuntLine { id: string; floorY: number; rooms: readonly HuntRoom[]; stops: readonly HuntStop[] }
// SectorDef: hunt?: readonly HuntLine[];   stops in walking order along the line (adjacent stops 2.5-4.5 m apart)
```
- `THORNBECK_HUNT` in `thornbeckMill.ts`, set on `THORNBECK_SECTORS[0].hunt`. Two lines (A5):
  - `ground` (y 0): rooms `startBay`, `aisle`, `millBay`, `sackBay`, `office`, `lobby` (boxes from `THORNBECK_SPACES`,
    nooks included). About 14 stops, from W1's north end through the start bay, along the aisle (Sb1, Sb2), the mill bay
    (the bin-row niche, M1's corners), the sack bay (Sd2, Sd1, Sd3), the office (west door, desk, north door) to the
    ladder foot. Stops follow the players' path (`THORNBECK_PATH`) where it is walkable for guards.
  - `gallery` (y `DECK_Y`): rooms `landing` (x 0-7), `stairHead` (7-12), `craneWest` (12-16), `craneEast` (16-20),
    `eastWest` (20-26), `eastEnd` (26-32), all z 15-18. About 10 stops from the hoist door to the hatch.
  - Aims: per stop, the dark corners, the backs of cover a player could crouch behind (low sacks, bin row ends, GS1-GS3,
    the desk) and doorways seen from it, ordered left to right as seen facing along the line. Hide spots in
    piano-escape PLAN section 3 each get an aim from some stop (a readable search: every hide spot is checked).
- Every stop's `pt` and `pt2` 0.5 m clear of a collider (as the route points), inside its room's box, on the nav grid.

## Logic (H2): `src/ai/millHunt.ts` (pure, no Babylon, no allocation after `build`)
- `HUNT = { pace: 0.45, aimHold: 1.5, holdAim: 2.5, gap: 6, roomCap: 2, checkLook: 4, checkPan: 0.7, arrive: 0.5 }`.
  Turns at the calm rate (`ENEMY_CALM_MOTION`, reuse `sweepTurnTime` / `wrapAng` from `sceneSweep.ts`).
- `HuntBoard<M extends HuntMember>`: built at `sceneDark` on from the lines and the placed guards. `HuntMember` (an
  `Enemy` fits structurally): `alive`, `taken`, `pos`, `level`, `slotIdx`, `pairSlot`. Units: the `pair` tags pair up;
  others are solos. Each unit is on the line whose `floorY` is nearest his y, at the nearest stop (ties: lower index).
- `target(line, x, z)`: the stop nearest (x, z) straight (ties: lower index). `setTarget(x, z)` sets every line's.
- A unit's states: `regroup` (split pair: the member nearer the target walks to his partner's stop, A6), `move` (to the
  next stop towards its target), `clear` (each aim of the stop in order: turn, hold `aimHold`; pair: leader the even
  aims, partner the odd), `hold` (may not step: the aims again at `holdAim` each), `loop` (at its target: the target
  room's stops in line order, round), `check` (H4).
- May a unit step to stop j: no other live unit's current or next stop within `gap` m of j's `pt` (same line), and the
  guards of units whose current or next stop is in j's room plus its own size at most `roomCap`. Units on a line all
  head for one target, so their order never changes and no deadlock can form (tested).
- `tick(dt)` at the board tick (0.2 s): steps every unit and writes each member's goal through `out(m, x, z, face,
  speed)` (face NaN while walking). A down or taken member: his partner goes on as a solo.

## Glue (H3): `src/ai/enemy.ts` and `src/ai/enemyManager.ts`
- `flags.millHunt` (`src/core/flags.ts` beside `pianoEscape` at `:113` / `:302`): `darkFlag(params.get('millhunt'),
  PREVIEW_ON)`; owner Guard AI; switched on when Michael accepts it on his walk.
- `Enemy`: `huntPt: P2`, `huntFace` (NaN none), `huntSpeed`, `huntOn`. `huntStart()`: not if dead / taken / a dog; sets
  `searching` (plain kind, not a combat search, no room), `huntOn = true`. `huntStop()`. In the alert input
  (`i.hunting = ...`, master `:3062`): `|| this.huntOn`. In the searching branch, before the crew sweep (master
  `:3421`): `if (this.huntOn) return this.huntStep(dt)`: `goTo(huntPt)` at `huntSpeed`; within `HUNT.arrive` stop and
  face `huntFace`. Combat is untouched; back in `searching` after it, `huntOn` still holds.
- `EnemyManager`: `sceneDarkOn` (`:2405`) with `flags.millHunt` and the live section's `hunt`: no `sweepify`; every
  placed guard `huntStart()`, the board built, the target at W1 (5.5, 5.25; the scene's `SEARCH_X/Z`). `placeSlot`
  while dark (`:2400`): `huntStart()` and add him. Board tick (`:4145`): `hunt.tick(0.2)` instead of `glimpseFollow`.
  `sceneDarkOff` (`:2426`): `huntStop()` all, board dropped. Restart: `sceneDark = true` again rebuilds it (same run).
- `blackoutSearchSlots` stays; with the hunt on, G1 + G2's movement is the hunt's (A13).

## Reactions (H4)
- Checks (A10): at the board tick, a hunting guard whose `riseN` moved on sight or sound (`riseCause`, as
  `glimpseFollow` `:2490` reads it) puts his unit in `check`: both walk at `pace` to his `stimX/Z` (partner at `pt2`'s
  offset), look `checkLook` s panning +-`checkPan`, then `move` from the nearest stop. Cap and gap do not block a check.
- Targets (A4): `setTarget` on a contact call that gets through (the caller's last known point), a body found by a hunt
  guard (its spot), and a unit's fight ending (its last known point).
- Radio (A11): `radioDeliver` (`:3035`) `contact` with the hunt on: `e.tell(inc)` and `setTarget`, no `e.radio` (no
  combat). Voice range, gunfire and sight work as built.

## Slices (order, size, files, tests, checkers)
| # | What | Builder | Size | Files |
| --- | --- | --- | --- | --- |
| H1 | The hunt data: types, two lines, rooms, stops, aims | Sonnet (strict brief) | S, ~300 | `src/game/sectors.ts`, `src/world/maps/thornbeckMill.ts`, `tests/thornbeckMill.test.ts` |
| H2 | The pure board: units, cap, gap, move / clear / hold / loop / regroup | Opus | M, ~600 | `src/ai/millHunt.ts`, `tests/millHunt.test.ts` |
| H3 | Glue: never calm, the hunt on the scene, the flag, e2e | Opus | M, ~350 | `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/core/flags.ts`, `scripts/e2e-piano.mjs`, `scripts/e2e-affected.mjs`, fragment, `TESTING.md`, `docs/systems/ai.md` |
| H4 | Reactions: checks, targets, the radio | Opus | M, ~400 | `src/ai/millHunt.ts`, `src/ai/enemyManager.ts`, `tests/millHunt.test.ts`, `scripts/e2e-piano.mjs` |

- H1 and H2 start now, in parallel (file-disjoint, no `enemy.ts`); H2 codes against the types above with a fixture
  line, then runs its sim on the real data once H1 is in. H3 starts when the aim fix is on master (it touches
  `enemy.ts`). PR 1 = H1 + H2 + H3: the visibly better scene (never calm, weapon up, slow, closing in spaced, pairs
  abreast, corners cleared). PR 2 = H4. Each PR under 1.5k lines; two independent Opus checkers each (AI code).
- H1 tests (vitest): every stop's `pt` / `pt2` 0.5 m clear and in its room (the route-point check of
  `tests/thornbeckMill.test.ts`); `pt2` 1.0-1.5 m from `pt`; adjacent stops 2.5-4.5 m and on the nav grid; 1-3 finite
  aims; every room has a stop; every hide spot is aimed at from some stop within 8 m.
- H2 tests (`tests/millHunt.test.ts`): target and step rules; a kinematic sim (members walk straight legs at `pace`,
  turn at the calm rate) of the 12- and 16-guard sets on `THORNBECK_HUNT` for 10 minutes: never more than 2 guards in a
  room, never two units' stops within `gap` m on one line (regroup aside), every unit's line distance to its target
  never grows except in `regroup`, no unit stuck while the stop ahead is free, two runs identical (no randomness), no
  allocation in `tick` (follow an existing allocation test: `grep -l allocat tests/`).
- H3 tests: `alertState`: `hunting` keeps `searching` past `searchTime`; a full meter goes to combat, lost sight back
  to `searching`. A manager vitest (as `tests/pianoGuards.test.ts`) with `sceneDark` on and the flag on: every guard
  `searching` and `huntOn`, none swept; flag off: GA6 as built (its tests unchanged).
- H4 tests: a glimpse puts the unit in `check` and back on the line; a contact call moves the targets and no receiver
  goes to combat; a body found moves them.
- e2e: `e2e-piano` owns the scene. H3: the start check "no guard past suspicious" (`scripts/e2e-piano.mjs:378-387`)
  becomes "no guard in combat"; add: 30 s after the cut every live guard is `searching`; over 60 s no room holds more than
  2 guards; the ground units' mean distance to W1 falls. Map `src/ai/millHunt.ts` to `e2e-piano` in
  `scripts/e2e-affected.mjs` (`:303`). H4: a flash sighting sends only that unit to check; nobody else goes to combat.

## Risks
- 1.6x sight in the searching level may make the dark scene much harder: a tuning knob after Michael's walk, not now.
- With 16 guards the rooms fill: most units hold early. Reads as the hunt pinning the players in; Michael judges it.
- Foot sliding at 0.45 m/s on the walk clip: polish list, not a blocker (G421).
- The aim fix and H3 both touch `enemy.ts`: H3 waits for it on master (no merge of master into this branch: train rule).
