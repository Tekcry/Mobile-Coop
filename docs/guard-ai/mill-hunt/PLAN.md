# guard-ai mill-hunt: plan
Owner: Guard AI Build. Status: current.

From `BRIEF.md` (A1-A16). Opus plan, prototype mode (G421). Base origin/master 593b22c58. Revision 1: plan check 1's
FIX 1-5 and fold-ins 1-12 below. PR #694 (aim fix) edits `enemy.ts`: builders grep, not trust, its lines.

## Claims
```claims
files:
  - src/ai/millHunt.ts
  - src/ai/enemy.ts
  - src/ai/enemyManager.ts
  - src/game/sectors.ts
  - src/world/maps/thornbeckMill.ts
  - src/core/flags.ts
  - scripts/e2e-piano.mjs
  - scripts/e2e-affected.mjs
  - tests/millHunt*.test.ts
  - tests/thornbeckMill.test.ts
  - TESTING.md
  - docs/systems/ai.md
  - docs/guard-ai/mill-hunt/**
maps: thornbeckMill
protocol: none
save: none
```
Plus the fragment `changes/feature-guard-ai-mill-hunt.md` (`kind: minor`; shared). Host-side AI (`searching` is wire
level 2). No scene file change (`pianoScene.ts`). Overlaps: "Order" below. What Michael sees: BRIEF reading 1-3, A4.

## Data (H1): `SectorDef.hunt` (in `src/game/sectors.ts`, after `routes` at `:156`)
```ts
export interface HuntRoom { id: string; box: readonly [number, number, number, number] } // x0, z0, x1, z1
export interface HuntStop {
  pt: RoutePt; pt2: RoutePt; // the leader's / solo's spot; the partner's, 1.0-1.5 m from pt (GA6 lanes, paired kill)
  room: string;              // a HuntRoom id of this line; a room's stops are consecutive in the line
  aims: readonly number[];   // yaws (rad, 0 = +z, grows to +x), left to right: corners, cover backs, doorways (2-4)
}
export interface HuntLine { id: string; floorY: number; rooms: readonly HuntRoom[]; stops: readonly HuntStop[] }
export interface HuntDef { lines: readonly HuntLine[]; phases: readonly (readonly string[])[] } // a room id per line
// SectorDef: hunt?: HuntDef;   stops in walking order along the line (adjacent stops 2.5-4.5 m apart)
```
- `THORNBECK_HUNT` in `thornbeckMill.ts`, on `THORNBECK_SECTORS[0].hunt`. Two lines (A5):
  - `ground` (y 0): rooms `startBay`, `aisle`, `millBay`, `sackBay`, `office`, `lobby` (`THORNBECK_SPACES` `:51`, nooks
    `:62` included). About 14 stops from W1's north end through the start bay, the aisle (Sb1, Sb2), the mill bay (the
    bin-row niche, M1), the sack bay (Sd2, Sd1, Sd3), the office (west door, desk, north door) to the ladder foot.
  - `gallery` (y `DECK_Y`): rooms `landing` (x 0-7), `stairHead` (7-12), `craneWest` (12-16), `craneEast` (16-20),
    `eastWest` (20-26), `eastEnd` (26-32), all z 15-18. About 10 stops, hoist door to hatch.
  - `phases` (the search order, A4), one row per phase, `[ground, gallery]`: `startBay`/`stairHead`, `aisle`/`craneWest`,
    `millBay`/`craneEast`, `sackBay`/`eastWest`, `office`/`eastEnd`, `lobby`/`eastEnd`. Both lines run along the route
    on one clock, the gallery above the ground front, both ending at L1 and the hatch.
  - Aims: dark corners, backs of cover (low sacks, bin row ends, GS1-GS3, the desk), doorways, both ways along the line
    (H2 picks the target side). Every piano-escape PLAN section 3 hide spot is aimed at from some stop; the final rooms
    aim at L1, the hatch and the doors in. Fold-in 1: the start bay's first stops (G1 + G2) aim away from the players'
    start-to-low-sacks run (piano-escape PLAN `:348`).
