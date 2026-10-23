# ART-KIT brief - campus art kit, rules engine, gates and the instancing hook (builder: Opus 5.5; checker: Opus)

Read first: `ART-PLAN.md` (sections 1-4 bind this slice), CLAUDE.md hard rules. Build exactly this. Anything not covered:
pick the simplest option, log it as L1, L2 ... in `checks/art-kit-build.md`; never ask. Acceptance A110-A126.

Branch: `feature/sector-redesign-art`, cut per ART-PLAN section 5 ("Base branch"). Worktree
`C:/NightShift/Mobile-Coop-sector-redesign-art`. Commit and push after every step that compiles.

## Step 1 - bring in the marlow-final kit (AS1)
`git merge-base --is-ancestor origin/feature/marlow-final origin/master`: if true, `git merge origin/master` (resolve as
the lead's merge-m did: both sides). If false, port these files **byte for byte** from `906065e4`
(`git checkout 906065e4 -- <path>`), and nothing else:
- `src/world/kit/staticMerge.ts`, `src/world/kit/kitRender.ts`, `src/world/kit/facilityKit.ts`,
  `src/world/kit/assets/facility-kit.glb`, `src/world/kit/assets/facility-kit.json`
- `src/world/props/facilityProps.ts`, `src/world/props/propRender.ts`, `src/world/props/assets/facility-props.glb`,
  `src/world/props/assets/facility-props.json`
- `scripts/facility-props/build.mjs`, `scripts/facility-props/build.py`, `scripts/facility-kit/build.mjs`,
  `scripts/facility-kit/py/build_kit.py`
- `tests/facilityProps.test.ts`, `tests/facilityKit.test.ts`
If `kitRender.ts` needs `Door.leaf` (anchors.ts on marlow-final adds it), apply only marlow-final's exact `anchors.ts` /
`doors.ts` hunks for `leaf` (`git diff origin/master...906065e4 -- src/world/anchors.ts src/world/doors.ts`), nothing else.
Do **not** port `world.ts` / `mapDef.ts` / `levelBuilder.ts` hunks: campus gets its own hook (step 6). The two facility
tests must pass unchanged. Log the port in the build report (paths + 906065e4).

## Step 2 - the catalogue layer (pure: `src/world/campusArt/catalogue.ts`)
```ts
export type V3 = readonly [number, number, number];
export interface ArtBox { lo: V3; hi: V3; see?: boolean; noLedge?: boolean }            // as facility PropBox
export interface ArtLook { color: string; roughness: number; metallic: number; alpha?: number; emissive?: boolean }
export interface PropCatalogue {
  id: 'F' | 'K' | `H${1 | 2 | 3 | 4 | 5}`;
  glb: string;                                   // file name under assets ('facility-props.glb', 'campus-kit.glb', 'hero-s1.glb')
  ids: readonly string[];
  materials: readonly string[];
  looks: Readonly<Record<string, ArtLook>>;      // by material name
  collision: Readonly<Record<string, readonly ArtBox[] | null>>;
  footprint: Readonly<Record<string, readonly [number, number, number, number]>>;
  triBudget: Readonly<Record<string, number>>;
  hung: readonly string[];
  fit: readonly string[];                        // pieces that may scale 0.8-1.25 per axis
  overhang: Readonly<Record<string, { by: number; what: string }>>;
  emissive: Readonly<Record<string, readonly ('screen' | 'lamp')[]>>;
  pitch: Readonly<Record<string, number>>;       // row module (m along local x)
}
export interface ArtPlacement {
  cat: PropCatalogue['id']; prop: string;
  x: number; y: number; z: number; yaw: number;
  s?: [number, number, number];                  // fit pieces only
  section: number;                               // 0-4; -1 shared (connectors)
  cls: 'solid' | 'see' | 'visual' | 'skin' | 'skin-hide';  // ART-PLAN section 2 (skin / skin-hide: over an existing greybox piece, writes none)
  skinOf?: number;                               // b.boxes index the skin covers
  skinCyl?: number;                              // b.cylinders index (tree trunks, posts) instead of a box
  tint?: [number, number, number]; lamp?: [number, number, number];
  group?: number;                                // light circuit (emissives dim when cut)
  minor?: boolean;                               // visual and < 0.4 m: may drop at distance (perf lever only)
  why: string;                                   // the real reason (16.0 reason test), one line
}
export const ART_PROUD = 0.05;                   // = PROP_PROUD
export const FIT_MIN = 0.8, FIT_MAX = 1.25;
export function facilityCatalogue(): PropCatalogue;                       // adapter over facilityProps.ts tables (no edit there)
export function artMatrix(p: ArtPlacement, out: Float32Array, o: number): void;   // scale, yaw, translate; allocation-free
export function artToWorld(p: ArtPlacement, lx: number, ly: number, lz: number): [number, number, number];
export function artBoxes(cat: PropCatalogue, p: ArtPlacement): PropWorldBox[] | null;   // collision in world (scaled)
export function writeArtBoxes(b: PropBoxBuilder, cats: CatalogueSet, ps: readonly ArtPlacement[]): number; // skips skin / visual; returns boxes written
export function skinFit(cat: PropCatalogue, p: ArtPlacement, box: BoxPiece | CylPiece): string | null;  // skin: encloses, <= ART_PROUD off (overhang excepted); skin-hide: ART-PLAN AS10 bounds (box outside the skin <= 0.6 and only above 0.9; skin <= ART_PROUD outside the box at 0.5-2.1)
export function ruleV(cat: PropCatalogue, p: ArtPlacement, floorY: number, wallDist: number): string | null;
export type CatalogueSet = Readonly<Record<string, PropCatalogue>>;
export interface CatReport { pieces: Record<string, { triangles: number; meshes: Record<string, number> }> }
export function artCounts(cats: CatalogueSet, reports: Readonly<Record<string, CatReport>>, ps: readonly ArtPlacement[], section: number): { draws: number; tris: number; placements: number }; // the renderer's draw rule (step 6), pure
```
`PropWorldBox` / `PropBoxBuilder` are imported from `facilityProps.ts` (type-only). Scaled boxes: `lo` / `hi` times `s`.

## Step 3 - the base kit catalogue and Blender build
- `src/world/campusArt/campusKit.ts` (pure): `CAMPUS_KIT: PropCatalogue` (id 'K') with every piece of ART-PLAN 3.2: ids,
  sizes as footprints, tri budgets, classes' boxes (solid boxes 1 cm inside the skin; see boxes as listed: chairEnv
  0.6 x 1.0 x 0.6, shelving, plantPot, gasCylinders, instrumentCart, bikeRack, parkBench, wingChair, chesterfield back,
  cafeChair, litterBin (`binEnv` 0.45 x 0.9 x 0.45), roofCowl), `fit` list (meetingTable, ceilingGrid, cafeTable,
  planterTrough, labBench, batteryRack, floorTileGrid, boardTable, car*, binLarge, feederPillar, treeSkin), hung list
  (exitSign, ductRun), emissive parts (vendingMachine screen, exitSign lamp), and `CAMPUS_LOOK` (ART-PLAN 3.3).
