# campus-art-next build (feature/sector-redesign-artnext, base artpol 72e87171)

Brief: `sector-redesign-artnext-ABD.md` (cloud queue). Lanes A, B, D on this branch, in that order; lane C is its own
branch (`-artnext-c`). Unit tests only (tsc, named vitest files, `--maxWorkers=2`), cloud build.

## Lane A

Kit code, Opus. Files: `src/world/campusArt/{catalogue,campusKit,keepouts,dresser,dressRules,campusArtRender}.ts`,
`src/world/maps/campusDress.ts`, tests `campusArtKit`, `campusDressRules`, `campusArtGameplay`.

### Items

| # | Status | Where | What |
|---|---|---|---|
| A1 | already done (polish2 7a731dfe), `campusDress.ts:100-102` on the base | `campusDress.ts` `dressCampus` | The gaps were already computed once from the bare greybox before the loop. Added: computed only when a section has a tagged room (the brief's guard), and a test-only `DressOrder` (`order`, `onContext`) so the test can dress in any order. Test: "split gaps are the greybox's whatever the order" (`campusArtGameplay.test.ts`, forward and reverse, every section sees the greybox's gaps). |
| A2 | done | `dresser.ts` `skinFace`, `catalogue.ts` `skinFit` face branch, `FACE_TURNS`, `ArtPlacement.skinFace`, `keepouts.ts` `blocked` | Panels over one face of a box. A `skin` placement (writes no box: the greybox face stays the collision, light and sight) with `skinOf` and `skinFace`. Skin rule: within the face (x, y), front on the face or at most `ART_PROUD` (0.05) off it, back not through the far face (a deeper piece sinks into the box). Then the wall-mounted visual keepouts: K3 door edges, K4, K7, K12 (glass box), K8, K9-K11 at wall radii. All modules or none. Test: "skinFace is flush and visual". |
| A3 | done | `catalogue.ts` `PropCatalogue.fitRange`, `fitRange()`, `F_FIT_RANGE`; `campusKit.ts` `fitRange`; `dresser.ts` `checkScale` | Per-piece limits (default 0.8 / 1.25): `batteryRack` 0.8-1.3 (1.0 deep: 1.275), `labBench` 0.65-1.25 (2.0 long: 0.673), `F:meshPanel` 0.8-1.3 and now in `F_FIT` (3.0 high: 1.258). Test: "per-piece fit limits". |
| A4 | done | `dresser.ts` `ArtRuleError`, `ruleOf`, `tryAdd`, `refusals`, private `refusal` | Every rule failure throws `ArtRuleError { rule, msg }` (`message` keeps the old text). `add` now also refuses what `checkDressing` refuses: a floor piece over a greybox box, or a box over another placement's box ('B'). This changed no current placement (dump below). `tryAdd` returns the first spot's index or -1, logs each refusal (`refusals`) and counts it in `report.dropped`. Test: "tryAdd returns -1 with the rule id". |
| A5 | already done, `dresser.ts` `skinRow` (`p.group` on every module), `skin` / `skinHide` / `skinCyl` take `group` on the base | - | The post-call group writes in S4 / S5 are lane B (B7). Covered in the A3 test (a kitchen run row with `group: 7`). |
| A6 | done | `keepouts.ts` `decalPiece`, `isDecal`, `blocked`, `overlapsGreybox`; `catalogue.ts` `DECAL_H`; `dresser.ts` `add`; `dressRules.ts` `make` | A visual piece that writes no box, is not a ceiling piece, has a scaled hull under 0.05 m tall and sits within 0.05 of the floor. It is exempt from K1-K6 and K13, and from the greybox overlap. `add` and the base pass snap its y to 1 mm. Test: "a decal is not a keepout". |
| A7 | done | `catalogue.ts` `PropCatalogue.frame`; `keepouts.ts` `frameDoor`, `frameShapes`, `FRAME_WRAP`, `blocked`, `checkDressing` | A `frame` piece, placed visual, whose local x runs along a door, whose hull spans the opening (width to width + 0.2, opening inside it), standing on the door's floor and reaching its head. It is checked as its jambs and head, not its hull, so camera rays through the opening are clear. It passes K1 and K2 for legs that cross that door's opening, K3 and K13 for that door, rule V and the greybox overlap. Test: "a door frame passes K1". |
| A8 | done | `campusKit.ts` `fit` | `kitchenRun` and `wallCupboards` are fit. `kitchenRun` also gets its own range 0.8-1.4: the S5 counter is 0.8 deep against the run's 0.6 (1.367), which the default 1.25 refuses. Covered in the A3 test (S5 counter: 3 modules, z 1.367). |
| A9 | done (docs) | `dresser.ts` header | The kit contract: heroes throw `ArtRuleError`. A hero with fallbacks uses `tryAdd`. A hero that may be lost goes in an explicit omitted list the test asserts, never a bare `try / catch`. A programming error (unknown piece, missing box) throws a plain `Error`, also through `tryAdd`. S1 itself is lane B (B2). |
| A10 | done (comment) | `campusArtRender.ts` `create`, before `slice(n0)` | Comment only. |

Deviations and assumptions (smallest reading of the brief):
- A2: the brief's "depth <= ART_PROUD" is read as "stands at most ART_PROUD off the face". The rest of a deeper panel
  sinks into the box, never through it. The panels lane B needs (`greenWall` 0.2, `monitorWall` 0.35, lockers) are all
  deeper than 0.05.
- A6: K13 is exempt too. It is one of the floor keepouts the nav gate protects (`NAV_RULES`), with K1-K6.
- A7: K2 legs through the door are exempt too (a guard walks the same doorway). The frame's door also passes K3 / K13
  (its zone and swing). Without this no frame can stand in a doorway, so A7 could not work. The exemption needs a
  visual placement (no box): a frame that writes boxes would narrow the door, so it keeps every rule.
- A8: `kitchenRun` gets its own fit range, 0.8-1.4. Lane B's B6 needs it; without it the run cannot skin the 0.8 deep counter.
- A4: `add` gained the greybox and placement box-overlap checks (as `checkDressing`), so `tryAdd` answers as the gate does.

### Dressing results (full dressed campus dumped before / after, `campusOps.build`)

- Placements 1852 -> 1921 (S1 76 / 76, S2 777 / 777, S3 189 / 189, S4 563 -> 632, S5 247 / 247); boxes 1532 / 1532, art
  boxes 229 / 229, cylinders unchanged.
- Every change comes from A6 (the decal exemption), by design:
  - S4: `place()` in `campusS4Dress.ts` now passes the 1 cm floor tile everywhere the lattice does not overlap a tile:
    5 -> 72 `floorTileGrid` (no new draw key; +1340 triangles).
  - `F:glandPlate` (a 3 cm floor plate, a decal) takes its first base-pass candidate in the S2, S4 and S5 plant rooms
    (10 -> 12). In S2 the plate no longer blocks the first switchgear module, so the `F:switchgearPanel` row starts 0.8 m
    further south (z -21.8 .. -19.4, was -21 .. -18.6): 4 solid art boxes move. `campusArtGameplay -t S2` passes
    (routes, cover, nav, lips, ledges).
  - S3 `H3:stickyMat` (a hero mat) takes its first candidate, 0.6 m along (z -4.1, was -3.5).
- Light parity: art boxes keep `art: true` (`writeArtBoxes`). No new collide box; the four moved switchgear boxes move
  the campus light hash `1mqg481` -> `vnqe3i` (`canonicalLightSet`, `dressingOn(campusOps)`); `campusArtLight` passes.

### Tests (this worktree, `--maxWorkers=2`)

- `npx tsc --noEmit -p .` clean; `npx eslint` on the changed files clean.
- `campusArtGameplay`, `campusS1Dress`..`campusS5Dress`, `campusArtKit`, `campusDressRules`, `campusArtRender`: 9 files,
  155 / 155 before -> 161 / 161 after (6 new cases: A1, A2, A3 / A8, A4, A6, A7; the kit fit-list assertion updated for A8).
- Also run (the dressing changed in S2 / S4): `campusArtLight`, `campusS2`, `campusS4`, `campusRuntimeNav`: 4 files, 88 / 88.

### API for lane B (all on `CampusDresser d`, `src/world/campusArt/dresser.ts`)

```ts
// errors
class ArtRuleError extends Error { readonly rule: string; readonly msg: string }   // rule: 'K1'..'K13' | 'C' | 'V' | 'S' | 'W' | 'B' | 'FIT'
const ruleOf: (e: string) => string;                                                 // 'K1: ...' -> 'K1'

// exact hero (throws ArtRuleError); tryAdd: first spot that passes, else -1 (d.refusals, d.report.dropped)
interface ArtSpot { x: number; y: number; z: number; yaw: number }
interface AddOpts { cls: ArtPlacement['cls']; why: string; s?: [number, number, number]; group?: number; tint?: [number, number, number]; free?: boolean }
add(piece: string, x: number, y: number, z: number, yaw: number, o: AddOpts): number;
tryAdd(piece: string, spots: readonly ArtSpot[], o: AddOpts): number;
readonly refusals: { piece: string; spot: number; rule: string; msg: string }[];

// face skin (all modules or none; throws ArtRuleError)
type BoxFace = 'n' | 'e' | 's' | 'w';                    // n +z, e +x, s -z, w -x
interface FaceOpts { why: string; group?: number; tint?: [number, number, number]; dy?: number; at?: readonly number[]; from?: number; to?: number; fitY?: boolean }
skinFace(piece: string, boxIndex: number, face: BoxFace, o: FaceOpts): number[];

// rows and skins: group on every module (A5); fit within the piece's own range (A3)
skinRow(piece: string, boxIndex: number, alongX: boolean, faceSign: 1 | -1, o: { why: string; group?: number }): number[];
skin(piece: string, boxIndex: number, yaw: number, o: { why: string; dy?: number; group?: number }): number;

// catalogue (src/world/campusArt/catalogue.ts)
PropCatalogue.fitRange?: Record<string, { min: number; max: number }>;   // default FIT_MIN 0.8 / FIT_MAX 1.25
PropCatalogue.frame?: readonly string[];                                  // door-frame pieces (A7)
fitRange(cat: PropCatalogue, prop: string): { min: number; max: number };
DECAL_H = 0.05;                                                           // decal: visual, hull < 5 cm, on a floor (A6)
// keepouts (src/world/campusArt/keepouts.ts)
isDecal(k: Keepouts, boxes: readonly BoxPiece[], cat: PropCatalogue, p: ArtPlacement): boolean;
frameDoor(ctx: DressContext, cat: PropCatalogue, p: ArtPlacement): Door | null;
FRAME_WRAP = 0.2;
```

Example calls:
- `skinFace`: `d.skinFace('F:greenWall', boxAt(bx, x, y, z), 'n', { why: 'atrium green wall', at: [-3.6, 2.4] })`.
  One unscaled module per centre (world x for n / s, world z for e / w). With no `at`, the face (or `from`..`to`) is
  tiled at the piece's pitch: `d.skinFace('F:meshPanel', i, 'e', { why: 'cage face', from: 18, to: 26.5, fitY: true })`.
  `dy` raises a wall piece over the box's bottom; `fitY` stretches a fit piece to the box height.
- `tryAdd`: `const i = d.tryAdd('F:monitorWall', [{ x: -50.1, y: 0, z: 24, yaw: -PI / 2 }, { x: -50.1, y: 0, z: 26, yaw: -PI / 2 }], { cls: 'solid', why: 'house CCTV wall' }); if (i < 0) S5_OMITTED.push('monitorWall')`.
  The refusals are in `d.refusals` (`[{ piece, spot, rule: 'K2', msg }]`).
- `ArtRuleError`: `try { d.add(...) } catch (e) { if (e instanceof ArtRuleError) log(e.rule, e.msg); else throw e; }`.
- Per-piece fit: `d.skin('K:batteryRack', i, 0, { why: 'battery rack' })` on the 1.0 deep S4 box (z 1.275);
  `d.skin('K:labBench', i, 0, ...)` on the 2.0 m S3 desk (x 0.673); `d.skin('F:meshPanel', i, 0, ...)` on a 3.0 m cage
  wall box of meshPanel depth (y 1.258); `d.skinRow('K:kitchenRun', i, false, 1, { why, group: S5_GROUPS.kitchen })` on
  the S5 counter (3 modules, z 1.367).
- Decal: `d.add('K:floorTileGrid', x, 0.01, z, 0, { cls: 'visual', why: 'raised-floor tiles' })` is no longer held to
  routes, patrol legs, door zones or greybox boxes (K7 lips, K8-K12 still apply). `campusS4Dress.ts` `place()` already
  benefits (72 tiles); B5 can drop its lattice workaround.
- Frame: add a hero piece to the section catalogue's `frame` list (hull width at most the door width + 0.2, hull bottom
  on the door's floor, top at or above the door head) and place it visual, centred on the opening, local x along the
  door: `d.add('H5:vaultFrameSlim', cx, floorY, cz, yaw, { cls: 'visual', why: 'strongroom door frame' })`. Check it
  with `frameDoor(d.ctx, cat, p)`.

## Lane B

Built by five section builders (Sonnet) on lane A's API, then the batch checked together (Cloud Builder 1).

| # | Section | Status |
|---|---|---|
| B1 | S1 | Done. The brief's 39-40 draws were stale: S1 measured 31 (perfa merged caster keys cost one draw per car paint material). `CAR_PIECES` = carSilver, carBlack, carBlue, carWhite cycled over the 14 cars (4 colours, not 2). Per-instance colour not used: `skinHide` takes no `tint` and casters have no tint (lane A files). Test asserts all 4 colours. |
| B2 | S1 | Done. Every hero goes through `d.tryAdd(piece, [spot], o)`. `S1_OMITTED` is an exported `readonly S1Omit[]` `{piece, x, z, rule}`: `K:bikeRack` (-5, -46.8) K6, `K:parkBench` (8, -47.6) K1. `dressS1` throws on a refused hero not listed and on a stale list; `S1_REFUSED` (rebuilt each call) is asserted equal to `S1_OMITTED`. Placements unchanged. |
| B3 | S2 | Done. `d.skinFace('F:greenWall', box, 'e', { at: [c], group: S2_GROUPS.atrium })` on the atrium (+x) face of the two x = -30 west-wall boxes: north bay box 389 at z -12, south bay box 391 at z -3.5 (fallback centres tried in order; the old z -15 / -2 hung off box 389). Origin x -30.05: back sinks into the 0.2 m wall, front 0.05 proud. No refusals. Deviation: spots moved to the box centres. |
| B4 | S3 | Dropped. Lockers (`F:kitCaseWall`) as `skinFace` on the gowning partitions (box 770 face e, boxes 773 / 771 face w): all refused rule S, the 0.5 m deep locker's back passes through the 0.3 m wall (0.150 m); `K:lockerBank` the same (0.156 m). Floor spots still refused (K5 / K2 / K9 las-gown / K3 door 61). Bench (`F:holdingBench`) dropped: all nine spots K5 (guard 1 / 3 takedown) or K2 (guard 3 leg 0). Per-piece fit lets no skipped S3 item in (the only 2 m box is the `H3:logDesk` hero). Logging + one test only. |
| B5 | S4 | Battery racks done: both rows skinned with `K:batteryRack` (7 modules, scale 1.275 within 0.8-1.3) replacing `batteryString`. Floor tile grid already done by A6 (72 / 72; stale comment fixed, test >= 60). `meshPanel` on the cage faces DROPPED, rule FIT: `skinRow` stretches depth 2.4x (0.05 panel on 0.1 boxes); `skinFace` would leave the inner half greybox, so the 16 `H4:cagePanel` stay. Undo needs lane A: no depth stretch for thin panels in `skinRow`, or a `meshPanel` depth. |
| B6 | S5 | Kitchen counter done (`d.skinRow('K:kitchenRun', counter box, false, +1)`, 3 fit modules, no box). Cupboards done: 3 `K:wallCupboards` via `tryAdd` per module (scale x 1.111, backs on the kitchen west wall x -31.85, z 34-38, visual; `skinFace` would refuse S: 0.35 deep on a 0.3 wall). Vault frame DROPPED "needs catalogue frame entry" (no catalogue sets `frame`). Monitor wall DROPPED rule S (0.36 deep, not fit: east wall 0.104 m through, south wall 0.004 m through; west wall 2.7 m free < 3.7 m); needs a per-call `proud` in lane A or a thicker wall. Deposit wall stays refused (C x7, K4 x1; the 8 `H5:depositFace` fronts stay). Vault leaf DROPPED K1 (within 1.2 m of route leg 9). `S5_OMITTED = ['F:depositWall', 'F:vaultLeaf', 'F:monitorWall', 'vaultFrame']` asserted; every refusal in `S5_HERO_LOG`. |
| B7 | S4 / S5 | Done. S4: CRAC (`S4_GROUPS.cold1`) and UPS (`S4_GROUPS.ups`) rows pass `group` in `skinRow`, `place()` passes it to `add`; the `group()` helper and every `placements[i].group` write removed. S5: racks pass `S5_GROUPS.ctl`. |
| B9 | S4 | Done. `HERO_S4.overhang.genset.parts` lists the exhaust stack (0.3 m dia, y 2.6-3.6 at local (-1.0, -2.4)) and its flange (0.5 m dia, y 2.6-2.8), read from `hero_s4.py` `genset()` (the Blender source of `hero-s4.glb`), not the GLB vertices. K9 skin reach measures the stack by them; `by: 1.05` unchanged. |
| B8 | S5 | Done, one deviation: `base()` ignores earlier placements, so the two stale portraits (y 1.93, z 18.15) are removed after `base()` (`report.placed` decremented) and re-added with `tryAdd` at hall floor y 0, flush on z 18.15. First at x -46.4 as before; second moved -43.0 -> -42.2 (-43.0, -42.6, -42.4 refused K3: front door 99 opening margin). |

### artCounts (draws / tris / placements; limits 40 / 150 k / 2500)
| Section | Before (after lane A) | After lane B |
|---|---|---|
| S1 | 31 / 13104 / 76 | 35 / 13104 / 76 |
| S2 | 33 / 50924 / 778 | 33 / 51428 / 780 |
| S3 | 27 / 16016 / 189 | 27 / 16016 / 189 |
| S4 | 19 / 79532 / 632 | 19 / 79532 / 632 |
| S5 | 28 / 25092 / 247 | 29 / 25452 / 253 |

### Boxes and light
Lane B moved or added no solid art box and no collide box (face skins, skin rows and visual pieces write no box; group
changes are metadata). The campus light hash moves only by lane A's S2 switchgear shift (1mqg481 -> vnqe3i, above).

### Tests (whole batch, this worktree, `--maxWorkers=2`)
- `npx tsc --noEmit -p .` clean; `npx eslint` clean on every changed source and test file.
- Section files before -> after: campusS1Dress 13 -> 13 (asserts changed), campusS2Dress 12 -> 13, campusS3Dress
  12 -> 13, campusS4Dress 13 -> 14, campusS5Dress 6 -> 10.
- Batch run, 13 files: campusArtGameplay (all sections), campusS1-S5Dress, campusArtKit, campusDressRules,
  campusArtRender, campusArtLight, campusS2, campusS4, campusRuntimeNav: **256 / 256 pass**.

### Open for the lead
- S4 `meshPanel` cage faces (FIT: depth stretch) and S5 `monitorWall` (S: depth > ART_PROUD) need a lane A option
  (thin panels skip depth stretch / a per-call `proud`).
- S5 vault frame needs a `frame` entry in the hero catalogue (no catalogue lists one yet).
- S3 lockers need a piece <= 0.35 m deep (only `wallCupboards`, not a locker).

## Lane D

Built by a Haiku docs builder, fragment corrected by Cloud Builder 1.
- `TESTING.md:472-481` new "Campus art (artnext)" checklist (load, views s1-a..s5-g, no greybox showing, draws, gate test).
- `docs/systems/world-and-characters.md` "Campus art kit" (already existed at :58, edited, not duplicated): dressers
  :74-100 (`add` / `ArtRuleError`, `tryAdd` / `refusals`, `skin`, `skinFace`, `skinHide`, `skinCyl`, `skinRow` with group,
  `fitRange`, floor decals `DECAL_H`, door frames `FRAME_WRAP` / `frameDoor`), keepouts :101-111 (K1-K13 plus C, V, S,
  W, B, FIT; the brief's "K1-K12" is K1-K13 in `keepouts.ts`), gameplay gate :112-115, status :121-123.
- `changes/feature-sector-redesign-artnext.md` (new, minor): lanes A, B (as built, drops left out), C (pointer to
  artnext-c). The art-check P7 A99 line is already done: `changes/feature-sector-redesign-art.md:17` carries it, so it
  is not repeated.
