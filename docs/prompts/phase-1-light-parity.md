# Phase 1 - Light parity (version 3.6.0)

Paste into Claude Code (Sonnet 5.5):

> Read CLAUDE.md, docs/progress.md and docs/prompts/phase-1-light-parity.md, and follow it from Step 1.

- **Draft:** by Opus on 2026-10-08, from `ct-movement` at `1f4fba4` (Phase 0 Step 4 in progress).
- **Before the first Sonnet session:** an Opus session checks every path and claim against the code after Phase 0 Step 5, fixes mismatches, and commits this file (see `APPLY.md` in the decisions bundle).

---

## Goal

Make light and shadow tell one truth on every device (bible P1, Section 5.1, rules L1-L13).

**What the player sees** - phone or desktop, host or client - **must agree with:**

- the light meter
- what guards perceive

**Today there are four disagreeing versions:**

| # | Where | What it does |
| --- | --- | --- |
| 1 | Desktop rendering | The baked lamp atlas (`voxel/lampBake.ts`, `world/bakedLamps.ts`), built only when voxels are on. Its input includes the 2.5 cm prop layer, which exists only from High up. |
| 2 | Phone rendering | The 3.4 light renderer: the nearest six lamps as plain unshadowed lights, so lamps light through walls. |
| 3 | Gameplay | The analytic `LightRegistry` plus one static-geometry ray per light (`GameState.updateLight`), with a different falloff and cone formula from the shaders. |
| 4 | Co-op clients | No light state in the protocol. A lamp shot, switched or EMP'd on one machine may not change on another. |

**After this phase:**

- One canonical bake, identical on every device, feeds one pure light function used by all gameplay.
- Every renderer draws from the same bake.
- A parity test proves screen, meter and perception agree.
- Light state is host-authoritative in co-op.
- The meter is continuous.
- Fuse boxes exist.

---

## Rules

- **Branch:** `ct-movement`. Pull first. Never merge into `dev` or `master`.
- **Read only:** `CLAUDE.md`, this spec, `docs/progress.md`, and the files each step lists. Bible sections: 5.1, 5.7 (torches), 5.9 C1-C11, 8, 9.
- **No changes to:** movement, cover, takedowns, sound or maps, except the fuse boxes and test points this spec adds. The Exchange stays paper.
- **Gameplay never reads graphics state** (CLAUDE.md hard rule). This phase makes it true for light.
- **Ambiguity:** choose the option closest to existing patterns and log it under Decisions.
- **Model:** Sonnet implements. Steps marked **(Opus review)** end with a short Opus review session before the next step starts.
- **After each step:** commit and push, write a step report (bible Appendix B) in `docs/progress.md`, then continue unless the step says STOP.

**STOP and report to Michael if:**

- a budget is missed and the cause is not obvious
- the iPhone gate in Step 4 fails
- making the bake input canonical would change what any map looks like on desktop beyond small props
- a parity failure cannot be fixed without changing a map
- anything needs a `SAVE_VERSION` bump (nothing should)

---

## Decisions already made

1. **One source of truth.** Gameplay light comes from:
   - ambient (zones)
   - plus every baked lamp that is on, not destroyed and not disrupted: intensity x falloff x cone x baked visibility
   - plus the baked moon
   - plus dynamic lights (flashlights) with ray occlusion

   The same formula, with the same constants, is used by the CPU (gameplay), the GPU lamp volume (phone) and the exact lamp path (desktop).
