status: done feature/sector-redesign-lr16-1 666b2a17

Lead note (Sector Ops Build ~20:20): a fix round is landing on lr16int (torch SpotLight feather, char-shadow cone fit, lights.contribution). Build from c7a26ca7 as written; the lead merges. Do not edit src/world/lightRig.ts torch code, src/world/charShadows.ts or src/world/lights.ts. Desktop-free: unit tests only, vitest --maxWorkers=2.

# LR16-1 - one-bounce fill: walls and ceilings take the light their pools throw (Opus)

Planner: Opus 5.5, 2026-10-23. Plans only; the builder writes the code.

## Goal (Michael's words)
- ~18:08: "Must be realistic depiction of light."
- ~18:15: "I want to make sure we emphasis the light/shadow system like chaos theory did, like a showcase no matter
  where you look."
- CT audit gap 5 (`lr16-0-ct-audit.md`): walls are lit by N.L of the direct term only, ceilings are black; real rooms
  return 1/5-2/5 of the direct light to walls and ceiling (`docs/lighting-review/PROPOSAL.md:268-270`).

Done means: a lit pool lifts the walls and the ceiling around it; a shot, switched, jammed or EMP'd lamp takes its
bounce with it; dark rooms stay dark; meter, guards and picture read the same bounce bytes.

## Base and branch
- Base: `feature/sector-redesign-lr16int` @ c7a26ca7 (LR16a, b, f, v, d campus; checker B PASS). New branch:
  `feature/sector-redesign-lr16-1`. File:line below are at fe23ef4c; the files this slice edits are unchanged on c7a26ca7
  except `world.ts` (+2 lines after `:269`: the extras line `:263` is the same).
- Read first: `lr16-0-ct-audit.md` "LR16-1 one-bounce fill", `lr16b-build.md`, `docs/systems/agent-preamble.md`.
- Cloud build: `npx tsc --noEmit`, `npx vitest run <files> --maxWorkers=2`. No e2e, GPU, or `npm run check`.
- Parallel with LR16e and LR16t. Overlaps: `src/voxel/lampBake.ts` (LR16e edits `bakeOne`; this slice adds one call
  in `bakeLamps` and a result field), `src/voxel/lampJobs.ts:13` `LAMP_VERSION` (LR16e 2, this slice 3: keep 3),
  `src/world/bakedLamps.ts` and `src/world/world.ts` (LR16t edits the torch parts; this slice the fill parts).

## Today (file:line at fe23ef4c)
- Ambient grid: 1 m cells, one byte, zones only (`src/world/ambientGrid.ts:9-34`), built in `bakeLevelLight`
  (`src/world/lightBake.ts:79`). The field reads it trilinearly (`lightField.ts:241`).
- Picture: `nsFillL` (`bakedLamps.ts:888-896`) feeds the darkness curve level for every material, and is the flat fill
  only on non-level, non-voxel surfaces (`:1065-1082`, characters and props). The level's walls take the sky fill
  (`LAMP_SKY`, `:1071-1077`) and the voxels their own: adding light to the ambient byte alone would NOT light walls or
  ceilings on screen.
- Lamps: the hemisphere stops 2.7 deg under horizontal (`lampMath.ts:11-14`), so nothing lights a ceiling.

