# LR16 plan - realistic lighting on every map (draft 1)

Source: Michael ~18:08 (approve new lighting on all maps; soft lamp edges against walls / floors, hard only where an
occluder cuts the ray, depending on distance; "Must be realistic depiction of light") and ~18:12 ("Disable returning
to original lighting system, focus on only the one new system"). Base: lampx head 1c22b913 (LR13 / shadow accuracy /
LR14 / LR15 / polish / paged atlas). Screenshot: `scratch/lighting/michael-4.78-wall-arcs.png` (4.78.0 Workshop).

## Diagnosis of the wall arcs (lampx file:line)

The arches are the lamp hemisphere cut meeting a wall close to the lamp, amplified by the Realistic near term:
1. `src/world/lampMath.ts:11-12` `LAMP_CONE = 0.97 pi`, cut cos ~0.047. `lampCone` (`:80-84`) is a hard step:
   `cosA < cosCut -> 0`, else `cosA`. A downward cone cut meeting a vertical wall is a hyperbola, apex up: the arch.
2. `lampMath.ts:42` `PHOTO = { ref: 3, near: 1 }`: inside 1 m the photometric term is clamped at ref^2/near^2 = 9x.
   A wall 0.3-1 m from a lamp sits in that plateau, so the 0.047 step becomes ~0.4 of full level after gain and
   tone map: a visible hard edge, and the plateau itself reads as a flat bright disc (no 1/d^2 roll-off near the lamp).
3. `lampMath.ts:91-99` `lampTerm` has no N.L / grazing term on the CPU, and the GLSL copy (`lampMathGlsl()`, `:142`,
   used by `bakedLamps.ts:7,206,589`) shares the same step, so the picture and the meter agree on the wrong edge.
4. Bake visibility `src/voxel/lampBake.ts:14-15` `LAMP_CELL = 0.2`, occupancy grown half a cell (`:8-10`): shadow
   edges are binary per cell with trilinear blend only, so every occluder edge has the same 0.2 m stair, whatever its
   distance from the surface (no contact hardening). A downward lamp's box stops one cell above it (`:46`): a hard
   horizontal line on walls at lamp height.
5. Placement: Workshop lamps hang within ~0.5 m of the walls they face (map lamp data, `src/world/lights.ts` +
   per-map tables), which puts the wall in the near plateau. Audit in LR16c.

## Slices

| Slice | Model | Files (only these) | Acceptance | Tests |
|---|---|---|---|---|
| LR16a remove Classic | Opus | `src/world/lampMath.ts` (drop `lampFalloff` linear / `setLampFalloff` / `matchLampFalloff` / `bakedFalloff` mode), `src/world/lightField.ts` (photo path only), `src/world/bakedLamps.ts`, `src/world/shadowAccuracy.ts` (always on: fold `shadowAccuracyOn()` callers, delete toggle), `src/core/settings.ts` (remove `gameplay.lampFalloff`), `src/ui/screens/settingsScreen.ts`, `src/game/gameState.ts`, `src/core/flags.ts` (`?falloff`), `src/net/protocol.ts` (drop `start.lf`, PROTOCOL bump), `src/net/session.ts`, `src/net/coopUi.ts` (rejoin `lf`), `scripts/e2e-lib.mjs` (E2E_FALLOFF), tests | One lamp path; Character shadows Auto/On/Off kept; no `falloff` string left (grep); build + tsc clean | `lampFalloff.test.ts` rewritten photo-only, `lightField.test.ts` brute force, protocol test; e2e: settings, coop-start, rejoin |
| LR16b soft edge terms | Opus | `src/world/lampMath.ts` (`lampCone` -> smoothstep over a feather band, e.g. cut .. cut + 0.25; photo near term -> smooth `ref^2/(d^2 + near^2)`; GLSL in the same file), `src/world/lightField.ts` (hand copy at `:296`), `src/world/bakedLamps.ts` (cone uniforms) | No step anywhere in falloff x cone (unit: derivative bounded); Workshop contact sheet shows no arch; meter equals shader at 200 random points | `lampFalloff.test.ts` continuity, `lightField.test.ts` brute force vs `lampTerm`, GLSL/TS parity test (string-equal constants) |
| LR16c lamp audit script | Opus writes, Haiku runs | `scripts/lamp-audit.mjs` (new), output `docs/sector-redesign/checks/lr16-lamp-audit.md` | Table of every flagged lamp, per map | runs in CI-less `npm run lamp-audit`; unit on a 2-lamp fixture |
| LR16d lamp moves | Sonnet | per-map lamp data only, strictly from the LR16c table (`kestrelLights.ts`, `campusS1..S5*.ts`, `ctcourse*.ts`, `warehouse*`, `bunker*`, ...) | Audit re-run: 0 flags; no lamp moved more than the table says | `lampBake.test.ts`, map-load unit; e2e: every listed map loads |
| LR16e contact-hardening penumbra | Opus | `src/voxel/lampBake.ts` (store per cell the nearest occluder distance along the ray, or bake an area-light visibility from `MAX_SAMPLES` fixture points with jitter = fixture size), `src/world/bakedLamps.ts` (PCSS-style filter width = fixture size x (receiver - occluder) / occluder distance), `src/world/lightField.ts` (same width) | Shadow of a crate edge: sharp at contact, soft 2 m away; no 0.2 m stairs on open floor | `lampBake.test.ts` (penumbra width grows with distance), `lightField.test.ts` parity; e2e shadow-audit |
| LR16f char shadow softness | Opus | `src/world/charShadows.ts` (2x2 PCF at `:82` -> distance-scaled Poisson PCF, same contact rule) | Feet sharp, head shadow soft; frame time within budget | `charShadowSet.test.ts`; e2e char-shadow |
| LR16g brightness re-level | Opus | `src/world/lampMath.ts` (`LIGHT_GAIN` / PHOTO ref) only | S2 atrium pool back to ~0.45-0.5 (lr-tex3d-fix: 0.28 vs Classic 0.48); `ctcourseLight.tuned.json` re-tuned | `lampLevel.test.ts`, `ctcourseLight.test.ts` |
| LR16h docs + chores | Haiku | `docs/systems/lighting.md`, `docs/lighting-review/PROPOSAL.md` LR16 section, settings docs | Docs name one light model | none |

