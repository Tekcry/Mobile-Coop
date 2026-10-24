status: open

# visual-gate VG3 (cloud copy of docs/visual-gate/briefs/VG3.md on feature/visual-gate @ 0b7f46f4)

Lead: Night Shift | Sector Ops Build (2026-10-24 ~23:30, overnight). CLOUD RULES override the brief's desktop lines:
- Cut `feature/visual-gate-vg3` from `origin/feature/visual-gate` @ 0b7f46f4 in your own checkout (ignore the C:/NightShift worktree path and its guard).
- You own that branch: commit and push it (ignore the preamble's 'never commit / push'); end with the report file the brief names and this file's status line.
- Unit tests only (vitest single files, tsc): no e2e, no GPU, no npm run check. Any GPU / laptop run the brief mentions: write the exact request command into your report; the lead sends it.
- Edit only the files the brief lists (VG1 builds on the desktop at the same time; VG2 / VG3 / VG4 share no file).

---

# VG3 - viewpoints data + shape test (Sonnet builder)

Job visual-gate, group A (parallel with VG1, VG2, VG4). Lead: Night Shift | Sector Ops Build. A data slice: copy
coordinates, do not invent rendering code.

## Where
- Branch `feature/visual-gate-vg3`, cut from the pushed `feature/visual-gate` head; worktree
  `C:/NightShift/Mobile-Coop-visual-gate-vg3` (the lead creates it). Guard before every write:
  `cd /c/NightShift/Mobile-Coop-visual-gate-vg3 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate-vg3 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate-vg3"`
- Read first: `docs/systems/agent-preamble.md` (never commit, push, stash, reset or checkout); CLAUDE.md "Hard rules";
  `docs/visual-gate/BRIEF.md` (A4, A5, A10, A15, A16), `PLAN.md` sections 2 and 3. The branch base is older than master:
  copy every coordinate from origin/master with `git show origin/master:<file>`, and cite `<file>:<line>` at origin/master.

## Files (only these)
- create `scripts/visual-gate/viewpoints.mjs`
- create `tests/visualGateViewpoints.test.ts`
- create `docs/visual-gate/checks/vg3-build.md` (your report)
Do NOT touch: anything under `src/` (read only), the source shot scripts, `metrics.mjs`, `harness.mjs`, `storeLib.mjs`,
`e2e-visual.mjs`, other docs. viewpoints.mjs has NO imports (pure data + JSDoc).

## Contract (the single definition; VG2 / VG5 / VG8 code to it - copy these typedefs verbatim to the top of viewpoints.mjs)
```js
/** World metres, Babylon axes (y up). @typedef {[number, number, number]} Vec3 */
/** @typedef {'low' | 'epic'} Preset */
/** @typedef {'ctcourse' | 'campusOps' | 'warehouseOps' | 'warehouse'} MapId */
/** Boot query WITHOUT gfx / weather (the harness adds `&gfx=<preset>&weather=clear`). @typedef {{ query: string, label: string }} MapCfg */
/** @typedef {'F1' | 'F2' | 'F4' | 'F5' | 'F5b' | 'F6' | 'F7' | 'F8'} Target */
/** null bounds until VG8 calibrates. @typedef {{ min?: number | null, max?: number | null, presets?: Preset[] }} Rule */
/** A world quad, 4 corners in order round the edge (a wall face, a floor patch, a ceiling band). @typedef {[Vec3, Vec3, Vec3, Vec3]} Quad */
/**
 * @typedef {{
 *   id: string,                      // unique; prefix m- / cp- / so- / wh- by map
 *   map: MapId,
 *   src: string,                     // origin/master file:line the coords came from
 *   feet: Vec3,                      // player teleport (meter / field point, 1.7 m body height)
 *   cam: Vec3, target: Vec3,         // photo camera eye and look-at
 *   regions: Record<string, Quad>,   // e.g. wall, upper, floor; 'whole' is implicit, never listed
 *   metrics: Record<string, ('haze' | 'blotch' | 'arc')[]>, // per region extras (stats always); keys subset of regions
 *   rules: Record<string, Rule>,     // '<region>.<metric>'; region in regions or 'whole'
 *   parity: Vec3[] | null,           // grey-card points (Epic only), null for most views
 *   targets: Target[],               // walk finds this view covers ([] for plain coverage views)
 *   known: string | null,            // e.g. 'F5b lr16-8-triage.md:65' (A10)
 * }} View
 */
/**
 * @typedef {{
 *   id: string, map: MapId, src: string,
 *   door: { at: Vec3, src: { 'v4.82.0': string, 'v4.88.0': string, master: string } } | null, // the shut door (centre) per tag; null for so-corner
 *   guard: { pos: Vec3, yaw: number },   // yaw: Enemy.yaw, facing (sin yaw, cos yaw) on (x, z) (src/world/torches.ts:44-50)
 *   feet: Vec3, cam: Vec3, target: Vec3,
 *   regions: Record<string, Quad>,   // must include 'leak'
 *   rules: Record<string, Rule>,     // 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 }
 *   targets: Target[], known: string | null,
 * }} Rig
 */
```
Exports: `export const MAPS` (`Record<MapId, MapCfg>`), `export const PRESETS` (`['low', 'epic']`), `export const VIEWS`
(`View[]`), `export const RIGS` (`Rig[]`). Freeze nothing (VG8 edits rules in place in the source).

## MAPS (exact)
| MapId | query | source |
| --- | --- | --- |
| ctcourse | `autostart=ctcourse&mode=course` | shots-ctcourse.mjs:50 |
| campusOps | `autostart=campusOps&mode=sector&sectorGuards=1` | campus-art-shots.mjs:31 with sectorGuards 0 -> 1 (C0 M2: the cp-door rig needs a guard) |
| warehouseOps | `autostart=warehouseOps&mode=sector&sectorGuards=4` | sector-lights-shots.mjs:33 |
| warehouse | `autostart=warehouse&mode=clear` | e2e-darkness.mjs:10 (A16; sector-lights-shots.mjs:35 used sandbox) |

## VIEWS (26; copy coords exactly, cite the source line)
- Marlow (9): from `SHOT_VANTAGES` (src/world/maps/ctcourse.ts:205 = facility + parts' `shotVantages`; grep the vantage
  name in `src/world/maps/ctcourseSets/*.ts` at origin/master). Exact vantage names (all exist on 92d0205d):
  m-a1-lounge = `a1-lounge-door` (a1Gate.ts:265), m-a2-vantage = `a2-vantage` (a2CarriageShed.ts:371), m-a3-lobby =
  `a3-lobby` (a3OfficeRange.ts:370), m-a4-aisle = `a4-main-aisle-east` (a4GoodsShed.ts:488), m-a5-kiosk = `a5-kiosk`
  (a5Substation.ts:416), m-a6-kerb = `a6-kerb` (a6PumpHouse.ts:388), m-a7-corridor = `a7-corridor` (a7DataHall.ts:445),
  m-a8-vestibule = `a8-vestibule` (a8Strongroom.ts:662), m-f-gallery = `f-gallery-from-a1` (facility.ts:747).
  `feet`, `cam`, `target` from the vantage; a named constant (`A3_POST_WEST`, `A6_VANTAGE`, ...) is resolved to its
  literal number, citing the constant's file:line too.
- Campus (10): campus-art-shots.mjs ROWS :36-77 (`[name, feet, eye, target]`): s1-b, s1-f, s2-b, s2-d, s3-a, s3-c,
  s4-a, s4-e, s5-a, s5-d -> ids cp-s1-b ... cp-s5-d.
- Sector Ops (5): sector-lights-shots.mjs ROWS :40-70 (`[name, feet, cam, target, map?]`, default map ops): s1-goods-in,
  s1-girder, s1-workshop, s2-aisle, s3-hall -> so-s1-goods-in, so-s1-girder, so-s1-workshop, so-s2-aisle, so-s3-hall.
- Warehouse (2): sector-lights-shots.mjs rows `wh-floods-dock`, `wh-flood-workshop` (map warehouse) -> same ids.
- targets: so-s1-goods-in [F1, F2], so-s1-girder [F1], so-s1-workshop [F4], every m-* [F6], m-a3-lobby [F6, F7],
  cp-s2-b / cp-s2-d / cp-s3-a [F8]; others [].
- regions (world quads read from the map source at origin/master: the wall / floor / ceiling boxes in the map builders;
  cite file:line in a comment per quad). Every view: `floor` (a 2-4 m patch of floor in frame) and `upper` (the band
  between head height and the ceiling / roof in frame, where fog and haze show). Plus `wall` on: m-a3-lobby (the north
  wall x 81-96, y 1.8-2.9, BRIEF F7 row), so-s1-workshop (the wall the F4 arcs land on), and every other m-* view that
  faces a wall within 8 m. A quad must sit in front of the camera and mostly inside its view (rough check: each corner's
  direction from `cam` within 50 deg of `cam -> target`; the test enforces it).
- metrics: `wall: ['blotch', 'arc']`, `upper: ['haze']`, `floor: []` wherever the region exists.
- rules: per targets, bounds null (VG8 sets them): F1 / F8 -> `upper.veil` (max), `upper.contrast` (min), presets
  ['epic']; F2 -> `floor.nearBlack` (max); F4 -> `wall.arc` (max), ['epic']; F6 -> `whole.mean` (min), `whole.nearBlack`
  (max); F7 -> `wall.blotch` (max), ['low']. Plain views: `{}`.
- parity: exactly 3 card points per map (12 in all), each on one view of that map (one view may carry 1-3): floor +
  1.0 m, at least 1.2 m from any wall, inside the view's frame; per map aim for one in a lamp pool, one between pools,
  one in the darkest open spot (read lamp positions from the map source; VG5 measures the real level at run time).
  Every other view `parity: null`.

## RIGS (3; read the doors and corridors from the map source at each tag)
- so-door (warehouseOps) and cp-door (campusOps), targets [F5], known null: a shut hinged (not sliding, not locked)
  door that exists with the same anchor (hinge, yaw, width) at v4.82.0, v4.88.0 and origin/master (C0 P12; campusOps
  exists from v4.72.0). Use e2e-darkness.mjs:188-212 as the rule: door mid `m = hinge + (sin yaw, cos yaw) x width / 2`,
  normal `n = (cos yaw, -sin yaw) x s`; guard at `m + n x 1.2` (floor height), facing the door (`yaw = atan2(-n.x, -n.z)`);
  feet and cam at `m - n x 2.2` (cam y = floor + 1.6), target = `m` at y floor + 1.2. Keep the guard >= 1.1 m from the door
  centre (a live guard within `DOOR.enemyReach` 1.0 m pushes a shut door open, src/world/doors.ts:45, :396-401). `door.at` =
  `[m.x, floor, m.z]`; `door.src` cites the door's map file:line at each tag (`git show v4.82.0:<file>`, etc.).
  regions: `leak` = the door leaf plus 0.5 m of wall on each side, floor to door top + 0.3 m, on the camera side face.
  If no door on a map is unchanged at all three tags, stop and say so in the report (do not invent an override field).
- so-corner (warehouseOps), targets [F5b], known `'F5b lr16-8-triage.md:65-87'` (feature/sector-redesign-polish): a
  side corridor meeting a main corridor; guard 4-6 m down the side corridor facing along it towards the junction; camera
  on the main corridor 3-5 m from the junction facing the junction's far corner wall (camera-side of the beam's wall);
  `door: null`; regions `leak` = that corner wall face, floor to 2.5 m, 2 m wide. Same three-tag check on the corridor
  walls.
