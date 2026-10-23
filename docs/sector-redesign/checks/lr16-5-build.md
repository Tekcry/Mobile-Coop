# LR16-5 build: moving lights, flicker + stutter

Scope (Michael M13, 2026-10-23 ~21:08): "Flicker + stutter". Fires flicker; one failing tube stutters per main map;
meter and guards follow through the registry. No sway (LR16-5b, Marlow only, later), no lightning.
Branch `feature/sector-redesign-lr16-5`, base lr16int 6eb6a863. WIP from the cut-off agent: fa676c57; continued, not
restarted.

## Design
- Pure model `src/world/lampFlicker.ts`: `fireAt` (:95, three octaves of value noise, 0.75..1, ~3.5 peaks/s) and
  `stutterAt` (:119, 4.5 s windows, a burst in ~55 % of them: chatter off / dim 0.35 / on at 18 Hz, or a drop-out with
  0.7 starter blinks at 14 Hz; a burst starts off and ends on). Value = f(lamp seed, time) only. Lamp seed =
  `lampSeed(mapFlickerSeed(map id, match seed), registry id)` (:74, :81). Time in / value out through `FLICKER_T` /
  `FLICKER_OUT` (:87) so no double is boxed.
- Registry `src/world/lights.ts`: `LightDef.flicker` (:53, 1 steady), `flickerSeed` / `flickerVersion` (:159, :161),
  `setFlicker` (:241, load time), `tickFlicker(t)` (:262): snaps `t` to the 60 Hz step (`FLICKER_STEP_HZ`,
  lampFlicker.ts:24), writes each flickering lamp's `flicker`, bumps `flickerVersion` when one moved, NEVER `version`.
  Fires enrol themselves at `add` (:185).
- Clock: `GameState.updateLight` (gameState.ts:1515) ticks it every fixed step before the meter samples, on
  `this.net?.simTime?.() ?? this.time`. `NetAttachment.simTime` (gameState.ts:172): host = `CoopHost.time`
  (coopHost.ts:1205, the time the snapshots carry), client = `ClockSync.now` (coopClient.ts:494). Snapping to the step
  grid absorbs the client clock's jitter (test: +-4 ms gives the host's value at every step).
- Setup: `World.create` calls `applyMapFlicker(b.lights, map.id, opts.seed)` after `map.build` (world.ts:232). Both
  pages build the same map from the `start` message's map + seed, so ids and seeds match.
- Readers, all x `flicker` (light parity):
  - Gameplay: `contribution` (lights.ts:97), `LightField` baked lamp (lightField.ts:314) and unbaked lights (:372) ->
    `bodyLevel` -> the meter and `ref.light`, which the guards' `sightRate` reads.
  - Picture: baked lamp colour texel in the existing RGBA32F data texture (`BakedLamps.update` bakedLamps.ts:298, and
    `writeFlicker` :404, which rewrites only the flickering lamps when `flickerVersion` moves; no new sampler, the
    16-sampler cap is unchanged); pooled Babylon lights (`LightRig.place` lightRig.ts:595, and `follow` :521 between
    picks); fitting glow (`paintBulbs` :655, repainted on `flickerVersion`); volumetric haze (volLights.ts:51).
  - `BakedLamps.lampLit` (bakedLamps.ts:143): a tube at an off step keeps its character-shadow slot (no slot churn).
- Off stays off: the multiplier never touches `on` / `destroyed`; every reader already gates on them (the jam path is
  unchanged and still drives `on`). A restored / section-reset lamp flickers again; a full restart rebuilds the map,
  same tube, same seed, the clock from 0.

## Which lamps (`STUTTER_TUBES`, lampFlicker.ts:193; first matching candidate wins, match within 5 cm)
| Map | Tube | Why |
| --- | --- | --- |
| campusOps | (-25, 7.9, -26) | HQ L1 breakout kitchen fitting: back room off the south ring, not on a player route; the two break guards loop under it |
| warehouseOps | (-3.4, 2.75, -12.3) | Trade offices corridor panel, west half: a lit corridor the corridor guard walks; not a dark pocket |
| ctcourse | (81.6, 3.8, 57.4) on master (marlow-final A7 data hall: south aisle rack-row strip, on the technician's loop R0-R1); on this base (19, 3.05, 7) airlock 1 lamp | Service spaces; never A2 / A4 / A6 / A8 (PR #257's sets) |
| warehouse | (9, 5.05, -9) | Service corridor strip between the fire walls, over the corridor patrol (listed map; extra to the three named) |
Fires: only `refinery.ts:331` (the flare) has `kind: 'fire'`; it flickers. No main map has a fire.

## Wire change
No. `simTime()` is a local method on `CoopHost` / `CoopClient` reading state they already have (host time, the
snapshot clock); no message, field or `PROTOCOL_VERSION` change. Lamp on / off sync (`lampSync.ts`, keyed on
`version`) is untouched because flicker never bumps `version`.