2. **The bake's input is canonical.** It is identical on every device, preset, detail tier and test path. It is built from shapes that exist on every device, never from what a preset renders.
3. **Real-time shadow maps only for what the bake cannot know:** flashlights and moving characters. Static lamps and static moon shadows come from the bake.
4. **Phones render the bake** through the two-tap lamp volume on the plain blockout, instead of six unshadowed lights. Gate: the Phone check 3-minute hold at 60 fps on Michael's iPhone 17 Pro Max.
5. **Characters and bodies do not occlude gameplay light** (bible L11).
6. **Light state is host-authoritative in co-op** (bible L10).
7. **Doors (bible L12):**
   - **Approved by Michael, 2026-10-08:** door leaves are left out of the bake. Closed doors are applied at runtime:
     - gameplay: one ray per contributing lamp against door bodies only
     - rendering: the lamp volume's remix includes the closed doors near each lamp as quads, so light stops at a closed door on screen too
   - A door opening or closing remixes its region, like a lamp switching.
   - Rejected alternatives:
     - ignoring doors: light leaks through closed doors
     - baking each door both ways: memory and bake time double per door
8. **The moon (approved by Michael, 2026-10-08):** a baked directional light. Its visibility is baked at 0.5 m cells by extending the sky bake (`voxel/skyBake.ts`) with one directional ray per cell, on every device. Real-time moon cascades are kept only for moving casters on desktop.

---

## Out of scope

- sound
- back-to-wall and any movement change
- the Exchange
- new guard types
- the AI changes beyond the fuse box job (Step 8) and any re-tuning Step 2 proves necessary
- cosmetic lighting features (GI, shafts, bloom), which keep working on desktop as now

---

## Steps

### Step 1 - A canonical bake on every device (Opus review)

**Read:**

- `src/world/world.ts` (`World.create`)
- `src/world/levelBuilder.ts` (where `level.voxels` shapes come from: `voxelSize`, `fineSize`, detail)
- `src/voxel/lampBake.ts`, `src/voxel/lampJobs.ts`, `src/voxel/skyBake.ts`, `src/voxel/voxelCache.ts`
- `src/core/quality.ts` (`VOXEL_TIER`, `PHONE_FEATURES`)
- `docs/systems/lighting.md`

**Change:**

1. **Canonical shapes.** `LevelBuilder` always produces the light bake's shapes, whatever the renderer (phone look, `?gfx=min`, `?voxels=0`, every preset and detail tier). The shapes are analytic, so this is cheap.
   - **Canonical set:** structure shapes plus the dressing the phone look also draws (the Medium box dressing).
   - Detail that exists only at higher tiers is left out of the bake.
   - List every object that is dropped. Any dropped object larger than 0.3 m in two dimensions is a STOP-and-report: it would cast a visible shadow on desktop that gameplay ignores.
2. **Bake everywhere.** `World.create` runs `bakeLevelLamps` and the moon visibility bake on every device when a map has lights, independent of `opts.cheap`, `vo`, `flags.baked` and presets.
   - The bake's cache key (`lampKey` and its moon counterpart) depends only on the map, seed, canonical shapes and lights.
3. **Ambient grid.** Build a coarse ambient grid (1 m cells, R8) from `LightRegistry.zones` (`ambientZone`) at load. CPU and GPU use the same values.
4. **Doors.** Leave door leaves out of the canonical shapes (Decision 7).
5. **Cost.** Measure the bake time:
   - headless (the e2e VM)
   - in phone emulation
   - Michael measures on the iPhone at the end of Step 4

**If a cold bake on the iPhone is over 4 s,** propose a build-time bake (`npm run bake` writing compressed bakes per map into the bundle, keyed by content hash) in the report. Do not build it without approval.

**Acceptance:**

- An e2e check loads the Warehouse under `?gfx=min`, the phone look, `?gfx=low` and `?gfx=epic`, and the bake key and a hash of the bake's visibility data are identical in all four.
- Unit tests for the canonical shape filter and the ambient grid.
- `npm run check` passes.
- Desktop at Epic looks the same as before, apart from the listed small props. Contact sheets go in the report.

**Tests:** extend `tests/lampBake.test.ts`; add `tests/lightField.test.ts` (grows in Step 2).

**STOP after the report** for the Opus review.

---

### Step 2 - One light function for all gameplay (Opus review)

**Read:**