- rules for all 3: `'leak.mean': { max: 0.004 }`, `'leak.p95': { max: 0.02 }` (PLAN section 2 F5 row).

## Unit tests (`tests/visualGateViewpoints.test.ts`, vitest, node env)
```ts
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { MAPS, PRESETS, VIEWS, RIGS } from '../scripts/visual-gate/viewpoints.mjs';
```
Assert:
- PRESETS deep-equals ['low', 'epic']; MAPS has exactly the 4 MapIds with the queries above; no query contains `gfx=`
  or `weather=`.
- Every rig's map spawns >= 1 guard: if its query has `sectorGuards=N`, N >= 1 (C0 M2); and no map with a rig has
  `sectorGuards=0`.
- 26 views (9 ctcourse, 10 campusOps, 5 warehouseOps, 2 warehouse) and 3 rigs; ids unique across VIEWS + RIGS; id prefix
  matches the map (m- ctcourse, cp- campusOps, so- warehouseOps, wh- warehouse).
- Every Vec3 is 3 finite numbers; every quad is 4 Vec3; |cam - target| >= 0.5; every view's quad corners lie within
  50 deg of the cam -> target direction (helper in the test).
- metrics keys subset of regions keys, values only 'haze' | 'blotch' | 'arc'; rule keys `<region>.<metric>` with region
  in regions or 'whole' (rigs: 'leak'), metric in stats keys (mean, p5, p50, p95, nearBlack) or veil, contrast, blotch,
  arc (rigs: mean, p95); every view rule's min / max is null or absent (VG8 sets them); rig rules exactly as above.
