# Campus fog fix - fresh check (PR #339, head 513a7121, base master d91d0e00)

**Verdict: PASS.** No must-fix. GPU after shots (`shots/fog-4813dbf2`) still to confirm the look; nothing in the code
blocks on them.

Checks run: `npx tsc --noEmit -p .` clean; eslint on the changed src / test files clean (the shot script is in the
ignore list; `node --check` passes); `npx vitest run tests/volLights.test.ts` 8/8 pass.

## 1. Cause and what is left on campus
- Cause confirmed. `volBeam` (`src/vfx/volLights.ts:29-30`) beamed every coned light without `fixture.model`; every
  campus `lamp()` helper (`campusS1.ts:154`, `S2:199`, `S3:229`, `S4:232`, `S5:268`) makes a coned fitting a `spot` with a
  plain `fixture` box, no model, so all campus cone fittings took the torch beam: march `min(reach, VOL_BEAM_MAX 14)`
  (`:42`), their own wide cone (`:48`), gain 1.6 (`:56`). #156's LED-model rule could not catch them.
- With `lampBeams` false every non-torch takes the lamp rule: march <= 3.2 m (and r/2), cone clamped to cos 0.88, gain 1.
  Campus intensities are 0.25-1.35 (mostly 0.7-0.9), so a converted fitting scatters ~1 unit
  (I x 3.2^2 x 0.12) against ~90-1000 before (e.g. an S3 high bay: 0.8 x 14^2 x 0.59). The 12 lights Epic scatters in
  one room drop to roughly the Sector Ops strip level.
- Nothing else on campus beams or hazes heavily:
  - Fittings with models: none on campus (no `model:` in the campus files).
  - Floods: campus has none apart from the coned box fittings, which are now lamp-rule.
  - Emissive boxes (`lightRig.ts:209-217`, emissive = colour x 1, x flicker): above the bloom threshold 0.75
    (`postStack.ts:366`) so each box gets a bloom halo (weight 0.35, kernel 64, half scale), small and local; no veil.
    The `BLOOM=off` shots will show how much it adds.
  - No additive glow cards or cone meshes on campus (`ALPHA_ADD` only in `menuSets.ts`; the in-game additive cones
    were removed in Step 4b, `lightRig.ts:47, 85`).
  - Height fog: campus `lightLevel` 0.3 gives density 0.007, falloff 0.55 from y 0; at eye height ~0.3%/m, about 8%
    over 30 m, dark horizon colour, not pale. Campus has no `weathers`, so fog weather (x4) cannot be chosen there.
  - Linear scene fog 40-140 m: outdoors only.
  - Epic `lens` is chromatic aberration only (`postStack.ts:379-382`).
- Epic / High: both run the same pass (12 / 6 nearest lights); the rule is per light, so the fix applies at every
  volumetric preset. Low has no pass.

## 2. Light parity
Holds. `writeVolLight` is imported only by `postStack.ts`; no change touches `lights.ts`, `LightField`, the meter, the
bake or guard perception. The new field lives on `MapTheme` and is read only by `gameState.ts:613` into the post stack.

## 3. Scope
- `lampBeams` is set only in `campusOps.ts:106`; `gameState.ts:613` and `postStack.ts:467` default to true, and
  `volBeam` / `writeVolLight` default `lampBeams = true`, so every other map (Marlow Yard's 12 floods, the base
  Warehouse floods, warehouseOps' LED fittings, the editor and the menu stack with `lights: null`) computes exactly
  what it did on master.
- No other MapDef reuses the campus theme (`buildCampus` is called only by `campusOps.build`); co-op host and client
  build the same theme, so both pages agree.
- Torches: `kind === 'flashlight'` short-circuits before the switch (`volLights.ts:30`); campus is dark (ambient 0.3) so
  `addTorchSlots` gives it the 4 guard torch slots and they keep the beam. There is no player-held torch in `src`
  (no flashlight light outside the guard slots), so nothing else to keep.

## 4. postStack.ts / gameState.ts
- Needed: the pass is the only place the per-light uniforms are written, and the map theme reaches it only through
  `PostStackOptions` (built once in `GameState`).
- Hot path: `frame` reads one boolean (`this.opts.lampBeams ?? true`) and passes it on; no closure, array or object.
- Quality / preset change mid-match: `apply` rebuilds the post processes but keeps `opts` (constructor field, never
  reassigned), and `frame` reads `opts.lampBeams` every frame; `setAdaptive` (governor) only changes `volMax`. So the
  rule survives Low -> Epic, preset changes, governor steps and night vision toggles. No shader, uniform or texture
  change (16-texture cap untouched).

## 5. Tests
`tests/volLights.test.ts` would fail on master: `campusOps.theme.lampBeams` is undefined (`toBe(false)` fails), and
master's `volBeam` ignores a second argument, so `volBeam(l, false)` is true for the coned box fittings; the
`> 50` beams-without-the-switch assertion pins the cause. The per-light checks (march <= 3.2, cos >= `VOL_LAMP_COS`,
gain 1) cover every campus fixed light. The second test pins Marlow's default and that it still beams.

## 6. scripts/campus-art-shots.mjs
Defaults unchanged: every switch is off unless its env var is set; with none set the page code only reads the stack
(the probe string is built but not written), file names and the counts line format are as before.

## 7. Docs
`lighting.md` (Volumetric beams), `graphics-quality.md:88`, the code comments and `changes/feature-sector-redesign-fog.md`
match the code (76 fittings, 14 m, 1.6x, Medium and up, torches keep beams, Marlow / other maps unchanged, rendering
only). The fragment follows `changes/README.md`.

## Polish (not blocking)
- The wiring theme -> `GameState` -> `PostStackOptions` -> `writeVolLight` has no test: dropping
  `gameState.ts:613` or the argument at `postStack.ts:471` would pass every test. The after shots' probe
  (`after-probe-epic.txt`: no light above 3.2 m / below cos 0.88 except torches) is the only proof; read it.
- Shot script: `VOL=off` uses `setAdaptive(1, 0)`, which the governor's next `applyAdaptive` (`gameState.ts:984`) can
  undo mid-run; check `PROBE=1` output or the `-voloff` shots for `vol lights 0` before trusting a comparison.
- Shot script: the probe string is built on every view even without `PROBE=1` (harmless, a few hundred bytes).
- `graphics-quality.md:84` still says "additive cones hidden with volumetrics" though the cones were removed
  (pre-existing, not this PR).
- `TESTING.md` has no line for this fix (DoD lists it); a one-line "Saltmarsh Park on Epic: rooms clear, short haze
  under each fitting, guard torches still beam" would do.
- Open as the triage says: Marlow Yard's 12 coned floods still beam (look change for Marlow Build to judge).
