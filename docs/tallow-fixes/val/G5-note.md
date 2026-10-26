# Tallow Wharf G5: the TGC split meets the standard (the gallery stair, the merge at the fish hall)
Owner: Campaign Build. Status: current.

J8 tallow-fixes slice G5 (Night Shift | Cloud Builder 6, 2026-10-26; brief `briefs/campaign-tallow-g5.md` and plan
`briefs/campaign-tallow-g5-plan.md` on `cloud-queue`, fix round 1). The gallery's caged ladder is replaced by the market
warden's caged stair, whose head gate the boosted partner unbolts on landing, and the market is declared part of leg b,
so the split rejoins in the fish hall (signed-off step 2). Michael answered G5-Q1 with answer 1, "Allow this corner
(Recommended)" (Michael 2026-10-26, G5-Q1). Links are named `from>to` (A22), plus the kind where two links share a name.

## 1. Refs
- Base: `feature/mission-d-wharf` 0adfd8deef75efb251ae9eef0b9f270554bef01b (engine member (d) with S3 merged). Branch
  `feature/tallow-g5`.
- Validators, extracted with `git archive` (scripts, `docs/design`, `src/world/levelMeasure.ts`) into a scratch folder
  and run with plain node:
  - master a2c778c43
  - `<J12 ref>` = `feature/validator-port-c2` bdef649b3 (S11 plus a clean master merge). Outputs are saved as
    `G5-s11-*`, D1's names.
- Both extracts already had `docs/design/metrics.json`, so `metrics-gen` was not run.
- Scratch copies, not committed:
  - TKL-state: `w3-roof>w3-east-wing` set to `bolted: true` (as D1).
  - TGC-state: the stair link `w1-market>w1-gallery` (`fire_stair`) set to `bolted: false`, the gate after A opens it.
- `G5-graph.diff` is `git diff 0adfd8dee -- docs/missions/prototypes/campaign-map/graph.json`.

## 2. Gate checks (brief step 1)
All four gate items pass:
1. `docs/tallow-fixes/val/D1-note.md` exists, and `WHARF_GUARD_EXTRAS` is `[]` (`tallowWharfSectors.ts:186`).
2. G1-G4 and E8 are in the base, under D1.
3. S3 is merged: `placeShutter(b, SHUTTER)` is at `tallowWharfW1.ts:201`, and `git grep "standIn("` finds nothing in
   `src` or `tests`.
4. Michael answered G5-Q1 with answer 1.

The base tests were green before any change: `w1.test.ts` 49 passed, `sectors.test.ts` 43 passed.

## 3. What was built (`tallowWharfW1.ts`, `tallowWharfSectors.ts`)
Every piece is at the coordinates in step 2. Only the void fill below is new.
- **Gone:** the ladder anchor (6.45, 15.0), its cage walls and its foot door.
- **The core:** east wall x 7.4-7.5; south wall z 14.4-14.5; north wall z 24.3-24.4 with the open foot arch x 6.2-7.2,
  2.1 high and no leaf; roof y 6.9-7.0. Every wall runs y 0-6.9.
- **The deck-edge screen:** x 5.95-6.05, y 4.5-6.9, with the gate gap at z 14.6-15.6.
- **The head landing:** x 6.0-7.4, z 14.5-15.8, top 4.5.
- **The flight:** `stairSteps(4.5)` gives 27 risers and a 7.695 m run (the brief's "7.7"). It is 1.3 m wide (x 6.05-7.35),
  its foot is at z 23.495, and it rises south at yaw PI. That leaves a 0.805 m foot landing to the arch.
- **The head gate:** `doorIn(b, false, 6.0, 15.1, 4.5, { w: 1.0 })`, hinged at the south jamb (6.0, 4.5, 14.6). Swing +1
  opens the leaf toward +x, so it lies along the landing's south edge. Its far z is 14.69, which leaves 0.91 m clear in the
  gap and 1.11 m to the flight head. The door is `w1-gallery-stair-gate` in `DOORS`, and `W1_BOLTS` slot 2 is
  `{ at: at2(...), side: [-1, 0], w: 1.0 }` (counts `[3, 7, 5, 2]`).
- **Void fill (deviation 1).** The nav grid had floor cells at y 0 under the flight's upper half (sealed, but cells all the
  same). This was measured, not assumed: before the fill, `heightAt(6.7, 16.5, 0)` = 0, then 0 at z 18 and 1.94 at z 20.
  As the brief says ("fill it with mass as W3 :221"), three stepped `mass` boxes fill it: z 15.8-17.8 to 2.9, 17.8-19.8 to
  1.75, and 19.8-21.3 to 0.9. Each top is at least 0.03 m under the ramp's underside at its north end, and at most
  1.25 m of air is left over any of them. After the fill, `heightAt` under the flight returns the ramp surface everywhere
  (16: 4.28, 16.5: 3.99, 18: 3.11, 20: 1.94, 22: 0.77). No measured number changed.
- **Every collide piece is `noLedge`:** the walls and `blk` are by construction, and the flight and the fill are marked. The
  w1 test checks every collide piece in the core's plan.