- Every stop's `pt` / `pt2` 0.5 m clear of a collider, inside its room's box, on the nav grid.

## Logic (H2): `src/ai/millHunt.ts` (pure, no Babylon, no allocation after `build`)
- `HUNT = { pace: 0.45, aimHold: 1.5, holdAim: 2.5, gap: 6, roomCap: 2, phaseMax: 120, checkLook: 4, checkPan: 0.7,
  arrive: 0.5, aimSide: 1.75 }`. Turns at the calm rate (reuse `sweepTurnTime` / `wrapAng` from `sceneSweep.ts`).
- `HuntBoard<M extends HuntMember>` built at `sceneDark` on from the `HuntDef` and the placed guards (`HuntMember`, which
  an `Enemy` fits: `alive`, `taken`, `pos`, `level`, `slotIdx`, `pairSlot`). `pair` tags make pairs, others solos; a
  unit is on the line whose `floorY` is nearest its y, at its nearest stop (ties: lower index). Fold-in 2: H2 declares
  the hunt types locally until H1 lands, then imports them from `sectors.ts`.
- Order (FIX 1, A4): `phase` 0 at build; a line's target = its phase room's stop nearest the previous target (first:
  nearest W1 (5.5, 5.25)). The phase steps on when every line's target room has been cleared once in this phase (each
  of its stops' aims done by some unit) or after `phaseMax` s; the last phase holds. `setTarget(x, z, y)`: the point's
  line target = its stop nearest the point, phase = the first row naming the point's room there (`landing` = 0), the
  other line's target = its new phase room's stop nearest (x, z); the clock restarts. No live position is read. A unit
  ahead of the front walks to it, then follows it: one reversal at most per run of the order, no back-and-forth.
- Rank (FIX 2): a line's units ranked by line distance to the target (nearer first, ties: lower unit index; the unit
  looping the target room first). Steps are granted in rank order each tick. Step to stop j: no higher-ranked unit's
  current or next stop within `gap` of j's `pt` (lower-ranked units are not counted), and on entering a new room, the
  guards in it or walking into it plus this unit's size <= `roomCap`. Blocking runs only down the ranks and walking legs
  always end, so the first unit can always step until it is at the target: units queue, never deadlock.