## Design
### Bake (worker, cached with the lamp bake)
New pure `src/voxel/lampBounce.ts`, called from `bakeLamps` (`lampBake.ts:116`) once per lamp after `bakeOne`. Per lamp:
1. Occupancy over the lamp box grown by `BOUNCE.reach` (re-raster with `rasterise` + the same `occShapes`).
2. Virtual point lights (VPLs) from the lamp's own visibility: every air cell with `vis > 0` and an occupied 6-neighbour
   is a surface patch (area `LAMP_CELL^2` per occupied face, normal = from the occupied neighbour to the air cell).
   Its irradiance per unit intensity: `E = photoTerm(cell - lamp) x vis x max(0, n . L)` (`lampMath.photoTerm`,
   LR16b's feathered formula). Aggregate patches into one VPL per 1 m ambient cell: flux `PHI = albedo x sum(E x A)`,
   flux-weighted mean position and normal.
3. Fixture uplight (ceilings over pendants; real housings leak up): a downward lamp (`cosOuter < -1.5`) adds one VPL at
   the lamp + 0.1 m, normal +y, `PHI = BOUNCE.uplight x pi` (a level-`uplight` cosine lobe at 1 m).
4. Splat to 1 m receiver cells (ambient grid alignment: origin `floor(lo)`) within `reach` of the VPL:
   `B += PHI x max(0, n . w) / (pi x (d^2 + near^2)) x window(d / reach)` with `window = (1 - (d / reach)^4)^2`
   (the photometric window), `w` the unit vector VPL -> receiver; omni receiver (the meter has no normal).
   Visibility: a march on the 0.2 m occupancy from the VPL to 3 points of the receiver cell (its centre and +-0.3 m along
   the receiver's dominant axis from the VPL); weight = share clear. A receiver cell straddling a wall therefore takes
   only the share on the lit side; a room behind a wall gets nothing.
5. Output per lamp: an integer box in ambient cells and `Uint16` values `q = round(B / BOUNCE.q)` (per unit intensity),
   appended to `LampResult.bounce = { boxes: Int32Array (ox, oy, oz, nx, ny, nz per lamp), data: Uint16Array }`.
   `lampJobs.ts` joins and caches it (cache hit check includes it); `LAMP_VERSION` 3.

Constants (export as `BOUNCE` in `lampBounce.ts`; reasoning in the comments):
```
BOUNCE = {
  albedo: 0.35,   // average indoor surface (concrete 0.3-0.4, painted plaster 0.5-0.7, dark floors 0.1-0.2)
  reach: 4,       // m; at 4 m a patch's share is (1 / 17) of 1 m: the window closes it smoothly
  near: 0.5,      // m, d^2 + near^2 (no hot spot at the patch)
  uplight: 0.06,  // share of a downward lamp's level sent up (housing leak) so the ceiling over it is never black
  q: 2 ** -15,    // Uint16 step: max ~2.0 level per lamp per unit intensity
}
```
Check of the numbers: a 3 m pool of level ~1 (28 m^2 lit at ~0.6 mean) returns `PHI ~ 0.35 x 17 ~ 5.9`; a wall 2 m
from the pool's middle reads ~ `5.9 x 0.5 / (pi x 4.25) ~ 0.22`: inside the 1/5-2/5 the audit cites.

### Runtime (pure, gameplay-owned; the picture reads the same bytes)
New pure `src/world/bounceGrid.ts` `BounceGrid`, built by `LightField` (`lightField.ts:123` constructor) from
`bake.lamps.r.bounce`, the ambient grid dims and the baked ids:
- `acc: Float64Array` per ambient cell (exact integer arithmetic: `q x round(intensity x 1024)` per lit lamp);
  `g: Uint8Array` per cell = `round(min(1, acc x q / 1024 x LAMP_LEVEL_GAIN) x 255)`.
- `sync(reg)`: when `reg.version` moved, compare each baked lamp's lit state (`on && !destroyed && intensity > 0`, as
  `lampInto` `lightField.ts:271`) with its stored flag; add / subtract that lamp's box; re-quantise only the touched
  box; bump `version`; grow `dirty` (box union). Allocation-free after construction.
- `LightField.levelInto` (`:232`): `this.bounce.sync(reg)` (one compare when nothing changed), then add the trilinear
  `g` read beside the ambient read (`:241`, same `triInto`, same cell). Meter and guards follow.
### Picture
- `bakedLamps.ts:242`: the fill texture becomes RG8 (`TEXTUREFORMAT_RG`): R = ambient zones (unchanged), G = bounce
  `g`. Re-pack and upload when `bounce.version` moved, at most every 0.25 s, and only the dirty box is re-packed
  (`update`, `:284`). The picture may lag a switch by <= 0.25 s: write it in the header as the one parity exception.
- Shader (`level()` `:888` and the composition `:1065-1082`): `vec2 nsAmbB = nsGrid2(lampAmb, ...)` (`.rg` read,
  same offset), `nsFillL = nsAmbB.r` as today; `nsBounce = nsAmbB.g`; the curve level `nsS += nsBounce`; and for EVERY
  lit material (level, `LAMP_SKY`, voxels, bodies): `nsStat += nsBounce x lampMore.w x lampBounceC.rgb x
  surfaceAlbedo.rgb` (bodies and props also x `nsBF`). New uniform `lampBounceC`: the map's lamp colours averaged by
  intensity, luminance-normalised (computed at load). Standard-material path (`:1119`) gets the same term.
- `src/world/world.ts:263`: pass `bounce: w.lightField.bounce` in `BakeExtras`.

## Files (only these)
`src/voxel/lampBounce.ts` (new), `src/voxel/lampBake.ts` (call + `LampResult.bounce`), `src/voxel/lampJobs.ts`
(join, cache check, `LAMP_VERSION` 3), `src/world/bounceGrid.ts` (new), `src/world/lightField.ts`,
`src/world/bakedLamps.ts` (fill texture, uniform, shader), `src/world/world.ts` (one extras field), `src/world/lightBake.ts`
(only if `LightBake` needs a type for the bounce), tests below.

## Acceptance
- Fixture room 10 x 3 x 10 m, one downward lamp at 2.8 m, intensity 1:
  - ceiling straight over the lamp: bounce > 0.04 and >= 0.1 x the floor level under the lamp;
  - wall 1 m outside the pool edge at 1.5 m: total level >= 0.2 x the pool floor level;
  - next room behind a 0.2 m wall: bounce <= 0.01 at 1 m from the wall, <= 0.03 in the straddling cell;
  - a room with no lamp: bounce 0.
- Lamp off / shot / jammed dark / EMP: its bounce gone in the field at once (`sync`); back on: restored to the same bytes
  (exact integer arithmetic, test with 1000 random toggles).
- Parity: field = ambient + bounce + lamps, and the GLSL `nsGrid2` read equals `triInto` of the same bytes (string /
  formula test as LR16b's).
- `LightField` hot path: the `tests/lightField.test.ts` boxing budget (72 B a query) still holds.
- Bake time: ctcourse bounce adds <= 25% to its node lamp bake (log both).
- Report the 15 map-light failures' new count; do not edit those tests (LR16g).

## Unit tests by name
`tests/lampBounce.test.ts` (new): "ceiling over a lamp is lit", "wall beside a pool reads >= 0.2 of the pool",
"no bounce through a wall", "no lamp, no bounce", "uplight only for downward lamps", "deterministic",
"bake time on the ctcourse fixture".
`tests/bounceGrid.test.ts` (new): "switch off removes exactly that lamp's bounce", "1000 random toggles return to the
same bytes", "only the touched box is re-quantised", "sync is free when the version did not move", "allocation-free".
`tests/lightField.test.ts`: "(LR16-1) level adds the bounce read trilinearly", boxing budget unchanged.
`tests/lampFalloff.test.ts` or a new GLSL test: "(LR16-1) nsGrid2 green channel = field bounce".

## Laptop GPU checklist (lead, after done)
1. Wall + ceiling before / after: campus S1, warehouseOps Goods-in Bay, ctcourse station 2, the Workshop.
2. Shoot a lamp and switch a group off: pool AND its wall / ceiling glow go (within 0.25 s), meter drops.
3. Dark rooms between pools: still under the 0.28 line (meter) and dark on screen.
4. Samplers unchanged (RG in the same texture); `e2e-lightbake` <= 16; bake time and MB per map.
5. Night vision: walls not blown out by the bounce.

## Do NOT touch
`src/world/lampMath.ts`, `src/world/shadowAccuracy.ts`, `src/world/lightRig.ts`, `src/world/charShadows*.ts`,
`bakeOne`'s visibility logic (LR16e), `src/world/ambientGrid.ts` zones, map data, the map-light tests,
`src/net/*` (lamp states already sync; no wire change).

## Model
Opus. Estimate ~1.5 windows; ~500-700 lines incl. tests.


Reopened 2026-10-23 ~20:05 (orchestrator): Cloud Builder 1 stopped at the account swap with this claimed. Resume from the head of its feature branch on origin if it is ahead of the brief base (WIP), else start from the base.

## Report (lead, 2026-10-24)
Built on the desktop by Sector Ops Build after the cloud claim went stale; released in #291 (4.88.0, on master).