- **Header:** only the ladder clauses changed. S3's shutter wording is untouched.

## 4. Measured (step 5; `_g5measure.test.ts`, appendix). Legs at 1.3 m/s, reach at 3.0 m/s
Engine times:
- The boost is 2.6 s (brace hold, boost, climb-up and stand).
- The unbolt is 0 s: the bolt item is added with hold time 0 (`sectorTeamDoors.ts`). The plan estimated about 1 s.
- The hatch is 1.63 s: a 0.22 s crouch (`MOVEMENT.crouchTime`), a 0.71 s fall from 4.5 m at g 18, and 0.70 s of landing
  recovery (`playerController.ts:697`; the landing is a roll).

**P**, B's market point: (11.83, 0, 14.5). It is where the nav path from the listening spot to the clock first crosses
z 14.5. The path's waypoints are (12.25, 13.25), (11.25, 16.25), (11.25, 36.75), (22, 41). B goes round the counter's west
end and up the strip west of the stall rows (at x 11.25, east of the stair core x 7.5).

| Check | Plan expected | Measured | Limit |
| --- | --- | --- | --- |
| Leg a door to door (boost 2.6 + landing -> bolt 0.86 + unbolt 0 + bolt -> office door 23.78 + office door -> desk -> hatch 7.60 + hatch 1.63) | ~37.3 s | **36.47 s** | 90 s |
| Leg b door to door (stall side 0 + open side -> listening spot -> P 12.80 + P -> clock -> arch 28.38) | ~40.9 s | **41.18 s** | 90 s |
| Parity, door to door | 9% | **11.4%** | 20% |
| Leg a, F to the shutter (22, 0, 57.2) (+ F -> spot 3.55 + under the hatch -> shutter 10.78) | ~51.7 s | **50.80 s** | 90 s |
| Leg b, F to the shutter (+ F -> stall 3.85 + arch -> shutter 10.15) | ~55.1 s | **55.18 s** | 90 s |
| Parity, F to the shutter | 6% | **7.9%** | 20% |
| Stair link, arch (6.7, 0, 24.4) -> gate (6.0, 4.5, 15.1) | ~10.5 m | **10.96 m** | - |

**Partner reach, gate open (A opened it on landing):**

| From -> to | Plan | Measured |
| --- | --- | --- |
| B: listening spot -> deck (5.0, 4.5, 15.1) | 10.9 s | 11.47 s |
| B: the arch (22, 0, 44) -> deck (worst on B's route) | ~12.3 s | **12.77 s** |
| B: the clock (22, 0, 41) -> deck | - | 12.24 s |
| B: P -> deck | - | 8.21 s |
| B: the stall's open side -> deck | - | 9.66 s |
| A: desk -> market by the deck edge (5.7, 4.5, 43.5), the 4.5 m fall (0.71 s), landing (6.4, 0, 43.3) | 3.3 s | 3.25 s |
| A: desk -> market by the warden's stair | 5.2 s | 5.23 s |
| A: hatch -> market by the warden's stair | 3.7 s | 3.70 s |
| A: (4, 4.5, 15) -> market down the gallery stair | - | 4.44 s |
| Report only (G5-Q1): the market's north-east end (35.7, 0, 43.7) -> deck | ~16.3 s | **16.90 s** |
| Report only (G5-Q1): the side door's market side (33, 0, 43.5) -> deck | ~15.5 s | **15.97 s** |

- Every measured leg pair is within 20%. Each leg is under 90 s. Every reach on B's route and on A's side is under 15 s:
  B's worst is 12.77 s, a 2.2 s margin.
- No check is within 1 s of its limit.
- The two far-corner points are 0.6 and 0.5 s over the plan's estimates. Michael's question said "about 16 seconds"; the
  north-east end measures 16.9 s. They are reported, not a stop (G5-Q1 answer 1). The `w1-market` note says "about 17 s".
- **C1 (soloNav, gate and warden-stair foot shut):** there is no path from (7, 0, 10), (16, 0, 10) or (22, 0, 41) to the
  deck (4, 4.5, 20). The arch -> head landing path is open (the stair ends at the bolted gate). Control, with the gate open:
  all three reach the deck. Both are also w1 tests.

## 5. The graph (steps 6 and 7; `G5-graph.diff`)
Lengths are on the 0.5 m grid, `time_s` to 0.1 s. Each touched W1 link's `note` says "measured from the build (J8 G5,
2026-10-26)".