- Start spread (FIX 2): at build, before any step, a room over `roomCap` sends out its solo (else its lowest-ranked
  unit) along the line away from the target (in the target room: towards the line's longer end) to the first stop
  whose room has space; a full room on the way first sends its own lowest-ranked unit one room on, in line order. 12
  set: G3 leaves the start bay for the aisle (with G4: 2). 16 set: G8 + G9 step to `craneEast`, then G10 to
  `craneWest`. A start inside `gap` of a higher-ranked unit just holds.
- States: `spread`, `regroup` (split pair: the member nearer the target walks to his partner's stop, A6), `move`,
  `clear` (the stop's aims; pair: leader even, partner odd), `hold` (aims again, `holdAim` each), `loop` (target room's
  stops in line order, round), `check` (H4). Outside the target room a unit uses only aims within `aimSide` (100 deg) of
  the line towards its target (at least one); in it, all. Fold-in 9: legs face along the line; at most one look back
  per stop (the from-behind window stays).
- `tick(dt)` at the board tick (0.2 s) writes each member's goal through `out(m, x, z, face, speed)` (face NaN while
  walking). A down or taken member: his partner goes on as a solo.

## Glue (H3): `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/core/flags.ts`
- `flags.millHunt` beside `pianoEscape` (`flags.ts:113` / `:302`): `darkFlag(params.get('millhunt'), PREVIEW_ON)`;
  owner Guard AI; switched on when Michael accepts it on his walk.
- `Enemy` (fold-in 6: `mh*` names, as `Enemy.hunt` `:616` and `i.hunting` exist): `mhPt`, `mhFace` (NaN none),
  `mhSpeed`, `mhOn`; `mhStart()` (not dead / taken / a dog: `searching`, plain kind, no room, `mhOn`), `mhStop()`.
  `i.hunting = ...` (master `:3062`) gains `|| this.mhOn`. Searching branch, before the crew sweep: `if (this.mhOn)
  return this.mhStep(dt)` (`goTo(mhPt)` at `mhSpeed`; within `HUNT.arrive` face `mhFace`). Combat untouched.
- `EnemyManager`: `sceneDarkOn` (`:2405`) with the flag and the section's `hunt`: no `sweepify`, every guard
  `mhStart()`, board built; `placeSlot` while dark (`:2400`) adds him; `hunt.tick(0.2)` replaces `glimpseFollow`
  (`:4153`) inside the `coordinated` block `:4143-4154` (fold-in 10); `sceneDarkOff` (`:2426`) drops it all.
- Fold-in 7: `blackoutSearchSlots` (`:1350`) still runs `searchAt(.., SEARCH_BLACKOUT)` on G1 + G2 after `mhStart`: the
  `mhOn` branch wins and `i.hunting` keeps `searchFor` from ending it. Fold-in 11: a `bodyFound` (`:886`) body search
  (`SEARCH_BODY`) leaves him on the hunt.

## Reactions (H4): `src/ai/enemy.ts`, `src/ai/millHunt.ts`, `src/ai/enemyManager.ts`
- Cue (FIX 3): `riseN` moves only on a rise into suspicious / investigating (`enemy.ts:2390-2393`), which a held
  `searching` guard never makes. New: `mhCueN`, `mhCueX/Z`, `mhCueCause`, set only while `mhOn` and `searching`: on
  sight when his meter crosses `PERCEPTION.suspicious` upwards (the seen point), in `hear()` (`:1389`) when the sound's
  suspicion is >= `PERCEPTION.suspicious` (the sound). The board compares `mhCueN` with its copy each tick.
- Check (A10, FIX 4): the noticing guard's own unit checks (cause and effect stay readable: "he saw it, he looks"). It
  walks its line to the stop nearest the spot under the room cap (`gap` waived), steps off to the spot only inside that
  stop's room, else looks in from the last stop it may reach (the room edge); `checkLook` s panning +-`checkPan`, then
  `move`. Not another unit: one that saw nothing breaks the cause; the edge keeps the cap by positions at all times.
- Targets (A4): `setTarget` on a contact call that gets through (the caller's last known point), a body found by a hunt
  guard (its spot), a unit's fight ending (its last known point). Radio (A11): `radioDeliver` (`:3035`) `contact` with
  the hunt on: `e.tell(inc)` and `setTarget`, no `e.radio` (no combat). Voice, gunfire and sight work as built.

## Slices (each a PR; counted lines exclude docs)
| # | What | Builder | Size | Files | PR |
| --- | --- | --- | --- | --- | --- |
| H1 | Hunt data: types, lines, rooms, stops, aims, phases | Sonnet (strict brief) | ~350 | `sectors.ts`, `thornbeckMill.ts`, `tests/thornbeckMill.test.ts` | 1 |
| H2 | Pure board: order, rank, spread, states, sims | Opus | ~850 | `millHunt.ts`, `tests/millHunt.test.ts` | 1 |
| H3 | Glue: never calm, hunt on the scene, flag, e2e | Opus | ~350 | `enemy.ts`, `enemyManager.ts`, `flags.ts`, `e2e-piano.mjs`, `e2e-affected.mjs`, `tests/millHuntGlue.test.ts`, `TESTING.md`, `ai.md` | 2 |
| H4 | Reactions: cue, check, targets, radio | Opus | ~500 | `enemy.ts`, `millHunt.ts`, `enemyManager.ts`, `tests/millHunt.test.ts`, `tests/millHuntCue.test.ts`, `e2e-piano.mjs` | 3 |

- PR 1 = H1 + H2 (~1.2k; fold-in 8: H3 its own PR), dark (no runtime caller); H1 || H2 start now (file-disjoint).
  PR 2 = H3 once #694 is on master; PR 3 = H4 after PR 2. Two independent Opus checkers per PR (AI code).
- H1 tests: `pt` / `pt2` 0.5 m clear and in their room; `pt2` 1.0-1.5 m from `pt`; adjacent stops 2.5-4.5 m, on the
  nav grid; 2-4 finite aims; a room's stops consecutive; every room has a stop; every phase row names a room of each
  line, in line order; every hide spot aimed at from a stop within 8 m; final rooms aim at L1 / the hatch; fold-in 1.
- H2 tests (`tests/millHunt.test.ts`): order, rank, step, spread rules; a kinematic sim (straight legs at `pace`, calm
  turn rate) of the 12- and 16-guard sets on `THORNBECK_HUNT`:
  - Cap from t = 0 by member positions every step (fold-in 5: walking, spread, regroup, check): never above 2 in a room,
    except a room the start put over (12: `startBay`; 16: `stairHead`), only falling and at 2 by 15 s.
  - 15-minute no-trigger run (FIX 1): the phase reaches the last row; a unit's line distance to its target never grows
    except in regroup, spread, loop or at a target step (fold-in 4); no unit holds while its next stop is free of
    higher-ranked units (no deadlock); each unit reverses along its line at most once; at 15 min every live unit is in
    its final room or within `gap` + 4.5 m of the unit ahead, facing within 100 deg of the line towards L1 / the hatch.
  - Two runs identical (no randomness); no allocation in `tick` (as `tests/aiSeeded.test.ts`).
- H3 tests (`tests/millHuntGlue.test.ts`): `mhOn` keeps `searching` past `searchTime`; a full meter goes to combat, lost
  sight back to `searching`; a manager run (as `tests/pianoGuards.test.ts`), dark and flag on: every guard `searching`
  and `mhOn`, none swept, G1 + G2 hunt-driven after `blackoutSearchSlots` (fold-in 7); flag off: GA6 as built.
- H4 tests (`tests/millHuntCue.test.ts`, a real `Enemy` held in `searching`): a glimpse past `PERCEPTION.suspicious` and
  a loud `hear()` each bump `mhCueN` with the right x/z; the board puts his unit in `check` and back on its line; a
  check into a room at the cap stops at the edge (positions never above 2); a contact call moves the targets, no
  receiver goes to combat; a body found moves them and the `SEARCH_BODY` guard stays on the hunt (fold-in 11).
- e2e (`e2e-piano` owns the scene). H3: the start check "no guard past suspicious" (`scripts/e2e-piano.mjs:378-387`)
  becomes "no guard in combat" with the flag on (`?millhunt=0` keeps the old check); "no detection at the start"
  (`:388`) must pass with the flag on: fix aims / start stops, not the assertion (fold-in 3). Add: 30 s after the cut
  every live guard `searching`; over 60 s no room above 2 (positions); ground units' mean distance to W1 falls. Map
  `src/ai/millHunt.ts` to `e2e-piano` in `scripts/e2e-affected.mjs` (`:303`). H4: a flash sighting sends only that unit.
- Walk card (fold-in 12): name A1 (searching, not combat) and A2 (no helmets) so Michael can say "higher".

## Risks (for Michael's walk, G421)
- 1.6x sight in `searching` may be too hard in the dark; 16 guards make the gallery a cordon; the clock can outrun slow
  players (units then queue towards L1, facing them); foot sliding at 0.45 m/s.

## Order (claims-check)
`claims-check --plan` (2026-10-27, rev 1): exit 1, 48 overlaps, none on `millHunt.ts`, `thornbeckMill.ts`,
`e2e-piano.mjs` or the new tests. `enemy.ts` / `enemyManager.ts`: PR #694 aim fix (H3 / H4 wait for it on master),
`feature/guard-ai-j16-2` (ours, held: we order it) and `guard-ai-mission-hooks` + s1a1-s4 (`flags.ts` too). One
optional type in `sectors.ts`, one `flags.ts` line, one `e2e-affected.mjs` map line and a `TESTING.md` line against
mission-rules / missions / tallow-* (~33), campus-greybox, coop-kit, map-ready, player-batch-j19: rebase-level.
Orchestrator: please order mission-hooks against H3 / H4, and the rest; PR 1 (H1 + H2) shares only `sectors.ts`.
