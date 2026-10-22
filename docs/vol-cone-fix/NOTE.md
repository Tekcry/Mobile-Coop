# Volumetric cones under fixed spots (job vol-cone-fix, 2026-10-22)
The fix for ROADMAP "Waiting on Michael" item 5 (#129), diagnosed in `docs/sector-fixes/l/look-4.58/NOTE.md` (branch
`feature/sector-look`): the Sector Ops strips with a beam optic drew full white fog cones at Epic. Render only.

## What changed
- `src/vfx/volLights.ts` (new, pure, `tests/volLights.test.ts`): `writeVolLight` writes one light's volumetric
  uniforms (march radius, beam direction and cosOuter, colour x gain) into `PostStack`'s typed arrays, allocation-free.
- `src/vfx/postStack.ts` (`PostStack.frame`): calls it in place of the inline block. The old rule was `lamp = !l.cone`
  (from 3.0, when only torches and a few floods had a cone).

## Round 1: the general variant (rejected by the fallback rule)
Every non-torch light as a lamp (`volBeam = kind === 'flashlight'`), commit db0ffadf; shots at e4bd85ad
(`after-*` there). It removed the S1 cones as intended, but the base Warehouse's facade floods lost their visible
beams too (`wh-floods-dock`: two clear fog cones through the dock doors before, only the wall pools after), which is
more than a faint haze, so the job switched to the LED-only variant (round 2). The round-1 rule was:
- A torch (`kind: 'flashlight'`, the guard flashlight slots of `torches.ts`, host and co-op client alike; the players
  carry none) draws the long beam: marched to its reach (at most 14 m), its own cone, gain 1.6. Unchanged.
- Every fixed light - lamps, and `kind: 'spot'` (Sector Ops strips and bulkheads with a beam optic, the base
  Warehouse's three facade floods, the parked maps' floods) - scatters under its shade: march min(3.2, radius / 2,
  max(0.8, y)), along its own beam direction (a tilted bulkhead keeps its tilt), cosOuter max(own, 0.88), gain 1.
- Cone-less lamps get exactly the values they had before.

## Round 2: the LED-only variant (shipped)
`volBeam = kind === 'flashlight' || (cone && !fixture.model)`: only the LED fittings (`fixture.model` strip / panel /
bulkhead, set by `lampMount.ts`; all Sector Ops fittings, facade bulkheads included) take the lamp treatment. Torches
and the floods with a plain housing box (base Warehouse, parked maps) keep exactly their old beam; cone-less lamps keep
their old values.

## Marlow Yard
Marlow Yard (`ctcourse`) has no spot or flood: every light there is a cone-less lamp, and its guards' torches keep
the beam. Its views (`marlow-s2-wall`, `marlow-s7-hall`) are a no-change control.

## Shots (`docs/vol-cone-fix/`, 960 px, Epic unless named)
BEFORE = commit 533a1f30 (master 2f1961ad + the shot script). AFTER = round 2 (LED-only) once the laptop reshoots it;
the table's "round 1" column is the general variant at db0ffadf (laptop GPU, `E2E_GPU=1`, port 4189).

| View | Map | Round 1 (general) vs before | Round 2 (LED-only) vs before |
| --- | --- | --- | --- |
| s1-drainpipe | Sector Ops | none visible | pending |
| s1-roof | Sector Ops | none visible | pending |
| s1-goods-in (+ `-high`) | Sector Ops | the 4+ white ceiling-to-floor fog cones gone; strips, floor pools stay; frame darker | pending (expected: as round 1) |
| s1-workshop (+ `-high`) | Sector Ops | the white cones gone; pools stay; darker | pending (expected: as round 1) |
| s1-girder | Sector Ops | the two cones through the crane girder gone | pending (expected: as round 1) |
| s2-aisle | Sector Ops | none visible | pending |
| s2-cross-aisle | Sector Ops | none visible | pending |
| s3-hall | Sector Ops | none visible | pending |
| s3-deck-sheets | Sector Ops | none visible | pending |
| s3-lobby | Sector Ops | none visible | pending |
| marlow-s2-wall | Marlow Yard | none (control) | pending (expected: none) |
| marlow-s7-hall | Marlow Yard | none (control) | pending (expected: none) |
| wh-floods-dock | Warehouse | the two flood beams gone (only wall pools): FAILS the fallback rule | pending (expected: none) |
| wh-flood-workshop | Warehouse | the flood haze reduced | pending (expected: none) |

Fallback (job brief): if Marlow Yard or the floods change visibly beyond a faint haze, switch to the look-4.58 NOTE's
narrow LED-only variant (`volBeam` true for a torch or for a cone light without an LED fixture model:
`l.kind === 'flashlight' || (!!l.cone && !l.fixture?.model)`, so only the Sector Ops LED fittings lose the beam) and
reshoot.

## Light parity
The fog never feeds gameplay: the meter and the guards read `LightField` (the bake + `lampMath`), which this change
does not touch. The floor pools are the real light and stay as they were. The fix removes the one mismatch the
diagnosis found: the fog cone of the workshop strips at x 16 ran on through the crane girder to the floor, where the
field reads the ambient floor (0.12); the haze now stops 3.2 m under the fitting.

## Repro
After `npm run build` on each commit (4189 free before and after):
```
E2E_GPU=1 E2E_PORT=4189 timeout 1800 node scripts/sector-lights-shots.mjs docs/vol-cone-fix before
E2E_GPU=1 E2E_PORT=4189 GFX=high SUFFIX=-high ONLY=s1-goods-in,s1-workshop timeout 900 node scripts/sector-lights-shots.mjs docs/vol-cone-fix before
```
(`after` in place of `before` on the fix commit; `--sheet` builds `sheet-before-after.webp` from the Epic pairs.)