| Link (index, kind) | Field | Before | After |
| --- | --- | --- | --- |
| 73: `w1-canal-steps>w1-gallery` (`ladder`) -> `w1-market>w1-gallery` (`fire_stair`) | all | ladder, length 6, time_s 3, at [6.6, 0, 14.4] | route high, `assist` "tgc-leads", width 1.3, level_change 4.5, length **11**, no time_s, bolted, at [6.7, 0, 24.4], the brief's reason |
| 4: `w1-market>w1-gallery` (`coop_boost`) | assist | "tgc-leads" | removed |
| 1: `w1-canal-steps>w1-tea-stall` (`opening`) | length | 9 | 5 (5.00) |
| 2: `w1-tea-stall>w1-market` (`opening`) | length | 19.5 | 16.5 (6.94 + 9.70 = 16.64, to P) |
| 3: `w1-canal-steps>w1-gallery` (`coop_boost`) | time_s | 5 | 6.1 (4.61 m / 1.3 + 2.6) |
| 6: `w1-gallery>w1-warden-office` (`door`) | length | 20 | 31.5 (31.40) |
| 7: `w1-market>w1-warden-office` (`fire_stair`) | reason | "bolted from the stair (office) side at night" | the warden locks it behind him with his key on his rounds (LP pick 13); a thumb-turn on the stair side |
| 8: `w1-warden-office>w1-fish-hall` (`drop`) | time_s | 3 | 9.2 ((4.12 + 5.76) / 1.3 + 1.63) |
| 9: `w1-market>w1-fish-hall` (`opening`, the arch) | length | 22 | 37 (33.90 + 3.00 = 36.90, from P) |
| 10: `w1-market>w1-fish-hall` (`door`, the side door) | length / at | 22 / [22, 0, 44] | 44.5 (44.47, from P) / [33, 0, 44] |
| `w1-market` (space) | tags / note | no split tag | + `split:tgc-leads:b`; the note adds leg b's story and the G5-Q1 corner line |
| `w1-tea-stall` (space) | room_class / area / size / note | break_room / [12, 6, 20, 14.5] / [8, 8.5, 12] | custom / [12, 6, 20, 14] / [8, 8, 12] / "custom: an 8 x 8 open-air tea stall ... (lead ruling, G5 plan ruling 2)" |
| `w1-gallery` (space) | note | the ladder sentence | the stair and its head gate |
| 35: `w3-roof>w3-west-wing` (`drop`) | time_s | 10 | 13.9, lead ruling (G5 plan) |
| 36: `w3-east-yard>w3-east-wing` (`door`) | time_s | 1.5 | 2.0, lead ruling (G5 plan) |
| 34: `w3-roof>w3-east-wing` (`fire_stair`) | time_s | 14 | 14.8, lead ruling (G5 plan); width stays 1.3 (built 1.2: G6, the J8 gate list) |
| 21: `w2-arcade>w2-reading-room` (`open_stair`) | width | 2.4 | 1.7, lead ruling (G5 plan) |
| 30: `w2-lane-window>w2-arcade-roof` (`ladder`) | time_s | 5 | 15.1, lead ruling (G5 plan, ruling 1) |

**Split sums.** S11's own sums were read from an instrumented scratch copy of the J12 ref (one print line; the copy is not
kept):
- Leg a: link 3 (6.10) + link 6 (31.5 / 1.3 = 24.23) + link 8 (9.20) = **39.53 s**.
- Leg b: link 1 (3.85) + link 2 (12.69) + link 9, the arch (28.46) = **45.00 s**.
- Parity is **12.2%** (plan: 39.9 vs ~44.8, ~11%).
- Link 10, the side door, is 44.5 m (34.23 s). That is longer than link 9's 37 m, so S11 sums link 9: B's route, not the
  side door. Nothing to flag.
- TKL `tkl-wings` with the rulings: 23.50 vs 19.60 s, 16.6% (plan 17%).

## 6. Validator runs (`docs/tallow-fixes/val/G5-*.txt`)
| File | Validator | Graphs | D1 ERR / WARN | G5 ERR / WARN |
| --- | --- | --- | --- | --- |
| `G5-master-map.txt` | master | map | 3 / 10 | 3 / 12 |
| `G5-master-map-tgc.txt` | master | map + TGC | 3 / 10 | 3 / 12 |
| `G5-master-map-tkl.txt` | master | map + TKL | 3 / 10 | 3 / 12 |
| `G5-master-tklstate.txt` | master | map, bulkhead `bolted: true` | 3 / 10 | 3 / 12 |
| `G5-master-tklstate-tkl.txt` | master | map (bulkhead bolted) + TKL | 3 / 10 | 3 / 12 |
| `G5-s11-map.txt` | validator-port-c2 (S11) | map | 2 / 10 | 1 / 12 |
| `G5-s11-map-tgc.txt` | validator-port-c2 (S11) | map + TGC | 2 / 10 | 1 / 12 |
| `G5-s11-map-tkl.txt` | validator-port-c2 (S11) | map + TKL | 2 / 10 | 1 / 12 |
| `G5-s11-tgcstate.txt` | validator-port-c2 (S11) | map, the stair `bolted: false` (TGC-state, scratch) | - | 1 / 12 |
| `G5-s11-tgcstate-tgc.txt` | validator-port-c2 (S11) | map (the stair unbolted) + TGC | - | 1 / 12 |

Each validator prints the same lines on all of its runs (the TGC-state runs aside).

**ERR lines.**
- **Master: the same 3 as D1.**
  - The two named A22 throw lines: `link w2-pawn-loft -> w2-reading-room (team_throw): gap 4.9 m above the 2.7 m throw` and
    `link w2-arcade-roof -> w3-roof (team_throw): ...`.
  - `split tgc-leads leg a: no solo link leads into w1-gallery`. S11 is not on master yet.
