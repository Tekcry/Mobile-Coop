# ART-KIT build report (briefs/ART-KIT.md, A110-A126)

Builder: Opus 5.5, 2026-10-23. Branch `feature/sector-redesign-art-kit` (worktree `C:/NightShift/Mobile-Coop-sector-redesign-art-kit`),
cut from `feature/sector-redesign-p3` at b26c5925. Status: steps 1-9 built; checks run here: `tsc --noEmit` clean, eslint
clean on every changed file, the single vitest files below. Not run here (lead / CI): `npm run check`, `npm run build`, any
e2e, the GPU shots and perf (batch 3).

## Steps and commits
| Step | Commit | What |
| --- | --- | --- |
| 1 | e8fad392 | marlow-final kit ported byte for byte from 906065e4 (AS1; paths in the brief's step 1 list; `Door.leaf` hunk only) |
| 2-3 | 9ea53a02 | `catalogue.ts` (finished from the swap WIP 881f6656), `campusKit.ts`, `scripts/campus-props/{lib.py,kit.py,build.mjs}`, `campus-kit.glb/.json`, `package.json` `campus-props:build` |
| 4 | 45106e92 | `artTags.ts`, `geometry.ts`, `keepouts.ts`, `dressRules.ts`, `finishes.ts` |
| 5 | 3d4669f6 | `dresser.ts`, `maps/campusDress.ts` (registry), five stubs `maps/campusS<N>Dress.ts`, `campusOps.ts` (`buildCampus`), `mapDef.ts` (`campusArt`) |
| 6 | 5792c738 | `campusArtRender.ts`, `BuiltLevel.hidePieces` (`levelBuilder.ts`), the World hook (`world.ts`) |
| 7 | 9a035b81 | `scripts/campus-art-shots.mjs` (35 views), guard-cap `campus` row, `perf.mjs` `MODE` env |
| 8-9 | d83d67d0 ... 5f6084f6 | the five test files, the keepout fixes the gates found (L12-L15), S5 chimneys |

## Numbers
- K: 60 ids (58 meshed + `chairEnv` / `binEnv` box-only), 7028 triangles (budget 18 k), GLB 495 KB (budget 1.2 MB); every
  piece under its budget, sizes within 2 cm of ART-PLAN 3.2, footprints and heights = the build's bounds within 1 cm.
- A113: `node scripts/campus-props/build.mjs --set kit` run 3 times: byte-identical GLB (two fixes in `lib.py`: bevel edges
  sorted by index, triangles in a canonical order; Blender's set order made the bevelled boxes differ per run).
- Campus build: `buildCampus(b, { dress: false })` = the cut greybox `1297/171/9e5541f8` (boxes / cylinders / FNV,
  `tests/helpers/campusHash.ts`). With the stubs `dressCampus` costs nothing (no keepouts built); with all five briefs'
  tags and `base()` it took 838 ms in node.

## Tests (all new files pass; existing files pass unchanged)
| File | Tests |
| --- | --- |
| `tests/campusArtKit.test.ts` (new) | 13 |
| `tests/campusDressRules.test.ts` (new; step 9 smoke inside) | 25 |
| `tests/campusArtGameplay.test.ts` (new; `-t S<n>`) | 42 |
| `tests/campusArtLight.test.ts` (new; `-t S<n>`, 600 s) | 5 |
| `tests/campusArtRender.test.ts` (new; NullEngine + Havok node) | 3 |
| facilityProps 16, facilityKit 18 (A110), campusS1 51, S2 40, S3 32, S4 40, S5 29, campusRuntimeNav 3, sectors 27, sectorItemScope 5, noAmmoPickups 2 (A123) | pass |

**Trial with every brief's tags (not committed; stubs restored):** all five `S<N>_ART_TAGS` filled from the ART-S1..S5 tag
tables, `base()` only. Every gate above passed (gameplay 42, light 5 with a real bake: max delta 0.000 at 2601 points, and
the light gate trips on a test slab), and campusS1..S5, runtime nav, sectors all pass. Base pass alone per section:

| Section | Placements | Draws (of 40) | Tris | Top drop reasons |
| --- | --- | --- | --- | --- |
| S1 | 32 | 15 | 2.7 k | K1 482, C 67, K6 46 |
| S2 | 708 | 25 | 40.9 k | B 481, K2 184, K1 178, C 148 |
| S3 | 140 | 19 | 5.1 k | K1 350, K2 99, C 94 |
| S4 | 160 | 15 | 5.4 k | F 5481 (raised deck), K1 435, K2 116 |
| S5 | 164 | 22 | 11.7 k | F 736, K2 270, C 222 |

## What the ART-S1..S5 dressers must know
**Files (only these):** `src/world/maps/campusS<N>Dress.ts` (replace the stub), `scripts/campus-props/hero_s<N>.py`,
`src/world/campusArt/assets/hero-s<N>.glb/.json` (`npm run campus-props:build -- --set hero-s<N>`), `tests/campusS<N>Dress.test.ts`,
`docs/sector-redesign/checks/art-s<N>-build.md`. The registry is written (`maps/campusDress.ts`, never edit it):
```ts
import { dressS1, HERO_S1, S1_ART_TAGS } from './campusS1Dress';   // ... S2..S5
const DRESSERS: readonly SectionDresser[] = [dressS1, dressS2, dressS3, dressS4, dressS5];
const TAGS = [S1_ART_TAGS, S2_ART_TAGS, S3_ART_TAGS, S4_ART_TAGS, S5_ART_TAGS];
const HEROES = [HERO_S1, HERO_S2, HERO_S3, HERO_S4, HERO_S5];   // hero catalogues found here
```
**The dress file exports (exact):**
```ts
import type { ArtTag } from '../campusArt/artTags';
import type { PropCatalogue } from '../campusArt/catalogue';
import type { CampusDresser } from '../campusArt/dresser';
import { boxAt, cylAt } from '../campusArt/geometry';
export const S<N>_ART_TAGS: Record<string, ArtTag> = { ... };     // every room of S<N>_ROOMS
export const HERO_S<N>: PropCatalogue | null = { id: 'H<N>', ... };
export function dressS<N>(d: CampusDresser): void { /* skins, heroes, then */ d.base(); }
```
**CampusDresser API (`src/world/campusArt/dresser.ts`):**
- `d.ctx` (the section's `DressContext`: `boxes`, `cylinders`, `rooms`, `sector`, ...), `d.cats` (F, K, H<N>), `d.placements`, `d.report`.
- `d.skin(piece, boxIndex, yaw, { why, dy? })`: skins greybox box `boxIndex`; fit pieces scale to it (0.8-1.25, 2 cm proud), others must fit as built; throws on a skinFit failure. Yaw a quarter turn.
- `d.skinRow(piece, boxIndex, alongX, faceSign, { why })`: tiles a long box with `round(len / pitch)` modules (front +z towards `faceSign`); each module skins its slice (`skinPart`).
- `d.skinCyl(piece, cylIndex, { why })`: cylinders (trunks); scale = the cylinder over the piece's `cylFit` (K `treeSkin`: r 0.3, h 5).
- `d.skinHide(piece, boxIndex, yaw, { why })`: AS10 only (cars, the S5 van); the renderer hides that box's drawn instance.
- `d.add(piece, x, y, z, yaw, { cls, why, s?, group?, tint?, free? })`: an exact hero placement (snapped 5 cm / 1 cm, yaw 90 deg unless `free`); throws on any keepout. `y` is the piece origin: floor pieces and wall pieces (modelled at their mount height) take the floor height, hung pieces (`hung`) the mount height, ceiling pieces the ceiling underside.
- `d.base()` last (the rule table, `DRESS_RULES`); `d.write()` and collection are `dressCampus`'s; `d.check()` for the own test (must be `[]`).
- Pieces are `'K:whiteboard'`, `'F:filingCabinet'`, `'H<N>:atriumModel'`; find greybox pieces with `boxAt(d.ctx.boxes, x, y, z)` / `cylAt(d.ctx.cylinders!, x, z)` (box centre within 5 cm; throws on none or two).

**Keepout and rule ids `blocked` returns** (ART-PLAN 4.3 plus what the gates required, L12-L15): K1-K13 as the table;
`C` a visible box tall enough for cover (0.75-1.45 or >= 1.6 m, >= 0.5 m wide) within 3.0 m of a route or patrol leg
(gate item 4); boxes (solid or see) keep `KEEP.navClear` 0.4 m more off K1-K6 / K13 (gate item 2: the agent radius);
`W` a wall piece with no wall within 0.06 behind it; `V` rule V; `S` the skin rule; `F` (base only) a floor piece not
standing on a floor; `B` (base only / `checkDressing`) overlapping a greybox box or another piece. The mount is read from
the placement's geometry (`placementMount`), not declared. Every art box is `noLedge` (L15).

**Hero catalogue template** (give it the report's bounds or the hull falls back to the footprint at 1 m and rule V /
skinFit read it wrong):
```ts
import heroReport from '../campusArt/assets/hero-s<N>.json';
import { CAMPUS_LOOK } from '../campusArt/campusKit';
import { PROP_LOOK } from '../props/facilityProps';
const bounds = Object.fromEntries(Object.entries((heroReport as { pieces: Record<string, { bounds: { min: number[]; max: number[] } }> }).pieces)
  .map(([id, p]) => [id, { lo: [p.bounds.min[0]!, p.bounds.min[1]!, p.bounds.min[2]!] as const, hi: [p.bounds.max[0]!, p.bounds.max[1]!, p.bounds.max[2]!] as const }]));
export const HERO_S<N>: PropCatalogue | null = {
  id: 'H<N>', glb: 'hero-s<N>.glb', ids: [...], materials: [...],
  looks: { ...PROP_LOOK, ...CAMPUS_LOOK },          // only names from these two tables
  collision: { piece: [{ lo, hi }] | [{ lo, hi, see: true }] | null }, footprint: {...}, triBudget: {...},
  hung: [], fit: [...], overhang: {...}, emissive: {...}, pitch: {...},
  bounds, classOf: {...}, profile: { panelVan: [...slabs] } /* skin-hide hull */, cylFit: {...} /* cylinder skins */,
};
```
**Hero Python template** (`scripts/campus-props/hero_s<N>.py`; the facility helpers are in `lib.py`):
```python
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
from lib import box, obox, cyl, prism_x
lib.set_materials({'oakDark': ((0.06, 0.03, 0.01), 0.5, 0.0, (0, 0, 0)), ...})   # names from CAMPUS_LOOK / PROP_LOOK
def atrium_model(): box('atriumModel', 'oakDark', (-1, 0, -0.6), (1, 0.74, 0.6)); ...
def main():
    args = lib.common.parse_args({'--out': {'required': True}, '--name': {'default': 'hero-s<N>'}, '--only': {'default': ''}})
    lib.common.check_version(); lib.common.empty_scene(); lib.common.seed_everything(args.seed)
    atrium_model(); ...
    lib.export(lib.PIECES, args.out, args.name, args.seed)
main()
```
**Gates to run:** `npx vitest run tests/campusS<N>Dress.test.ts`, then `npx vitest run tests/campusArtGameplay.test.ts -t S<N>`,
`tests/campusArtLight.test.ts -t S<N>` (bakes only when solid boxes change the light shapes; ~50 s), `tests/campusS<N>.test.ts`,
`tests/campusRuntimeNav.test.ts`, `tests/campusArtKit.test.ts`.

## Rule table (`DRESS_RULES`, ART-PLAN 4.2 as data)
The table is in `src/world/campusArt/dressRules.ts`, one `RuleItem` list per tag in the plan's column order (an `over`
rule last), and `DOOR_EXTRAS` (exit sign over a door to a corridor / stair / outside, a fire extinguisher by the first
door's latch side, sign plates at 2.2 over each door). Qualifiers became fields (L9): `alt` (palletLoad / palletLoadLow),
`perRun` (one row per run of at least that length: store shelving, plant pipe runs, Old House bookcases), `noWindow`,
`tile` (ceiling grid), `nearWall` (roof cowls 2 m), `minHigh` (dock duct 4.0), `chimney` (oh-formal fireplace).
Counts: `per` gives max(1, round(total / per)) (wall: m of non-glass run; floor and ceiling: m2; a corridor ceiling, a
room under 3 m wide: m along it), capped by `max`; no `per` and no `max`: 1.

## Skipped / left out
- Debug overlay `art d.. t..`: the overlay's extra lines are wired from the game (`src/game/**`, do not touch): skipped (L21).
- Riser `cableTray vertical run`: the facility tray is horizontal only (yaw placements): left out (L10).
- K11 ledges in use: ledges are generated inside `LevelBuilder.build`, after dressing; split gaps are computed in
  `dressCampus` from the greybox cover (L19). `sweep` points: no `SectorDef.sweep` yet.
- Rule-V-dead rules: plant `driveCabinet` (F, centred 0.63 deep) and roof-plant `ductRun` (hung 0.6 over the deck) always
  fail rule V and are dropped, as the plan's rule V says (a hero placement with a see box if wanted).

## L-log (assumed decisions, simplest option, undoable)
- L1 F `fit` list per ART-PLAN 3.1 (`F_FIT`).
- L3 Optional `PropCatalogue` fields: `bounds`, `profile` (hull slabs: cars), `boxColor`, `open` (rule V's open frames),
  `classOf`, `ownSupply` (exit signs: green, gain 0.6, never dimmed).
- L4 Frames: wall pieces modelled at their mount height (whiteboard 0.9-2.1); ceiling pieces (diffuser, smoke detector,
  ceiling grid) have the origin on their top face; `RuleItem.y` = the origin over the floor (wall) or the drop from the ceiling.
- L5 The facility `officeChair` stands in the K `chairEnv` see box on campus (`F_COLLISION_OVERRIDE`); `cafeChair` uses
  `chairEnv`, `litterBin` `binEnv`.
- L6 `ruleV(cat, p, floorY, wallDist)`: `wallDist` is the gap from the wall to the piece's local z = 0 and each hull slab
  is flush when `wallDist + z1 <= 0.15`; negative = hung over a solid run (`OVER_RUN`: wall cupboards).
- L7 `DressContext` optional `cylinders`, `splits` (lazy), `chimneys` (S5 stacks, wired in `campusDress.ts`).
- L8 A co-op lip with a z normal runs along x over its top's x range (CR1-south).
- L9 The rule qualifiers as `RuleItem` fields (above).
- L11 `ArtPlacement.skinPart` (row modules), `PropCatalogue.cylFit` (cylinder skins).
- L12 (gates) boxes keep 0.4 m more off K1-K6 / K13 (nav agent 0.32); rule `C`: cover boxes 3.0 m off K1 / K2 legs.
- L13 The mount is derived from the placement (`placementMount`), so the planner and `checkDressing` agree.
- L14 A base-pass floor piece must stand on a floor at its origin and its four corners (`F`).
- L15 Every art box is `noLedge` (a S5 section rule needs it of 1.1 m+ boxes upstairs; props are no climbing routes).
- L16 K3: the zone is the opening's width + 0.3 each side and 1.4 deep each side of the opening line (1.2 + the wall),
  the swing a disc r = width + 0.1 at the hinge, the wall rule a 0.45-deep band 0.6 past each edge; K13: a door with one
  side in no room or an outdoor-tagged room.
- L17 K4 items' floor = item y - 1.2 (keypads at 1.2, key switches y + 1.2); reinforce points and stage response routes
  have no y in the data: they keep out on every storey.
- L18 K8: a 1 m floor grid, sweep in 5 deg steps, rays from 0.2 m off the lens; clear glass does not block a ray.
- L20 Finishes: boxes larger than their room (the ground, whole slabs) are no room's finish; asphalt `#3a3c3e` (a darker
  one reads as `rubber`); `FINISH_KIND` holds the `pieceKind` of every finish colour.
- L22 `lib.py` determinism (sorted bevel edges, canonical triangle order).
- L24 Wall pieces need a wall within 0.06 (`W`): a sign over an opening with no lintel is dropped.
- L26 Base pass snapping: along a run only (the face stays exact); floor grid 0.5 m.
- L27 `hidePieces` sets the static matrix buffer again (Babylon ignores updates to a static thin-instance buffer).

## Open items for the lead
- `npm run check` (lint + full vitest + build) on CI, and `e2e-sectorops:6` GPU when convenient (stub dressing: the greybox
  plus nothing, so no e2e change is expected).
- The fresh Opus checker (A110-A126).