- `scripts/campus-props/lib.py`: the helpers of `scripts/facility-props/build.py` lines 1-140 (MATERIALS dict replaced by
  a parameter, `G`, `bm_of`, `game_rot`, `to_blender`, `box`, `obox`, `cyl`, `prism_x`), plus `export(pieces, out, name)`
  writing `<name>.glb` + `<name>.json` in the facility report shape (`{ pieces: { id: { triangles, bounds, meshes:
  { material: triangles } } }, triangles, bytes }`). Hero scripts import it.
- `scripts/campus-props/kit.py`: builds every K piece (frame rules: facility PROPS.md section 1), flat-shaded,
  triangulated, one mesh per (piece, material) named `<piece>.<material>`.
- `scripts/campus-props/build.mjs`: `node scripts/campus-props/build.mjs --set kit|hero-s1|...|hero-s5 [--only a,b]`,
  same shape as `scripts/facility-props/build.mjs` (pinned Blender via `findBlender`, SEED, timeout, copies
  `<set>.glb/.json` to `src/world/campusArt/assets/` on a full build). `package.json`: `"campus-props:build":
  "node scripts/campus-props/build.mjs"` (one line).
- Build it: `src/world/campusArt/assets/campus-kit.glb` (<= 1.2 MB) + `campus-kit.json`.