- **S11: the split's parity line is gone.**
  - One named ERR is left: `split tgc-leads: a downed partner at w1-tea-stall cannot be reached from the other leg`. This
    is the partner reach through the bolted stair. Marlow's S11 change 2 (section 9) clears it: a `bolted` link with
    `assist` whose bolt side is a leg's first space counts as open in that split's reach.
  - The message still names the wrong end (S11 change 1).
  - The two throws are INFO (long throw at an approved spot). `split tgc-leads leg a: entered by link w1-canal-steps ->
    w1-gallery (coop_boost)` is INFO (A28).
- **TGC-state (the stair unbolted, scratch only).**
  - There is no tgc-leads line: no parity line and no reach line. That is what Marlow's assist rule will give.
  - One other line appears, the expected solo twin: `link w1-market -> w1-gallery (coop_boost) has a solo twin: link
    w1-market -> w1-gallery (fire_stair)`. It exists only in this scratch state: in the map the stair is bolted from the
    deck, and Marlow's rule keeps assist links out of the solo-twin check (plan section 5).

**WARN lines: D1's 10, plus 2 new ones, each with its reason.**
- D1's 10, unchanged:
  - `room_class custom` x5: `w1-canal-steps`, `w2-arcade-roof`, `w3-roof`, `w3-chute`, `w4-boat`.
  - `w3-chute` size 1.2 off the 0.5 m grid.
  - The two A5 door lengths 12.4 and 9.8 off the grid.
  - `w2-pawn-loft` size 5.6 off the grid.
  - `w3-east-yard: 2 guards (2 players) below the early band 3-6`.
- **New** `w1-tea-stall: room_class custom`: an 8 x 8 open-air stall between the canal rail and the market. There is no
  sheet class (lead ruling, G5 plan ruling 2). Its note says why.
- **New** `link w2-arcade -> w2-reading-room (open_stair): width 1.7 m below 2.4 m`: the stair hall is as Michael approved
  it. `open_stair_w` is WARN-level (lead ruling, G5 plan ruling 4). P1 writes the reason into the SPEC.

There is no new ERR. INFO lines: S11 also prints nine `pending V6` lines, the same set as before.

## 7. EGRESS.md (step 8)
- **E5:** the stair link as in section 5 (`w1-market>w1-gallery`, `fire_stair`, bolted, 1.3, length 11, assist, at
  [6.7, 0, 24.4]).
- **W1 0:** the warden locks it behind him with his key going out on his rounds (LP pick 13); a thumb-turn on the stair
  side.
- **W1 2:** the head gate (6.0, 4.5, 15.1), side the gallery (`[-1, 0]`): "the warden shoots it from the deck on his
  rounds; an exit from the deck opens without a key".
- **Pick 1:** reduced to "superseded by J8 G5: the gate moved to a stair's head, where no top-out applies".
- **Deviation 2.** The brief turns "the new gallery ladder (E5)" into "the gallery stair (E5)" in the office-block row,
  but the rest of that sentence ("is exterior climbing (16.2.6), not a counted stair") would then be wrong for a stair. The
  sentence now reads: "The gallery stair (E5) serves the open deck, not the office (its head gate opens onto the gallery),
  so it is not one of the office's counted stairs."

## 8. Tests
- `tests/tallowWharf/w1.test.ts`: 48 passed. The doors list now names `w1-gallery-stair-gate`. The ladder block is replaced
  by `W1 gallery stair (J8 G5, EGRESS E5)`, with five tests:
  - **The core:** the walls, roof, landing, screen, ramp and void fill, and every collide piece in the core's plan is
    `noLedge`.
  - **The gate:** a 1.0 m door hinged at z 14.6 whose open leaf points +x, with at least 0.6 m clear.
  - **soloNav, gate and foot shut:** no path from the three floor points; the arch reaches the landing.
  - **Control, gate open:** all three reach the deck.
  - **C1 lips:** jump and level-run checks.
    - The head landing is left out of `soloLevelThreats`. The helper reads boxes only, and its one way onto the deck is
      the gate's gap, a door; the soloNav test is the proof.
    - The core's roof (top 7.0) is left out too. The helper reported it ("top 7.00 at (6.725, 19.4): 0.21 m from the co-op
      top at 4.5"), but it has no way up: 2.5 m over the deck, more than `SCREEN`, and noLedge.
    - A control block over the core is still reported.
- `tests/tallowWharf/sectors.test.ts`: 43 passed (`CORES` `w1-gallery-stair` [6.0, 14.4, 7.5, 24.4]; the W1 want row
  `['w1-gallery', 'w1-gallery-stair']`).
- `tests/tallowWharf/shell.test.ts`: 20 passed. Also w2 79, w3 54, w4 52 and levelGap 6 passed (the graph readers).
- `npm run typecheck:fast`: clean.
- `npx eslint src/world/maps/tallowWharfW1.ts src/world/maps/tallowWharfSectors.ts tests/tallowWharf/w1.test.ts
  tests/tallowWharf/sectors.test.ts`: clean.