- `src/world/lights.ts`
- the `MIX_GLSL` and `LampPlugin` code in `src/world/bakedLamps.ts`
- `src/game/gameState.ts` (`updateLight`, `lightOccluder`)
- `src/ai/enemy.ts` (`perceive` around `targetLight`, `torchWanted` around the `ambientAt` call)
- `src/ai/enemyManager.ts` (body light around `lightLevelAt`)
- `src/ai/perception.ts` (`lightFactor`), `src/ai/bodies.ts`

**Change:**

1. **Shared constants and maths.** Create `src/world/lampMath.ts` (pure): the one falloff, cone and intensity formula and its constants.
   - The GLSL in `bakedLamps.ts` (mix and exact path) is generated from these constants (string-interpolated), so the formulas cannot drift.
   - Remove the old duplicate formula in `lights.ts`, or make it call `lampMath`.
2. **The light field.** Create `src/world/lightField.ts` (pure): `LightField` holding the CPU bake data (per-lamp visibility boxes, moon visibility, ambient grid) and the registry state. It provides:
   - `levelAt(x, y, z)`: ambient grid + baked lamps x trilinear visibility + moon x moon visibility, with closed doors applied (Decision 7).
   - `dynamicAt(x, y, z, occluder)`: flashlights and other non-baked lights, with the existing ray occlusion.
   - `bodyLevel(x, feetY, z, height)`: the brighter of chest and head, as `bodyLightLevel` does now.
   - All allocation-free.
3. **Replace every gameplay light query** with the field:
   - `GameState.updateLight` (the player meter, 10 Hz)
   - `Enemy.perceive` (`targetLight`)
   - body light in `EnemyManager`
   - `torchWanted`, which uses the full level, not just ambient
   - any other caller found by `grep -rn "lightLevelAt\|bodyLightLevel\|ambientAt" src`
4. **Remote players.** On the host, compute the light level for every player (local and remote) from the field. A client's own meter uses its local field (identical, because of Step 6).

**Behaviour check.** The new field will give slightly different numbers.

- Run `e2e-stealth-ai`, `e2e-stealth`, `e2e-tactics` and `e2e-missions`.
- Compare old and new levels at their test positions.
- If detection behaviour changes, keep today's feel by adjusting lamp intensities or the `LIGHT` thresholds (one place, logged), never by weakening tests.
- Record every changed engine fact for `docs/level-design.md` Section 12, e.g. "darkness hides the player beyond 1.8 m".

**Acceptance:**

- Unit tests:
  - `lampMath` matches known values
  - `levelAt` equals an independent brute-force sum on random points
  - closed doors cut contributions
  - allocation-free under a loop
- All listed e2e suites pass.
- The perf test path stays inside its budgets.

**STOP after the report** for the Opus review.

---

### Step 3 - Desktop renders the same field

**Read:** `src/world/bakedLamps.ts` (exact path, `LampPlugin`), `src/world/world.ts` (sun casters), `src/world/lightRig.ts`.

**Change:**

1. The exact path uses `lampMath` constants (from Step 2), adds the ambient grid and the baked moon, and applies closed doors.
2. **Moon cascades** on desktop draw moving casters only. Static moon shadows now come from the bake. Keep `World.updateSunCasters` for moving casters.
3. Flashlights keep their shadow maps (`BAKED_SHADOWS`).

**Acceptance:**

- Epic and High look the same as before, or better: contact sheets in the report, same views as Step 1.
- `perf.mjs --desktop --budget` passes. Draw calls fall, because static moon casters left the cascades.

---

### Step 4 - Phones render the field (STOP for Michael's iPhone check)

**Read:**

- `src/core/quality.ts` (`PHONE_FEATURES`, `QualityLevel.lite`, `phoneCuts`)
- `src/core/qualityManager.ts`
- `src/world/world.ts`, `src/world/lightRig.ts` (`LightRigConfig.plain`)
- the `LampVolume` code in `bakedLamps.ts`
- `src/game/benchmark.ts` (`phoneCheckRuns`)
- `scripts/perf.mjs`