## Step 4 - the rules engine and keepouts (pure)
`src/world/campusArt/artTags.ts`: `ART_TAGS` (ART-PLAN 4.1, `as const`), `type ArtTag`.

`src/world/campusArt/keepouts.ts`:
```ts
export interface DressContext {
  section: number;
  rooms: readonly RoomDef[];                                  // this section's rooms
  tags: Readonly<Record<string, ArtTag>>;                     // room id -> tag
  sector: SectorDef;                                          // routes, guards, reinforce, entries, stageActions, crate?, objective, connector
  doors: readonly Door[]; windows: readonly WindowAnchor[];
  anchors: TraversalAnchors;                                  // ladders, pipes, ducts, ropes, rappels, split gaps
  items: readonly { x: number; y: number; z: number; what: string }[];   // K4 (built by collectItems)
  hides: readonly { x: number; y: number; z: number }[];      // K6 incl. spawns, nav seeds, checkpoint
  cameras: readonly CameraDevice[]; levels: Readonly<Record<string, number>>;
  lasers: readonly LaserDef[];
  lips: readonly CoopLip[];
  lamps: readonly { x: number; y: number; z: number }[];
  boxes: readonly BoxPiece[];                                 // the greybox boxes (read-only)
}
export interface Keepouts { /* plan capsules / discs / rects / tubes with y bands, built once */ }
export function collectItems(lay: MapLayout, section: number): DressContext['items'];
export function buildKeepouts(ctx: DressContext): Keepouts;
export type Mount = 'wall' | 'ceiling' | 'floor-wall' | 'floor-free';
export function blocked(k: Keepouts, ctx: DressContext, cat: PropCatalogue, p: ArtPlacement, mount: Mount): string | null; // first failing rule id ('K1'..'K13', 'V', 'S') with detail
export function checkDressing(ctx: DressContext, cats: CatalogueSet, ps: readonly ArtPlacement[]): string[];          // every violation (tests)
```
K8 uses `inFrame`, `camRange`, `camPitch`, `sweepYaw` from `src/security/camera.ts`; ray-vs-OBB against the boxes a
placement would write (and visual pieces > 0.35 m). Rays the greybox already blocks are skipped (compare per ray).

`src/world/campusArt/geometry.ts` (pure helpers over `BoxPiece[]`):
```ts
export function boxAt(boxes: readonly BoxPiece[], x: number, y: number, z: number, tol?: number): number;   // centre match (+-tol, default 0.05); throws when 0 or > 1 match
export function cylAt(cyls: readonly CylPiece[], x: number, z: number, tol?: number): number;               // same, plan centre
export function boxesIn(boxes: readonly BoxPiece[], x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): number[];
export function floorAt(boxes: readonly BoxPiece[], x: number, z: number, yHint: number): number;            // top of the highest collide box at or below yHint + 0.3
export function ceilingAt(boxes: readonly BoxPiece[], x: number, z: number, floorY: number): number;        // underside of the lowest collide or overhead box above floorY + 1.9 (Infinity outdoors)
export interface WallRun { x0: number; z0: number; x1: number; z1: number; nx: number; nz: number; y0: number; y1: number; glass: boolean }
export function wallRuns(boxes: readonly BoxPiece[], room: RoomRect, floorY: number): WallRun[];          // inner faces of collide boxes >= 2.0 high within 0.35 of the room edge, door / window gaps cut out, glass flagged
```