- No e2e or GPU check is in G5's scope. The wharf e2e walks W1 by `legUp` and `cross`, never by the gallery ladder. Laptop:
  pending PC run (`e2e-sectorops:wharf-tgc`, the affected set).

## 9. Open items for the lead
- **J7 BEAT line:** "A unbolts the stair's head gate as he lands"; leg a leaves by the inspection hatch (link 8, checker
  polish 3).
- **Marlow, S11:**
  1. The reach message names the reviver's end: "a partner downed in <other leg> cannot be reached from <src>".
  2. A `bolted` link with `assist: "<split>"` whose bolt side (`to`) is a leg's first space counts as open in that split's
     reach only. It never counts in the forced-gate, solo-twin, rejoin or gate-reach checks.
  Until 2 lands, the one named tgc-leads reach ERR stays.
- **G6:** the W3 bulkhead flights are built 1.2 m against `fire_stair_w` 1.3. The graph keeps 1.3 as a named open line on
  the J8 gate list (G5 plan ruling 5).
- **LP / GBM:** the core hides the market strip x 6-12, z 14-23 from the gallery's market vantage pair (3, 4.5, 29.4 /
  30.8): re-check that pair (W1.ts debug points).
- **P1:** the walk-card line and the PLAN.svg note. The stair is an enclosed iron box 1.5 x 10 m, 6.9 m tall (2.4 m over the
  deck), x 6.0-7.5, z 14.4-24.4, with the foot arch at z 24.4 and the head gate at (6.0, 4.5, 15.1). G5-Q1 walk-card line:
  "a partner who strays to the market's far end is about 17 s from the gallery". It measures 16.9 s: 0.6 s more than the
  "about 16" Michael was told.