**Change:**

1. **Phone lamps from the volume.** The phone light look renders static lamps from the lamp volume:
   - two taps per pixel
   - N.L against the stored direction
   - capsule shadows from the nearest characters, as in the 3.3 volume mode
   - plus the ambient grid and the moon visibility tap

   The volume plugin runs on the phone's `StandardMaterial`s: level, smooth characters, weapons, props. The six plain lights are removed.
2. **Flashlights on phone** stay plain pool lights (up to 2). One nearest flashlight may get a 512 shadow map if the Phone check allows. Measure both and report.
3. **Readable darkness (L7).** The darkest playable areas are never pure black on the phone look. Set a floor in the phone grade (`CinematicPost`) and test it.
4. **`perf.mjs --phone`.** Add a mode that runs the real phone look under emulation. Today `?gfx=` turns the phone look off, so the phone path is not measured. Add its budget.
5. **Phone check run.** Add "light look + lamp volume" to the Phone check (`phoneCheckRuns`), including the 3-minute hold.

**Acceptance (emulation):**

- The phone look boots with no console errors on the Warehouse and Proving Grounds.
- Lamps no longer light through walls: an e2e probe behind a wall from a lamp reads dark.
- `perf.mjs --phone --budget` passes.

**STOP.** Michael runs Settings > Display > Phone check on his iPhone on the `/ct/` preview and sends the note.

- **Gate:** the 3-minute hold averages 58 fps or more, with no minute under 55.
- Michael also reports the cold-load time of the Warehouse (the bake, Step 1).
- Continue only when Michael says the gate passed.
- If it fails, report the per-run numbers and propose cuts. Do not cut the volume itself, because it is the point of the phase.

---

### Step 5 - The parity test (Opus review)

**Read:** `scripts/e2e-lib.mjs`, `scripts/e2e-stealth-ai.mjs` (patterns), `tests/losParity.test.ts` (patterns).

**Change:** add `scripts/e2e-lightparity.mjs` to the REQUIRED suites, and a light debug view (`?lightdebug=1`) that renders only the raw light term in greyscale: no albedo, no N.L, no post.

**Checks:**

1. **Data parity (phone look).** Read back lamp volume texels at 200 or more sample points per map and compare to the CPU `levelAt`. Agreement within 2/255 after decoding.
2. **Visual parity (phone look and Epic).**
   - Sample points: walkable cells every 1.5 m, at 0.9 m and 1.5 m height, on the Warehouse and Proving Grounds.
   - Project each point into a debug-view render and read the pixel.
   - Its band (dark / mid / lit by the `LIGHT` thresholds) must equal the CPU field's band.
   - Points within 0.04 of a threshold are skipped.
   - 100% agreement is the target. Report any failures with screenshots.
3. **State changes.** Switch a group off, shoot a lamp, EMP an area, close a door. After each remix, checks 1 and 2 pass again on the affected points.
4. **The meter guarantee (L6).** With the player's meter reading dark, no guard's sight rate exceeds the dark-rate bound (`perception.ts`) at any distance or stance.

**Acceptance:** the suite passes on both looks; the debug view is documented in `docs/systems/testing-tools.md`.

**STOP after the report** for the Opus review.

---

### Step 6 - Host-authoritative light state in co-op

**Read:**

- `src/net/protocol.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/net/netShared.ts`
- `src/game/stealthSystems.ts` (`shotRay`, switches)
- `src/game/gadgetSystem.ts` (EMP `disrupt`)
- `src/world/doors.ts`
- `docs/systems/coop.md`

**Change:**

1. **Light state sync.** Add light state to the protocol, validated in `parseMessage`:
   - per light: on, destroyed, disrupted-until
   - per group: on / off
   - fuse box state (Step 8)
   - **When sent:** on any change as an event, plus a compact checksum in snapshots every 2 s, so clients resync if they drift (the same pattern as doors).
