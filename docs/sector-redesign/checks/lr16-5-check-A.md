# LR16-5 check A (light parity, render correctness)

Commit bb47a985 (`feature/sector-redesign-lr16-5`), base 6eb6a863 (lr16int). Fresh Opus checker A, 2026-10-23.

## Verdict: PASS

No blocking items. Picture, meter and guards read the same `LightDef.flicker` at every step; off stays off; no
`version`-keyed cache goes stale or thrashes; no new data-texture upload; no hot-path allocation added.

## What was checked
- **Field**: baked `lampInto` (lightField.ts:314) and unbaked `dynamicInto` (:372) both x `l.flicker`; `contribution`
  (lights.ts:97) too. Meter (`bodyLevel`) and guard `sightRate` read the same sample (`GameState.updateLight`,
  `tickFlicker` runs before it in the same fixed step).
- **Baked colour texel**: `update` (bakedLamps.ts:298) and `writeFlicker` (:404) write the same value. Scratch test
  `tests/zz_chkA_flicker.test.ts` (uncommitted) drives `BakedLamps.frame` over 2 min of steps: texel =
  colour x intensity x flicker x `LIGHT_GAIN` at every step for the tube, a steady lamp and a fire.
- **lampLit** (:143): stays true through off steps while on (no char-shadow slot churn); false when switched, shot or
  EMP'd (scratch test, 30 s each).
- **Uploads**: `writeFlicker` only sets the existing `dirty` flag, so it adds no upload. In play the capsules make
  `dirty` true every frame anyway. Scratch test: with no capsules, uploads == frames where `flickerVersion` moved.
- **Pooled lights**: `place` (lightRig.ts:595) and `follow` (:521) x flicker. Nothing else writes pooled intensity.
  `nearestLights` filters off lamps, so `follow` never relights one. Scratch test confirms the slot follows every step.
- **Fitting glow**: `paintBulbs` (:655), `max(0.08, nv x flicker)`; off lamps stay at 0.08. Repainted on
  `flickerVersion`, or on `version` when both move. Scratch test confirms.
- **Volumetric haze**: `writeVolLight` (volLights.ts:51) runs every frame from `PostStack.frame`; `nearest` filters off.
- **version vs flickerVersion**: `tickFlicker` never bumps `version`. Its readers, all on/off only and correct to ignore
  flicker: bakedLamps.update, lightRig re-pick / shadow pick, GI `updateGi` (world.ts:701), courseMode mains gates,
  lampSync, charShadowSet (its own version). Nothing that should follow flicker is keyed on `version` only, except the
  polish items below.
- **Off stays off**: every reader gates on `on && !destroyed`; jam, EMP, switch, breaker, shot, `resetTo` and `restore`
  never touch `flicker`.
- **Hot paths**: `tickFlicker` uses typed slots and no closures; `writeFlicker` allocates its index once. The only
  `for...of` (`applyMapFlicker`) runs at load time. No `Math.hypot` added.
- **No sway, no lightning**: confirmed.
- **Tube choice and spot tests** (scratch `tests/zz_chkA_reach.test.ts`, uncommitted; unoccluded contribution of each
  tube):
  - Flicker only lowers light (all levels <= 1), so no tube can remove a dark pocket. Unit spot / pocket tests never
    tick flicker (every lamp reads 1).
  - Live e2e samples: e2e-stealth-ai lit pool (warehouse, -0.5, -3): 0.0014. e2e-sectorops campus feeder meter
    (-28, -58.75): 0. e2e-sectorops co-op "light under the switched lamp agrees on both pages" (warehouseOps group 30,
    -22, -15.4): 0. None can flake.
  - Master A7 R1 (`lightSpots`, 'read' band): only `tests/ctcourseLight.test.ts` reads lightSpots on origin/master. It is
    a unit test and does not tick, so no flake.
  - The tubes are believable: a kitchen back room on a switch (campusOps), a lit office corridor (warehouseOps, the
    routes pass it, about 7 % of the time darker), the airlock 1 bulkhead (ctcourse, no circuit), and the service corridor
    (warehouse).

## Runs
- `npx tsc --noEmit -p .`: clean.
- vitest (slot lock 1, released): lampFlicker, lightField, perception, volLights, enemyLightsOut, smoothWorldLight,
  charShadowSet, shadowAccuracy, lights, lampPluginClone, lampPluginGap: 11 files, 134 passed.
- Scratch `zz_chkA_flicker.test.ts`: 3/3 passed (texel parity, off stays off, bulbs and pool follow).
- coopFix, lampTorchCone, sectorIsolator, torchOcclusion, ctcourseLight: 40 passed, 1 skipped, 4 failed. All 4 are in
  ctcourseLight: the accepted lr16int 4 (`lr16-batch-check-A.md`); that file never ticks flicker.
- warehouseS1Light, campusS2, jammerFixes: 57 passed, 1 skipped, 4 failed. All 4 are in warehouseS1Light: the accepted
  lr16int 4.
- Scratch `zz_chkA_reach.test.ts`: 1/1 (the tube contributions above).
- Not run (per brief): e2e, GPU, build, `npm run check`.

## Polish list (non-blocking)
1. **NV glare and auto-gain ignore flicker.** `pickGlare` (nightVision.ts:194) and the `NightAutoGain.update` targets
   (nightAutoGain.ts:62-75) gate on `on` only, so a tube dark in a drop-out keeps its night-vision glare. Fix: scale the
   target by `l.flicker`, or skip the lamp at 0.
2. **RT reflections ignore flicker.** `lCol = color x intensity` (rtReflections.ts:374-376): on Epic, reflections keep the
   tube lit. Fix: x `l.flicker`.
3. **Voxel GI keeps the tube's bounce through an off step.** `updateGi` (world.ts:701) is keyed on `version`, by design.
   Check on the laptop GPU look run whether the room visibly stays filled. If it does, weight the tube's GI slot by
   `flickerMean`, or re-mix on `flickerVersion` for that slot only.
4. **e2e-darkness (GPU suite, warehouse) reads live `levelAt` to pick its probe points** (e2e-darkness.mjs:53) while
   the warehouse tube (radius 12.8) runs. A pick made during a burst can choose a point whose steady level is off
   target. Freeze flicker in that suite, for example `reg.setFlicker(id, 0)` for each `reg.flickering` before
   `findProbes`.
5. **`paintBulbs` repaints every bulb and re-uploads every fitting's colour buffer** on each `flickerVersion` move. That is
   ~10-20 times per burst, and every frame on refinery (fire). Its `for (const fd of this.fittings)` (lightRig.ts:666)
   now runs on a hotter path. Later: write only the flickering lamps' bulb texels (as `writeFlicker` does) and use an
   indexed loop.
6. **The co-op client's flicker lags the host's by about the one-way latency, not ±4 ms.** `ClockSync` tracks the
   minimum offset (interp.ts:157-160). This is harmless, since the client sees everything at that lag, but the build
   report's "+-4 ms gives the host's value" wording covers jitter only.
7. **Meter and guards sample at `LIGHT.playerHz` (10 Hz); the picture chatters at 18 Hz.** At each sample they read the
   same value (the existing sampling contract). A short chatter can show on screen between two meter samples.
8. **Kestrel editor `volume` mode does not re-mix on flicker** (already noted in the build report). Editor only.