- **Stale deviation (not touched):** `tallowWharfW1.ts` `deviations` still says the tea stall is "z max 14, not 14.5". The
  graph area is now z 14, so it no longer differs. No test needs it gone (the brief's condition), so it is left for the
  lead.
- **Pre-fix copies:** the base's `docs/tallow-fixes/G5-plan.md` and `briefs/G5.md` are untouched. The lead replaces them.
- **Nothing within 1 s of a limit.** The closest is B's arch -> deck at 12.77 s against 15.

## 10. Appendix: the measuring test and its output
The test was `tests/tallowWharf/_g5measure.test.ts`. It was run with
`G5_OUT=<scratch>/g5measure.json npx vitest run tests/tallowWharf/_g5measure.test.ts --maxWorkers=2 --silent=false` and
deleted before the note's commit (never committed). To rerun it, paste it back at that path. The output follows, one
top-level key per line, from the final run (after the void fill; the run before the fill printed the same numbers except
`underFlight`, which had floor cells at y 0 at z 16.5 and 18).

```ts
/**
 * J8 G5 temporary measuring test (never committed): the TGC split `tgc-leads` and its partner reach on the built map with the
 * gallery stair. Walks are nav paths over the runtime nav grid (`soloNav`, every door open unless listed), 3D along stairs; the
 * boost, the unbolt, the hatch and the drops are timed from the engine's own constants (D1-note section 14's method).
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { hyp2 } from '../../src/core/mathx';
import { MOVEMENT, TEAM } from '../../src/config/movement';
import { GRAVITY } from '../../src/physics/havok';
import { CLIMB_UP_STAND, CLIMB_UP_TIME } from '../../src/player/attachController';
import { LANDING, landingKind } from '../../src/player/movement';
import { BOLT_REACH } from '../../src/game/sectors';
import { tallowWharf } from '../../src/world/maps/tallowWharf';
import { W1 } from '../../src/world/maps/tallowWharfW1';
import { builtWharf, soloNav, type ShutDoor } from './helpers';

type P = [number, number, number]; // x, y, z
const SPLIT = 1.3;
const REACH = 3.0;
const G = -GRAVITY.y;
const r2 = (v: number): number => Math.round(v * 100) / 100;
const fall = (h: number): number => Math.sqrt((2 * h) / G);
/** playerController.ts:697-700: a landing's recovery (s) from its fall speed, at least `LANDING.heavyRecovery` when heavy. */
const landRecovery = (h: number): number => {
  const v = G * fall(h);
  let t = v > 3 ? Math.min(0.7, 0.15 + (v - 3) * 0.08) : 0;
  if (landingKind(h) === 'heavy') t = Math.max(t, LANDING.heavyRecovery);
  return t;
};
const BOOST = TEAM.braceHold + TEAM.boostTime + CLIMB_UP_TIME + CLIMB_UP_STAND;
/** The bolt's item is added with hold time 0 (`sectorTeamDoors.ts` `ints.add(..., 'Unbolt', 0)`): a tap. */
const UNBOLT = 0;
/** Through the 1.2 m high inspection hatch crouched (`MOVEMENT.crouchTime`), the 4.5 m drop, the landing's recovery. */
const HATCH_H = 4.5;

describe('J8 G5 measure (temporary)', () => {
  it('prints the built numbers', () => {
    const { b, layout } = builtWharf();
    const seeds = [layout.playerSpawns[0]!.pos, ...(layout.navSeeds ?? []), new Vector3(73.5, -4.4, 5.0), new Vector3(70, -4.4, 4.5)];
    const { nav, restore } = soloNav(b, tallowWharf.navLayers ?? 3, seeds, []);
    const out: Record<string, unknown> = {};
    try {
      /** Nav path length a -> c (3D along stairs), or null (D1's navLen). */
      const navLen = (a: P, c: P): number | null => {
        const p = nav.findPath([a[0], a[2]], [c[0], c[2]], 1e6, a[1], c[1]);
        if (!p) return null;
        let len = 0;
        let px = a[0];
        let pz = a[2];
        let py = a[1];
        for (let i = 0; i < p.length; i++) {
          const w = p[i]!;
          const d = hyp2(w[0] - px, w[1] - pz);
          const n = Math.max(1, Math.ceil(d / 0.1));
          const y0 = py;
          for (let s = 1; s <= n; s++) {
            const x = px + ((w[0] - px) * s) / n;
            const z = pz + ((w[1] - pz) * s) / n;
            let y = nav.heightAt(x, z, py);
            if (!Number.isFinite(y) || Math.abs(y - py) > 0.5) y = py;
            py = y;
          }
          if (i === p.length - 1) py = c[1];
          len += hyp2(d, py - y0);
          px = w[0];
          pz = w[1];
        }
        return r2(len);
      };
      const need = (v: number | null, what: string): number => {
        expect(v, what).not.toBeNull();
        return v!;
      };
      const sum = (o: Record<string, number>): number => r2(Object.values(o).reduce((p, q) => p + q, 0));
      const pct = (x: number, y: number): number => r2((Math.abs(x - y) / Math.max(x, y)) * 100);

      out.engine = { boost_s: r2(BOOST), unbolt_s: UNBOLT, boltReach_m: BOLT_REACH, crouch_s: MOVEMENT.crouchTime, fall45_s: r2(fall(HATCH_H)), landRecovery45_s: r2(landRecovery(HATCH_H)), landing45: landingKind(HATCH_H), gravity: G };
      const HATCH = MOVEMENT.crouchTime + fall(HATCH_H) + landRecovery(HATCH_H);

      // ---- points ----
      const F: P = [W1.entry[0], 0, W1.entry[2]];
      const spot: P = [W1.legUps[0]!.x, 0, W1.legUps[0]!.z];
      const land: P = [4, 4.5, 14.6];
      const boltSpot: P = [5.0, 4.5, 15.1];
      const officeDoor: P = [4, 4.5, 46];
      const desk: P = [3, 4.5, 50];
      const hatch: P = [7.4, 4.5, 53.1];
      const below: P = [8.6, 0, 53.1];
      const shutter: P = [22, 0, 57.2];
      const teaIn: P = [12, 0, 10];
      const listen: P = [18.8, 0, 8.6];
      const clock: P = [22, 0, 41];
      const arch: P = [22, 0, 44];
      const sideDoor: P = [W1.doors['w1-hall-side']![0], 0, W1.doors['w1-hall-side']![2]];
      const archway: P = [6.7, 0, 24.4];
      const gate: P = [6.0, 4.5, 15.1];
      const stairHead: P = [7, 4.5, 51.5];
      const stairFootIn: P = [7, 0, 44.6];
      const out1: P = [7, 0, 43.4];

      // ---- P: where B's path listening spot -> clock first crosses z 14.5 ----
      const path = nav.findPath([listen[0], listen[2]], [clock[0], clock[2]], 1e6, 0, 0)!;
      expect(path).not.toBeNull();
      let Pp: P | null = null;
      let qx = listen[0];
      let qz = listen[2];
      for (const w of path) {
        if (qz < 14.5 && w[1] >= 14.5) {
          const t = (14.5 - qz) / (w[1] - qz);
          Pp = [r2(qx + (w[0] - qx) * t), 0, 14.5];
          break;
        }
        qx = w[0];
        qz = w[1];
      }
      expect(Pp).not.toBeNull();
      const P0 = Pp!;
      out.P = { P: P0, path: path.map((w) => [r2(w[0]), r2(w[1])]) };

      // ---- leg a (Eyes): boost, the gate, the gallery, the office, the hatch ----
      const a = {
        forkToSpot: need(navLen(F, spot), 'F spot'),
        landToBolt: need(navLen(land, boltSpot), 'land bolt'),
        boltToOfficeDoor: need(navLen(boltSpot, officeDoor), 'bolt office'),
        landToOfficeDoor: need(navLen(land, officeDoor), 'land office'),
        officeDoorToDesk: need(navLen(officeDoor, desk), 'desk'),
        deskToHatch: need(navLen(desk, hatch), 'hatch'),
        belowToShutter: need(navLen(below, shutter), 'below shutter'),
      };
      // ---- leg b (Ears): the tea stall, then tailing the coats to the clock arch ----
      const bb = {
        forkToTea: need(navLen(F, teaIn), 'F tea'),
        teaToListen: need(navLen(teaIn, listen), 'listen'),
        listenToP: need(navLen(listen, P0), 'listen P'),
        PToClock: need(navLen(P0, clock), 'P clock'),
        clockToArch: need(navLen(clock, arch), 'clock arch'),
        archToShutter: need(navLen(arch, shutter), 'arch shutter'),
        listenToClock: need(navLen(listen, clock), 'listen clock'),
        PToSideDoor: need(navLen(P0, sideDoor), 'P side door'),
      };
      out.a = a;
      out.b = bb;
      // door to door: leg a from the boost (its first move off the fork) to its landing in the fish hall (under the hatch);
      // leg b from the tea stall's open side to the clock arch, its door into the fish hall
      const aDoor = { boost: r2(BOOST), landToBolt: r2(a.landToBolt / SPLIT), unbolt: UNBOLT, boltToOfficeDoor: r2(a.boltToOfficeDoor / SPLIT), officeToHatch: r2((a.officeDoorToDesk + a.deskToHatch) / SPLIT), hatch: r2(HATCH) };
      const bDoor = { canalToTea: 0, teaToP: r2((bb.teaToListen + bb.listenToP) / SPLIT), PToArch: r2((bb.PToClock + bb.clockToArch) / SPLIT) };
      // both legs from the start F to the fish hall shutter (the signed-off merge)
      const aShut = { ...aDoor, forkToSpot: r2(a.forkToSpot / SPLIT), belowToShutter: r2(a.belowToShutter / SPLIT) };
      const bShut = { ...bDoor, canalToTea: r2(bb.forkToTea / SPLIT), archToShutter: r2(bb.archToShutter / SPLIT) };
      out.door = { a: aDoor, b: bDoor, sumA: sum(aDoor), sumB: sum(bDoor), pct: pct(sum(aDoor), sum(bDoor)) };
      out.toShutter = { a: aShut, b: bShut, sumA: sum(aShut), sumB: sum(bShut), pct: pct(sum(aShut), sum(bShut)) };

      // ---- the stair link, door to door: the foot archway to the head gate ----
      const stairLen = need(navLen(archway, gate), 'stair');
      // ---- the graph's links (lengths on the 0.5 m grid, time_s to 0.1) ----
      const g05 = (v: number): number => Math.round(v * 2) / 2;
      const links = {
        l1_canalToTea_len: { exact: bb.forkToTea, graph: g05(bb.forkToTea) },
        l2_teaToMarket_len: { exact: r2(bb.teaToListen + bb.listenToP), graph: g05(bb.teaToListen + bb.listenToP) },
        l3_boost_time: { exact: r2(a.forkToSpot / SPLIT + BOOST), graph: Math.round((a.forkToSpot / SPLIT + BOOST) * 10) / 10 },
        l6_galleryToOffice_len: { exact: a.landToOfficeDoor, graph: g05(a.landToOfficeDoor) },
        l8_officeToHall_time: { exact: r2((a.officeDoorToDesk + a.deskToHatch) / SPLIT + HATCH), graph: Math.round(((a.officeDoorToDesk + a.deskToHatch) / SPLIT + HATCH) * 10) / 10 },
        l9_arch_len: { exact: r2(bb.PToClock + bb.clockToArch), graph: g05(bb.PToClock + bb.clockToArch) },
        l10_sideDoor_len: { exact: bb.PToSideDoor, graph: g05(bb.PToSideDoor) },
        l73_stair_len: { exact: stairLen, graph: g05(stairLen) },
      };
      out.links = links;

      // ---- partner reach at 3.0 m/s, the gate open (A opened it on landing) ----
      const deckIn: P = [5.0, 4.5, 15.1];
      const edge: P = [5.7, 4.5, 43.5];
      const edgeLand: P = [6.4, 0, 43.3];
      const reach = {
        listenToDeck: r2(need(navLen(listen, deckIn), 'listen deck') / REACH),
        archToDeck: r2(need(navLen(arch, deckIn), 'arch deck') / REACH),
        clockToDeck: r2(need(navLen(clock, deckIn), 'clock deck') / REACH),
        PToDeck: r2(need(navLen(P0, deckIn), 'P deck') / REACH),
        teaInToDeck: r2(need(navLen(teaIn, deckIn), 'tea deck') / REACH),
        deskToMarketByEdge: r2(need(navLen(desk, edge), 'desk edge') / REACH + fall(4.5)),
        deskToMarketByWardenStair: r2((need(navLen(desk, stairHead), 'desk head') + need(navLen(stairHead, stairFootIn), 'head foot') + r2(hyp2(stairFootIn[0] - out1[0], stairFootIn[2] - out1[2]))) / REACH),
        hatchToMarketByWardenStair: r2((need(navLen(hatch, stairHead), 'hatch head') + need(navLen(stairHead, stairFootIn), 'head foot2') + r2(hyp2(stairFootIn[0] - out1[0], stairFootIn[2] - out1[2]))) / REACH),
        galleryHeadToMarketByStair: r2(need(navLen([4, 4.5, 15], [6.7, 0, 24.8]), 'gallery stair down') / REACH),
        landingFallFromEdge_s: r2(fall(4.5)),
        edgeLanding: edgeLand,
      };
      // report only (G5-Q1): the market's far corner and the side door's market side, to the deck, gate open
      const corner = {
        northEastToDeck: r2(need(navLen([35.7, 0, 43.7], deckIn), 'NE deck') / REACH),
        sideDoorMarketToDeck: r2(need(navLen([33, 0, 43.5], deckIn), 'side deck') / REACH),
      };
      out.reach = reach;
      out.corner = corner;
      // the void under the flight: is any nav cell there at floor height (y 0)?
      const under = [16, 16.5, 17.5, 18, 19, 20, 21, 22].map((z) => ({ z, y0: r2(nav.heightAt(6.7, z, 0)), y45: r2(nav.heightAt(6.7, z, 4.5)) }));
      out.underFlight = under;
    } finally {
      restore();
    }

    // ---- C1: the gate shut (and the warden-stair foot) ----
    const gateShut: ShutDoor = { at: [6.0, 15.1], y: 4.5, w: 1.0, alongX: false };
    const footShut: ShutDoor = { at: [7, 44], y: 0, w: 1.2, alongX: true };
    const solo = soloNav(b, tallowWharf.navLayers ?? 3, seeds, [gateShut, footShut]);
    try {
      out.c1 = {
        fromCanal: solo.nav.findPath([7, 10], [4, 20], 1e6, 0, 4.5) !== null,
        fromTea: solo.nav.findPath([16, 10], [4, 20], 1e6, 0, 4.5) !== null,
        fromClock: solo.nav.findPath([22, 41], [4, 20], 1e6, 0, 4.5) !== null,
        stairToLanding: solo.nav.findPath([6.7, 25], [6.7, 15.1], 1e6, 0, 4.5) !== null,
      };
    } finally {
      solo.restore();
    }
    const txt = Object.entries(out).map(([k, v]) => `"${k}": ${JSON.stringify(v)}`).join('\n');
    console.log(txt);
    if (process.env.G5_OUT) writeFileSync(process.env.G5_OUT, JSON.stringify(out, null, 1));
  });
});
```

```
"engine": {"boost_s":2.6,"unbolt_s":0,"boltReach_m":1.6,"crouch_s":0.22,"fall45_s":0.71,"landRecovery45_s":0.7,"landing45":"roll","gravity":18}
"P": {"P":[11.83,0,14.5],"path":[[12.25,13.25],[11.25,16.25],[11.25,36.75],[22,41]]}
"a": {"forkToSpot":4.61,"landToBolt":1.12,"boltToOfficeDoor":30.92,"landToOfficeDoor":31.4,"officeDoorToDesk":4.12,"deskToHatch":5.76,"belowToShutter":14.01}
"b": {"forkToTea":5,"teaToListen":6.94,"listenToP":9.7,"PToClock":33.9,"clockToArch":3,"archToShutter":13.2,"listenToClock":43.25,"PToSideDoor":44.47}
"door": {"a":{"boost":2.6,"landToBolt":0.86,"unbolt":0,"boltToOfficeDoor":23.78,"officeToHatch":7.6,"hatch":1.63},"b":{"canalToTea":0,"teaToP":12.8,"PToArch":28.38},"sumA":36.47,"sumB":41.18,"pct":11.44}
"toShutter": {"a":{"boost":2.6,"landToBolt":0.86,"unbolt":0,"boltToOfficeDoor":23.78,"officeToHatch":7.6,"hatch":1.63,"forkToSpot":3.55,"belowToShutter":10.78},"b":{"canalToTea":3.85,"teaToP":12.8,"PToArch":28.38,"archToShutter":10.15},"sumA":50.8,"sumB":55.18,"pct":7.94}
"links": {"l1_canalToTea_len":{"exact":5,"graph":5},"l2_teaToMarket_len":{"exact":16.64,"graph":16.5},"l3_boost_time":{"exact":6.15,"graph":6.1},"l6_galleryToOffice_len":{"exact":31.4,"graph":31.5},"l8_officeToHall_time":{"exact":9.23,"graph":9.2},"l9_arch_len":{"exact":36.9,"graph":37},"l10_sideDoor_len":{"exact":44.47,"graph":44.5},"l73_stair_len":{"exact":10.96,"graph":11}}
"reach": {"listenToDeck":11.47,"archToDeck":12.77,"clockToDeck":12.24,"PToDeck":8.21,"teaInToDeck":9.66,"deskToMarketByEdge":3.25,"deskToMarketByWardenStair":5.23,"hatchToMarketByWardenStair":3.7,"galleryHeadToMarketByStair":4.44,"landingFallFromEdge_s":0.71,"edgeLanding":[6.4,0,43.3]}
"corner": {"northEastToDeck":16.9,"sideDoorMarketToDeck":15.97}
"underFlight": [{"z":16,"y0":4.28,"y45":4.28},{"z":16.5,"y0":3.99,"y45":3.99},{"z":17.5,"y0":3.4,"y45":3.4},{"z":18,"y0":3.11,"y45":3.11},{"z":19,"y0":2.53,"y45":2.53},{"z":20,"y0":1.94,"y45":7},{"z":21,"y0":1.36,"y45":7},{"z":22,"y0":0.77,"y45":7}]
"c1": {"fromCanal":false,"fromTea":false,"fromClock":false,"stairToLanding":true}
```