`src/world/campusArt/dressRules.ts`:
```ts
export interface RuleItem {
  piece: `${PropCatalogue['id']}:${string}`;   // 'K:whiteboard', 'F:filingCabinet'
  mount: Mount;
  per?: number;          // metres of free wall run (wall / floor-wall) or m2 of free floor (floor-free / ceiling)
  max?: number;
  minArea?: number;
  row?: number;          // modules per row
  y?: number;            // mount height (wall: bottom edge; ceiling: from the ceiling)
  under?: 'window';      // radiators
  over?: string;         // wallCupboards over kitchenRun
  cls: ArtPlacement['cls'];
}
export const DRESS_RULES: Readonly<Record<ArtTag, readonly RuleItem[]>>;   // ART-PLAN 4.2 table, exactly
export const DOOR_EXTRAS: readonly RuleItem[];                             // exitSign, fireExtinguisher, signPlate (4.2 last para)
export interface DressReport { placed: Record<string, number>; dropped: Record<string, Record<string, number>>; boxes: number }
export function planRoom(ctx: DressContext, k: Keepouts, cats: CatalogueSet, roomId: string, out: ArtPlacement[], rep: DressReport): void;
```
Algorithm (deterministic, no `Math.random`): per rule in table order, candidates are generated in a fixed order (wall
runs in `wallRuns` order, modules from the run start at `pitch`; floor grid 0.5 m from the room's min corner, row-major;
ceiling grid at `per` spacing centred), snapped (5 cm, yaw to 90 deg), and accepted when `blocked(...) === null` and
the per / max / minArea counts allow; the variant of a multi-variant piece (car colours) is `fnv(roomId + index) % n`.
Accepted floor props also block later candidates (their boxes join a local overlap list; touching is fine for rows).

`src/world/campusArt/finishes.ts`:
```ts
export const CAMPUS_FINISH: Readonly<Record<ArtTag, { floor?: string; wall?: string; ceiling?: string }>>;   // sRGB hex
export function applyFinishes(boxes: BoxPiece[], range: readonly [number, number], rooms: readonly RoomDef[], tags: Readonly<Record<string, ArtTag>>): number; // recoloured count
```
Role by size: floor `sy <= 0.45 && sx * sz >= 4` with its top at the room's floor; wall `sy >= 2 && min(sx, sz) <= 0.45`
inside the room's storey; ceiling the `overhead` slab over the room. Only `color` changes. Colours must make
`pieceKind` return the intended `SurfaceKind` (table in the code comment; test).

## Step 5 - the dresser API and the registry
`src/world/campusArt/dresser.ts`:
```ts
export class CampusDresser {
  constructor(b: LevelBuilder, ctx: DressContext, cats: CatalogueSet);
  readonly placements: ArtPlacement[];
  readonly report: DressReport;
  base(): this;                                                                 // planRoom for every tagged room of ctx
  add(piece: string, x: number, y: number, z: number, yaw: number, o: { cls: ArtPlacement['cls']; why: string; s?: [number, number, number]; group?: number; tint?: [number, number, number]; free?: boolean }): number;
  skin(piece: string, boxIndex: number, yaw: number, o: { why: string; dy?: number }): number;   // fit scale from the box; throws on skinFit failure
  skinHide(piece: string, boxIndex: number, yaw: number, o: { why: string }): number;            // cls skin-hide (only the pieces ART-PLAN AS10 names, or a hero brief line)
  skinCyl(piece: string, cylIndex: number, o: { why: string }): number;                       // trunks, posts
  skinRow(piece: string, boxIndex: number, alongX: boolean, faceSign: 1 | -1, o: { why: string }): number[]; // tiles a long box with modules at pitch (racks, lockers, kitchen runs)
  write(): this;                                                                // writeArtBoxes for solid / see placements (noLedge on every box 1.9-4.2 tall, campus rule 6)
  check(): string[];                                                            // checkDressing on own placements
}
```
`add` throws when `blocked` fails for a hero placement (heroes are exact: a failure is a brief error to report, never
silently dropped); `base()` drops and counts.

