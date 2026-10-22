# Sector Ops strip-light cones: GPU look on master 4.58.3 (job sector-look, 2026-10-22)
ROADMAP "Waiting on Michael" item 5 (#129): s1-goods-in / s1-workshop show strong white volumetric cones under the new
strip lights. Desktop hardware GPU (`E2E_GPU=1`, port 4189), build of master cb198a91 (4.58.3, as on `/preview/`).

## Verdict: a bug (render only), not the intended look
The cones are the post stack's volumetric pass drawing every Sector Ops LED fitting that has a beam optic as if it were
a **flashlight**. Light parity holds where it matters (the meter and the guards read `LightField`, the fog never feeds
gameplay, and the cones sit where the lamps are), but the fog is about an order of magnitude heavier than any other
lamp's, which is not what slice L meant and goes against `docs/systems/lighting.md` ("No light cones: a beam is not seen
in clean air, only where it lands. The volumetric haze (post stack) stays.").

### Root cause
`src/vfx/postStack.ts:475` (`PostStack.frame`): `const lamp = !l.cone;`. The rule dates from 3.0, when only flashlights
and a few outdoor floods had a cone. Slice L gave the hall strips their own beam optic: `warehouseS1.ts:50` `HALL`
(45 degree half angle) on the bay (`:73`) and workshop (`:78`) rows, and `warehouseS2.ts:57` `LANE` / `:59` `SOUTH`;
`lampRooms.ts:60-62` turns a fitting with a cone into `kind: 'spot'`. So in the volumetric pass each of those strips gets:

| | lamp treatment (S3 hall strips, no cone) | flashlight treatment (S1 bay / workshop strips today) |
| --- | --- | --- |
| march radius (`postStack.ts:476`) | min(3.2, radius x 0.5, max(0.8, y)) = 2.4-3.2 m | min(reach ?? radius, 14) = the full radius, 4.8-8.8 m |
| cone (`:485`) | cos 0.88 (28 degrees) | the beam's cos 0.71 (45 degrees) |
| gain (`:492`) | 1 | 1.6 |

The in-scatter grows with radius cubed x the cone's solid angle x gain: for a 6.8 m strip that is about
(6.8 / 3.2)^3 x (0.29 / 0.12) x 1.6, roughly 35 times the scattered light of the same strip without a cone. Hence a
full ceiling-to-floor white cone per strip, 12 of them at Epic.

### Evidence (`probe-epic.txt`, the volumetric pass's live uniforms and `LightField.levelAt`)
- s1-goods-in: the bay strips enter the pass as `pos,r -22,5.58,-15.4,7.02 cosOuter 0.71 col 1.01` (and r 4.8-8.8, col
  up to 1.94 for the 1.345 strip); the lobby-roof strips beside them (no cone) as `r 3.05-3.2 cosOuter 0.88 col 0.51-0.55`.
- s1-workshop: the workshop strips `r 5.43-6.83, cosOuter 0.71, col 1.33-1.98`.
- S3 hall (same strip model, no cone): every entry `r <= 3.2, cosOuter 0.88`, and `now-s3-hall.webp` shows no cones.
- The light field under the cones is lit in the open (bay floor at 1 m: 0.24-0.53; 2-3.5 m off the axis 0.22-0.51), so
  the cones are not drawn over dark ground in general. One local mismatch: the workshop strips at x 16 sit right over the
  crane girder (`warehouseS1.ts:334`, x 16, y 4.5-4.9); the field straight under them reads 0.12 (the ambient floor) at
  every height, yet the fog cone runs on through the girder to the floor (the fog has no occlusion; with the lamp
  treatment it stops 3.2 m below the fitting, above most of that shadow).
- Volumetrics off (`*-vol-off`): the cones vanish entirely, so they are the volumetric pass and nothing else (no additive
  cone mesh; the rig draws none).

## Shots (`docs/sector-fixes/l/look-4.58/`, 960 px, Epic unless named)
- `now-<view>.webp`: all nine views of `scripts/sector-lights-shots.mjs` on 4.58.3 (s1-drainpipe, s1-roof, s1-goods-in,
  s1-workshop, s2-aisle, s2-cross-aisle, s3-hall, s3-deck-sheets, s3-lobby).
- `now-s1-goods-in-high.webp`, `now-s1-workshop-high.webp`: High preset (6 volumetric lights, half-resolution post):
  fewer cones, still the same strong ones.
- `now-s1-goods-in-vol-off.webp`, `now-s1-workshop-vol-off.webp`: Epic with the volumetric light shafts off (height fog
  stays): what the rooms look like without any cone.
- `now-s1-goods-in-volfix.webp`, `now-s1-workshop-volfix.webp`: Epic with the proposed fix below applied in the page
  only (`VOLFIX=1`, src unchanged): a short, faint haze under each strip, the same look as the S3 hall strips.
- `probe-epic.txt`: the light field and the volumetric pass's lights for the two S1 views.

The script gained optional env switches (defaults unchanged): `GFX`, `VOL=off`, `SUFFIX`, `PROBE=1`, `VOLFIX=1`
(header comment of `scripts/sector-lights-shots.mjs`). Repro, e.g.:
`E2E_GPU=1 E2E_PORT=4189 VOLFIX=1 SUFFIX=-volfix ONLY=s1-goods-in,s1-workshop timeout 900 node scripts/sector-lights-shots.mjs docs/sector-fixes/l/look-4.58 now`.

## Proposed fix (NOT applied)
Smallest change: only flashlights get the long beam; a fixed spot scatters under its shade like any lamp, along its own
beam direction (the wall bulkheads keep their forward-down tilt), no wider than the lamp cone. This is exactly what the
`VOLFIX=1` shots show.

```diff
--- a/src/vfx/postStack.ts
+++ b/src/vfx/postStack.ts
@@ -472,8 +472,9 @@ export class PostStack {
       for (let i = 0; i < n; i++) {
         const l = reg.lights[this.ids[i]!]!;
         // lamps scatter under their shade (a short cone), flashlights along the beam (stopped by geometry)
-        const lamp = !l.cone;
+        // (a fixed spot - an LED strip or bulkhead with a beam optic, a flood - is a lamp here: only a torch draws a beam)
+        const lamp = l.kind !== 'flashlight';
         const r = lamp ? Math.min(3.2, l.radius * 0.5, Math.max(0.8, l.y)) : Math.min(l.reach ?? l.radius, 14);
         this.lPos[k * 4] = l.x;
         this.lPos[k * 4 + 1] = l.y;
@@ -482,7 +483,7 @@ export class PostStack {
           this.lDir[k * 4] = l.cone.dx;
           this.lDir[k * 4 + 1] = l.cone.dy;
           this.lDir[k * 4 + 2] = l.cone.dz;
-          this.lDir[k * 4 + 3] = l.cone.cosOuter;
+          this.lDir[k * 4 + 3] = lamp ? Math.max(l.cone.cosOuter, 0.88) : l.cone.cosOuter;
         } else {
```

Scope: render only (no gameplay, bake or light-field change; no test reads these uniforms). It touches every
`kind: 'spot'` light on every map: the Sector Ops strips and bulkheads, the base Warehouse's three facade floods
(`warehouse.ts:408-410`) and the parked maps' floods (embassy, mansion, port, refinery). If the outdoor floods should
keep a long beam, the narrower variant is `const lamp = l.kind !== 'flashlight' && (!l.cone || !!l.fixture?.model);`
(only the slice L LED fittings change). Checks after: `npm run check`, then this script's S1 / S2 rows and
`E2E_GPU=1 node scripts/run-e2e.mjs e2e-darkness` on a GPU.

## For Michael's walk
- Compare `now-s1-goods-in.webp` with `now-s1-goods-in-volfix.webp` (and the workshop pair): the fix trades the white
  cones for a faint glow under each strip; the floor pools (the real light, what the meter reads) are unchanged.
- In game at Epic: Sector Ops, the goods-in bay and the workshop. Judge whether the cones read as fog or as a fault, and
  whether the rooms feel too dark without them (`*-vol-off` shows the floor-only light).
- Also visible on the S2 lane strip over the aisle (`now-s2-aisle.webp`, a 30 degree beam): the fix covers it too.
- Settings > Graphics > Volumetric light off removes the cones today if they get in the way of the walk.