2. **Requests, not actions.** A client's lamp shot, switch use and EMP are requests the host validates and applies, then broadcasts.
3. **Clients rebuild** their field and remix their volume from the host's state.
4. **Door state** already syncs. Confirm its open / closed changes trigger the field and remix on clients.

**Acceptance:**

- `e2e-coop` gains checks:
  - client shoots a lamp: the host's lamp is destroyed and both fields match at sample points
  - host switches a group: the client's field matches
  - an EMP on the client: both disrupted, both restored together
  - a late joiner gets the current state
- `e2e-netmove` and `e2e-coop` pass.

---

### Step 7 - The continuous light meter (L6)

**Read:** `src/ui/hud/hud.ts` (`setLight`), `src/styles.css` (the light meter), `docs/systems/ui.md`.

**Change:** the meter shows the continuous level (0-1) as a bar, with marks at `LIGHT.shadow` and `LIGHT.lit`.

- The state colour or label changes at the marks.
- It updates at 10 Hz or more and never jumps by more than a smoothing step per update (no flicker at band edges).
- Readable on the phone at default brightness, on touch and controller layouts.

**Acceptance:** `e2e-touch` and `e2e-desktop` HUD checks updated; contact sheet of the meter at dark, mid and lit in the report.

---

### Step 8 - Fuse boxes (L8, L9)

**Read:**

- `src/game/stealthSystems.ts` (switches)
- `src/game/interactables.ts`
- `src/ai/enemyManager.ts` (`lightsOut`, `assignAlarm` as the pattern for a job)
- `src/ai/enemy.ts`
- `src/world/mapDef.ts` (`MapLayout`)
- `src/world/maps/warehouse.ts`

**Change:**

1. **Map data and interactable.** `MapLayout.fuses`: a position, the groups it controls, and a reset time. Add an interactable kind `fuse`: a hold to trip it (noise like a switch), which turns its groups off.
2. **AI job.** Like `assignAlarm`:
   - After 8-15 s, the nearest calm guard walks to the fuse box with his torch on and resets it, unless he is knocked out or alerted.
   - Guards near the dark area `notice` as with `lightsOut`.
   - The reset turns the groups back on and remixes.
3. **Warehouse:** one fuse box per lit area. Place them on dark walls, reachable solo.
4. **Co-op:** the host decides, through Step 6's state.

**Acceptance:**

- Unit tests for the fuse state.
- `e2e-stealth-ai` gains:
  - trip, a guard comes and resets it
  - a guard knocked out on the way leaves it off
  - a fuse trip seen by a guard raises suspicion
- `e2e-coop`: a client trips a fuse.

---

### Step 9 - Docs, version, final checks

1. `package.json` `3.6.0`, and the `CHANGELOG.md` entry `## 3.6.0 - Light parity`.
2. `docs/systems/lighting.md` rewritten for the new model: canonical bake, `lampMath`, `LightField`, renderers, co-op state, fuses, the debug view.
3. **`docs/level-design.md` Section 12:** update every light engine fact this phase changed. In the report, list the map decisions that relied on the old facts (bible Section 7). Expected: Exchange design document Section 9 and its D-numbers.
4. **`TESTING.md` - "3.6.0 manual check":**
   - iPhone and desktop, Warehouse:
     - the meter agrees with what you see in 10 spots you choose
     - walk behind a wall from a lamp: dark
     - shoot a lamp: the room darkens and the meter follows
     - trip a fuse box: lights go out and a guard comes to reset it
   - Co-op on two devices: one shoots a lamp, both see it go out.
5. **`docs/progress.md`:** Phase 1 done, Decisions, Measurements (bake times, perf, Phone check), Open issues.
6. **Final checks:** `npm run check`, `npm run e2e` (required, including `e2e-lightparity`), and every perf budget: test path, desktop, phone.

**Report** (bible Appendix B), with the line: "Next: Phase 2 spec (Sound) to be written by Opus." Then **STOP**.