`src/world/maps/campusDress.ts`:
```ts
export type SectionDresser = (d: CampusDresser) => void;
export interface CampusArtLayout { placements: ArtPlacement[]; catalogues: string[] }   // catalogue ids used
export function dressCampus(b: LevelBuilder, lay: MapLayout, ranges: readonly (readonly [number, number])[]): CampusArtLayout;
```
`dressCampus` builds the five contexts (sector k = `CAMPUS_SECTORS[k]`, rooms from `S<k+1>_ROOMS`, tags from
`S<k+1>_ART_TAGS`), runs `applyFinishes` on the section's box range, `new CampusDresser(...)`, the section's dresser
(`DRESSERS[k]`), `write()`, and collects placements. Registry (written now, never edited by section slices):
```ts
import { dressS1, S1_ART_TAGS } from './campusS1Dress';
... S2..S5
const DRESSERS: readonly SectionDresser[] = [dressS1, dressS2, dressS3, dressS4, dressS5];
const TAGS = [S1_ART_TAGS, S2_ART_TAGS, S3_ART_TAGS, S4_ART_TAGS, S5_ART_TAGS];
```
Stubs `src/world/maps/campusS1Dress.ts` ... `campusS5Dress.ts`: `export const S<N>_ART_TAGS: Record<string, ArtTag> = {};`
`export const HERO_S<N>: PropCatalogue | null = null;` `export function dressS<N>(d: CampusDresser): void { d.base(); }`
(with empty tags `base()` places nothing). Hero catalogues are found by `dressCampus` from `HERO_S<N>`.

`src/world/maps/campusOps.ts` (the only edits): `buildSection` records `[i0, i1)` box ranges; export
`buildCampus(b, o: { dress: boolean }): MapLayout` holding today's body; `campusOps.build = (b) => buildCampus(b, { dress: true })`;
with `dress`, after the layout is made: `layout.campusArt = dressCampus(b, layout, ranges)`.
`src/world/mapDef.ts`: `MapLayout.campusArt?: CampusArtLayout` (type-only import).

## Step 6 - the renderer and the World hook (`src/world/campusArt/campusArtRender.ts`)
Based on marlow-final `propRender.ts` (read it, do not edit it): `CampusArtRender.create(scene, art, reg, level, addCaster)` (`level: BuiltLevel` for `hidePieces`, `addCaster: (m: AbstractMesh) => void`); GLBs via
`import.meta.glob('./assets/*.glb', { query: '?url', import: 'default', eager: true })` plus the facility GLB through
`propsUrl()`; `parseGlb` per catalogue used (loaded once, in parallel). Materials: one per material name (PBR from the
merged look table; emissive unlit `StandardMaterial` as propRender), `markLampLevel` on lit ones, `markDrawFirst` +
`useSkinsFirst(scene)`. Draws:
- static opaque (not emissive, not alpha, no `group`): baked per (section, material) with `bakeParts` / `bakedMesh`
  (`kit/staticMerge.ts`, `kit/kitRender.ts`), frozen, bounding per section so other buildings cull;