## Tests
- `tests/lampFlicker.test.ts`: 20 tests, all pass. Fire range / smoothness / rate / mean; stutter on-share, burst gaps,
  levels, one burst per window; determinism host == client (two registries, same values), value a function of time only;
  registry: `flickerVersion` moves, `version` never; `tickFlicker` allocation (6.8 B per call for 5 lamps, under the
  16 B one-boxed-number budget); meter follows: baked `lampAt` = steady x flicker at every step for 2 min, `bodyLevel`
  drops at an off step and a guard's `sightRate` with it, back on = as before; unbaked path (fire) same; off stays off
  for shot / switched / group cut / jam dark (60 s of steps, contribution 0, `version` unchanged); restart (restore,
  `resetTo`, map rebuilt twice = same pattern); shared clock jitter; one stutter tube per main map with a live lamp.
- Measured: fire 0.759..0.994, mean 0.876, 3.55 peaks/s, max step 0.019 / tick; stutter on 93.0 %, mean 0.9375,
  426 bursts / h, gap 8.46 +- 6.59 s, longest 1.37 s.
- `npx tsc --noEmit -p .`: clean.
- `vitest run tests/lampFlicker.test.ts tests/lightField.test.ts tests/lights*.test.ts tests/perception.test.ts
  tests/volLights.test.ts tests/enemyLightsOut.test.ts tests/smoothWorldLight.test.ts`: 7 files, 92 passed.
- Also run (files reading the edited modules): coopFix, lampPluginClone, lampPluginGap, lampTorchCone, sectorIsolator,
  shadowAccuracy, torchOcclusion, charShadowSet, ctcourseLight: 82 passed, 1 skipped, 4 failed, all in ctcourseLight:
  the known accepted 4 on lr16int (`lr16-batch-check-A.md`: "ctcourseLight 4"), not caused here (those tests never tick
  flicker, so every lamp reads 1).
- Not run (per brief): e2e, GPU, `npm run check`, build.
- `tests/zz_alloc.test.ts` (WIP scratch) dropped; the allocation check lives in `lampFlicker.test.ts`.

## Fixes over the WIP
- `tickFlicker` never wrote the time into `FLICKER_T`: every lamp evaluated a stale time (the WIP's determinism test
  passed only because both registries read the same stale value). Fixed, and the time is snapped to the 60 Hz step.
- Pooled (unbaked) lights only took the flicker at a re-pick (`put`); `follow` now updates their intensity each frame.
- The WIP's burst helper split a chatter at an on-run > 0.2 s, failing two stutter tests; it now groups by window.
- Two stray formatting slips in lights.ts restored.

## Perf
- Per fixed step: `tickFlicker` over the flickering lamps only (1 per main map; refinery 1 fire): a few hashes, no
  allocation. Per frame: `writeFlicker` rewrites 1 texel when `flickerVersion` moved and the data texture uploads only
  then (a tube moves ~10 times in a burst, otherwise never); `paintBulbs` repaints the bulb colours on the same frames.
- Refinery's fire moves every step, so its bulbs repaint and the data texture uploads every frame there (one
  RGBA32F texture, as a jam does). Refinery is not a main map; a per-lamp bulb paint is the fix if it ever shows.
- The bounce / GI slots (world.ts:701) stay on `version`: they ignore flicker (by design).
- GPU frame time not measured (no GPU run in this slice): pending the laptop.

## Open items
- GPU look check (laptop): the tube chatter on screen vs the meter on warehouseOps / campusOps / Marlow A7.
- ctcourse: on this base the tube is the airlock 1 lamp; at the master merge the A7 strip candidate takes over (it
  exists on origin/master `a7DataHall.ts:352`). The A7 lightSpot "A7 R1" (77.5, 57.4) is 4.1 m from that strip,
  inside its 4.5 m radius: any e2e that samples that spot live could catch a burst (unit light tests do not tick).
- `STUTTER_MEAN` (0.94) is a rounded constant; measured 0.9375 (test tolerance 0.01).
- The Kestrel editor's lamp volume mode (`BakedLamps.volume`, editor only) does not re-mix on flicker.

## Merge hazards vs LR16-1 (merges first; same files)
- `bakedLamps.ts`: this slice edits `lampLit` (:143), `update` (:298 adds `* l.flicker`), the end of `frame` (:355),
  and adds `flickV` / `bakeIndex` / `writeFlicker` after `writeDoors` (:395-430). Re-apply `* l.flicker` to any new
  colour write LR16-1 adds; if LR16-1 changes the colour texel layout (`LAMP_TEXELS`, the `+ 1` texel), `writeFlicker`
  must follow it.
- `lightField.ts`: two one-token edits (:314, :372). If LR16-1 adds a bounce term here it should use the lamp's steady
  level or `flickerMean(mode)` (lampFlicker.ts:175), never the per-step `flicker` (the bounce would re-sum every frame).
- `lampBake.ts`: not touched here.
- `lights.ts` `LightDef` gains a required `flicker`; any LightDef literal LR16-1 adds needs `flicker: 1` (tsc flags it).
- LR16-5b (sway) should keep its state beside the flicker lists in `LightRegistry` and also avoid `version` bumps.