- Targets union covers F1, F2, F4, F5, F5b, F6, F7, F8; the F-target views listed above carry them.
- Parity: per map exactly 3 card points in total; none on rigs.
- `known`: only so-corner has one, and it starts with 'F5b'.
- `src` of every view and rig matches `/\.(mjs|ts):\d+/`; every rig with a door has the three `door.src` tags.

## Acceptance (run all; paste outputs in the report)
- `npx vitest run tests/visualGateViewpoints.test.ts --maxWorkers=2` all pass.
- `npm run typecheck:fast` clean; `npx eslint tests/visualGateViewpoints.test.ts` clean;
  `node --check scripts/visual-gate/viewpoints.mjs`.
- Report table: every view and rig id -> source file:line (origin/master) -> coords; rig doors -> file:line per tag.
- No e2e, no GPU, no `npm run check`, no full `vitest run`, no build. Single vitest files only, `--maxWorkers=2`. You
  cannot see the views: that is fine, VG5's first laptop run checks framing. Any GPU run is requested by the LEAD, not
  you: if a coordinate needs a look, write the request command into the report (the lead decides).

## Report `docs/visual-gate/checks/vg3-build.md`
Built, the source table above, vantage names chosen for the 6 short Marlow ids, regions and how each quad was read,
parity point choice per map, the rig door / corner per tag, deviations and why, test results, files touched, open items.
Final message: done / not done, test results, open items (short).