- the rest: one thin-instanced mesh per (catalogue, section, piece, material), `thinInstanceRefreshBoundingInfo` once,
  per-instance colour for `screen` / `lamp` (tint, circuit dimming exactly as propRender's registry-version repaint);
- no prop is a shadow caster except `skin-hide` skins (they stand in for the hidden box: `lightRig.addCaster`);
  `isPickable = false`; `alwaysSelectAsActiveMesh = false`.
- **Box hide (render only).** `src/world/levelBuilder.ts` gains `BuiltLevel.hidePieces(boxes: readonly number[]): void`:
  zeroes those boxes' thin-instance matrices in `lvl-box` (keep a box -> instance index map built in `build`), refreshes
  the buffer once and the bounding info once; it never touches `BoxPiece` data, physics, cover, nav or the bake. The art
  renderer calls it for every `skin-hide` placement after its own meshes are ready; a failed load never calls it, so the
  boxes show. Unit test on a NullEngine: the hidden instances draw nothing, the canonical light hash and the body are
  unchanged.
`meshes(): Mesh[]`, `counts(): { draws: number; tris: number; perSection: { draws: number; tris: number }[] }`, `dispose()`.
`src/world/world.ts` (one block beside the existing level hooks, and the dispose line): when `layout.campusArt?.placements.length
&& atlas && !opts.cheap`, `w.campusArt = await CampusArtRender.create(scene, layout.campusArt, level.lights, level, (m) => w.lightRig.addCaster(m))` in try / catch
(`console.warn('[campus-art] failed to load; the greybox shows', e)`); field `campusArt: CampusArtRender | null = null`.
Debug overlay: add `art d<draws> t<tris k>` to the existing draws line if a one-line hook exists; else skip (log L).

## Step 7 - tools for the perf pass
- `scripts/campus-art-shots.mjs` from `scripts/sector-lights-shots.mjs`: views table (35 rows, empty placeholders
  `{ id: 's1-a', ... }` filled by the section briefs' "Views" - ART-KIT writes the 35 rows from those briefs now), the
  draws / tris / active meshes / meter probe print, `--sheet`.
- `scripts/guard-cap.mjs`: add `campus: 'autostart=campusOps&mode=sector&sectorGuards=0'` to `MAP_Q` (one line).
- `scripts/perf.mjs`: `const MODE = process.env.MODE` overriding the `mode=` value when set (default unchanged).

## Step 8 - tests (all new; vitest, node)
- `tests/campusArtKit.test.ts`: K report vs catalogue (every id built, tris <= budget, only K materials, footprints
  match bounds within 1 cm); every solid box 1 cm inside the skin and the skin <= ART_PROUD off the hull (as
  `facilityProps.test.ts` 108); hung pieces on their face; F adapter equals the facility tables; merged look table has no
  name with two looks; `artMatrix` equals Babylon's `Matrix.Compose(scale, yawQuat, pos)` for 20 seeded placements;
  `skinFit` true / false cases; `ruleV` cases.
- `tests/campusDressRules.test.ts`: `boxAt` (match, none throws, two throws); `wallRuns` on a hand-built room with a door
  gap and a glass panel; `floorAt` / `ceilingAt`; each keepout K1-K13 rejects a placement 5 cm inside and accepts one 5 cm
  outside; `planRoom` deterministic (two runs equal), honours `per` / `max` / `minArea`, never overlaps boxes; DRESS_RULES
  covers every ART_TAG; `applyFinishes` gives the intended `pieceKind` per tag.
- `tests/campusArtGameplay.test.ts`: ART-PLAN 4.4 items 1-10, for every section with a `describe` per section (`-t S<n>`
  runs one section), greybox vs dressed. Shared builds in `beforeAll` (one greybox, one dressed).
- `tests/campusArtLight.test.ts`: ART-PLAN 2 delta gate (bake as `tests/ctcourseLight.test.ts`; `CAMPUS_ART_LIGHT_PRINT=1`
  prints the worst 20 points); timeout 600 s; one `describe` per section.
- `tests/campusArtRender.test.ts` (NullEngine, as `facilityProps.test.ts` 268): static pieces merged per (section,
  material), the rest thin-instanced; a cut circuit dims a grouped screen; `counts()` per section; no shadow caster.

## Step 9 - base pass smoke
Fill no section tags (the section slices own them). Prove the engine end to end with a test-only context: a hand-built
office room in `tests/campusDressRules.test.ts` dressed by `base()` places whiteboard, diffusers, cabinets, exit signs,
and drops a cabinet that a route crosses.

## Acceptance (A110-A126)
- **A110** marlow-final kit present per step 1 (merge or byte-identical port, paths logged); `tests/facilityProps.test.ts`
  and `tests/facilityKit.test.ts` pass unchanged.
- **A111** `catalogue.ts`, `campusKit.ts`, `artTags.ts`, `geometry.ts`, `keepouts.ts`, `dressRules.ts`, `finishes.ts`,
  `dresser.ts` are Babylon-free (no import of `core/babylon` or `@babylonjs`; a test greps them).
- **A112** K catalogue = ART-PLAN 3.2 exactly (60 ids, sizes within 2 cm, classes, fit / hung lists); the K report
  passes the kit test; GLB <= 1.2 MB; total K tris <= 18 k.
- **A113** `campus-props:build --set kit` rebuilds the GLB deterministically (same bytes twice, SEED).
- **A114** Placement maths: `artMatrix` = Babylon compose (20 cases, 1e-5); scale only on `fit` pieces and only 0.8-1.25.
- **A115** Light parity classes exactly as ART-PLAN 2: solid boxes visible and in `canonicalLightSet`; see boxes
  `visible: false`; visual and skin write none; rule V enforced by `ruleV` and by `checkDressing`.
- **A116** Keepouts K1-K13 implemented with the ART-PLAN 4.3 numbers (each unit-tested in and out).
- **A117** `DRESS_RULES` = ART-PLAN 4.2 table plus `DOOR_EXTRAS`; `planRoom` deterministic; dropped candidates counted.
- **A118** `applyFinishes` changes only `color`; light hash, collision set, cover segments and nav identical (test).
- **A119** `dressCampus` registry with five stubs; `campusOps.build` dresses; `buildCampus(b, { dress: false })` is today's
  greybox byte-for-byte (box list equal to the pre-slice build: test against a snapshot hash taken at the cut commit).
- **A120** Renderer: per-(section, material) merged statics, thin instances for the rest, emissives on circuits, no
  shadow casters, allocation-free frame path (`tests/helpers/allocPerCall.ts` on the repaint path: 0 bytes).
- **A121** World hook: `?gfx=min` / `opts.cheap` / a failed GLB draws no art and the greybox shows; gameplay reads
  nothing from the renderer (grep: no gameplay module imports `campusArt/campusArtRender`).
- **A122** Gates: `tests/campusArtGameplay.test.ts` and `tests/campusArtLight.test.ts` exist, are data-driven and pass on
  the stub-dressed campus (no placements: deltas 0).
- **A123** Every existing campus test (`tests/campusS1..S5.test.ts`, `campusRuntimeNav`, `sectors`, `sectorItemScope`,
  `noAmmoPickups`) passes unchanged.
- **A123b** `hidePieces` is render-only (test: physics shape count, `canonicalLightSet` hash, cover segments and nav equal
  before and after the call) and only `skin-hide` placements use it.
- **A124** Tools: `campus-art-shots.mjs` (35 views, `--sheet`), guard-cap `campus` row, perf.mjs `MODE` env.
- **A125** `npm run check` green (lint, all vitest, build). No e2e needed for this slice beyond `npm run e2e:quick`
  (smoke + whatever it picks); the lead may run `e2e-sectorops:6` GPU for confidence.
- **A126** Report `checks/art-kit-build.md`: files, the port source, K tris / bytes, test counts, L-log.

## Do not touch
Any `campusS<N>.ts`, `campusSectors.ts`, `campusLips.ts`, `src/game/**`, `src/ai/**`, `src/net/**`, `src/security/**`,
the light rig / lamps / `fixtureModels.ts`, the marlow-final files (beyond the port), save code, the protocol. No new
`LightInit`, door, anchor, switch or item. No edit to existing tests.