Parallel: LR16a first (it touches every lamp file). Then LR16b, LR16c and LR16f in parallel (no shared files).
LR16d after LR16c. LR16e after LR16b (both touch `bakedLamps.ts` / `lightField.ts`). LR16g after LR16b + LR16e. LR16h last.

## Light parity

The CPU field (`LightField.lampInto` hand copy and `lampTerm`) must apply the exact same feathered cone, smooth near
term and penumbra width as the GLSL, from shared constants in `lampMath.ts` (the GLSL is generated from them, never
typed twice). The penumbra filter in LR16e reads the same baked occluder distance on both sides; the CPU samples the
same taps (fixed kernel, no random). Parity test: 200 seeded points per map, |meter - shader readback| < 0.02.
Guards read `LightField` only (hard rule: gameplay never reads graphics state). Character shadows (LR14) stay
picture-only, as today: they never feed the meter (document this as the one accepted exception, already ruled in LR14).

## Default flip / Classic removal (LR16a)

- Settings: `gameplay.lampFalloff` removed from the type and defaults (`settings.ts:110,167,385`). The parse is a
  whitelist (`pick` per field), so an old stored key is dropped on load: ignore-unknown, no migration.
- Save: settings are not in the IndexedDB save schema; no `SAVE_VERSION` bump (verify `src/save/schema.ts` holds no
  settings copy; if a profile snapshot embeds settings, the same whitelist parse drops the key).
- Co-op: `start.lf` and the rejoin record `lf` removed; `PROTOCOL_VERSION` 38 -> next free number (orchestrator
  assigns; mismatched peers already refuse at hello). Rejoin records with `lf` parse fine (field ignored).
- E2E: drop `E2E_FALLOFF` and every `falloff=photo` suite variant; the default run is Realistic.

## Per-map lamp audit (LR16c)

Script walks every map in `LISTED_MAP_IDS` (`warehouse`, `proving`, `kestrel`, `campusOps`) plus `warehouseOps`,
`ctcourse*`, `bunker*`, `embassy`, `dustDepot`, `courselab`: builds collision, then for each lamp casts 16 horizontal
rays + 8 downward-tilted rays; flags a lamp when a wall face whose normal faces the lamp is within 1.0 m (the PHOTO
near radius) or within 0.6 m for spots along their axis. Output row: map, lamp id, pos, wall dist, wall normal,
proposed move (push back along the normal to 1.2 m, or onto the ceiling centre line), keeping ceiling attach height.

## Perf / VRAM

Campus Realistic atlas ~205 MB and bake 27 -> 118 s already. LR16e adds one channel (occluder distance, R8) per
cell: +25% atlas (~255 MB) - over the low tier budget; mitigation: pack distance in the visibility texel's spare
alpha (0 extra), or keep penumbra width per lamp box at half resolution. Bake: penumbra from fixture samples is free
(samples exist); PCF taps in the shader: 4 -> 8 per lamp, per pixel, capped by the lamp count per tile. Risk: low-tier
GPUs; gate taps by preset (picture only; the CPU uses the same fixed kernel so parity holds).

## Laptop GPU checks before the train

1. `npm run build`, tsc, unit; full e2e (default = Realistic).
2. Per-map contact sheets (Workshop, S1..S5, warehouse, warehouseOps, proving, kestrel, ctcourse): wall-arc shot,
   crate contact shadow, open floor stairs check, character shadow at 1 m and 4 m from a lamp.
3. Parity probe: meter vs shader readback at seeded points, every map.
4. Bake time and atlas MB per map at epic and low; frame time p95 on campus S2.

## Estimate

LR16a 1 window, LR16b 1, LR16c 0.5, LR16d 1, LR16e 2, LR16f 0.5, LR16g 0.5, LR16h 0.25: ~6.75 windows,
~4.5 wall-clock with the parallel lanes.
