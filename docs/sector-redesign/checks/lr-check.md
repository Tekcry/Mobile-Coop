# LR check - LR13 lamp falloff setting + shadow-accuracy fixes

Fresh Opus checker, 2026-10-23 ~15:30. Branch `feature/sector-redesign-lightrev` @ 93e54a51, diff `origin/master...HEAD`
(master 4.75.0 merged). Read only; this file is the only change.

## Verdict: PASS

No blocking items.

## Checks

1. **Parity, one mode per match.** `GameState.create` (`gameState.ts:857-860`) resolves the mode once
   (`matchLampFalloff`: host `lf` > `?falloff=photo` > setting), then `setLampFalloff` and `setShadowAccuracy`, then
   `World.create`. `World.create` has no other caller. Everything that reads the mode does so when it is built, after that
   point: `LightRegistry.add` (`lampReach`), `LightField.photo` / `.accurate`, `BakedLamps` door lists, `LampPlugin`
   (`photo` field plus `getCustomCode` -> `lampMathGlsl()`), `LampVolume` mix, `LightRig.accurate`,
   `EnemyManager.bodyOccluder`. The bake cache key hashes `baked.lights`, so the scaled reach gets its own bake. The meter
   (`bodyLevel`) and the guards (`levelAt` / `totalAt`) use the same `lampInto`. Its photometric branch matches
   `photoFalloff` and the GLSL (`lampFalloff.test.ts` runs the GLSL body as JS against both modes). Babylon's effect
   cache key is `vertex+fragment@defines` (`thinEngine.pure.js:1683`). Material effects are keyed by name, so the
   `LAMP_PHOTO` define is what separates them across modes. The `EffectWrapper` mix is keyed by its source, which already
   differs. A Sector Ops checkpoint restart is in place (no rebuild), so the mode never changes mid-match.
   **Classic unchanged:** linear `lampReach` returns the radius. `.replace(LAMP_MATH_GLSL, LAMP_MATH_GLSL)` is identity
   (no `$` in the pattern). A false `LAMP_PHOTO` emits no `#define`. `torchShadowPass(_, false)` gives the old two-pass
   order exactly. `fitMaterial` with `physical` false takes the old early return. `bodyOccluder` is `undefined`, so the
   call is as before.
2. **Co-op.** The host sets `hostLampFalloff` in `coopUi.adopt`. `startMatch` writes it into `StartInfo`. `startMsg`
   sends `lf`, and `parseMessage` reads it with `oneOf(...) ?? 'linear'`. The client gets `StartInfo.lampFalloff`, which
   becomes `GameOptions.lampFalloff` and overrides its own setting and URL. Late join and rejoin re-send the stored
   `this.start`, with `lf` kept (tested on a re-hello). Protocol 38: the host ignores any other `hello` version.
   Grepping the whole repo, including `scripts/`, found no version asserts outside the 8 updated tests
   (`security/data.ts` only mentions it in a comment). `src/net` is only reached through the existing dynamic import.
   `settingsScreen` reads `app.current` structurally, with no static net import. In a co-op match the settings row is
   `lockedRow` showing `GameState.lampFalloff`.
3. **Settings.** `gameplay.lampFalloff` lives in `kv/settings`, parsed with `pick(..., LAMP_FALLOFFS, 'linear')`.
   Missing, junk or older settings read Classic. Defaults resets it. No save-shape change, so no `SAVE_VERSION` bump is
   needed (tested through IndexedDB).
4. **Shadow-accuracy fixes.**
   - `bodyOccluder`: one closure per `EnemyManager`, which calls the existing allocation-free `beamHit` (shared
     `earA`/`earB` scratch, used in sequence). No allocation per tick.
   - `bakeVisSampler` and `doorSeen` run at load only. The leaf normal `(uz, -ux)` matches `doorBlocksOne`. The test is
     conservative (`> 0` over 27 trilinear taps). The field and the shaders build the one list from the same bake, so
     parity holds even if a door is wrongly dropped.
   - `gameLightFalloff` only changes a material with `usePhysicalLightFalloff === true` (PBR; standard materials don't
     have it), only when `accurate`, which means Realistic only.
   - The ambient trilinear read matches the bilinear 3D `lampAmb` read.
5. **Gameplay vs graphics state.** The mode comes from `settings.gameplay` plus the URL flag, never from a preset, Auto
   or the governor. Graphics code (`LightRig`) reads the gameplay mode, not the reverse.
6. **Tests are real.** `lampFalloff` runs the GLSL as JS and compares it to the field on a real bake, in both modes.
   `shadowAccuracy` uses a real bake with doors, the trilinear fill, the pass order and the occluder. `net` covers the
   real session round-trip plus junk and missing `lf`. `settings` covers IndexedDB. The `startMatch` helper in
   `shadowAccuracy.test.ts` restates `GameState.create` rather than calling it; the e2e-menus leg covers the real path.

Run here (slot 1, released): `npx tsc --noEmit` clean. Vitest single files, all green: `lampFalloff`, `shadowAccuracy`,
`settings`, `settingsCover`, `net`, `lightField`, `sectorStep3`, `rejoin` (141 tests), plus `crateWire`, `jammer`,
`jammerFixes`, `moveState`, `sectorLampSync`, `lights`, `ui` (107 tests).

## Polish (non-blocking)

1. Add a guard test that `LAMP_GLSL` and `MIX_GLSL` contain `LAMP_MATH_GLSL` (`bakedLamps.ts:517`, `:800`). If either
   template is ever edited so the `.replace` misses, Realistic shaders silently stay linear while the field goes
   photometric.
2. `RejoinRecord` (`core/rejoin.ts:16`) has no `lf`, so "Resume hosting" after a host reload re-reads the host's current
   setting. Peers still agree, but a resumed match can run a different mode from the one that dropped. Store `lf` in the
   record and pass it as the host's override on resume.
3. The locked row shows for the host in a match too, not just the client. That is fine, but `lr13-build.md` and `ui.md`
   say "the client's row".
4. `tests/sectorStep3.test.ts:53` test name still says "now 35".
5. Protocol 38 skips 36 and 37, which are reserved by `pose-parity` and `coop-walk-fixes`. Check the merge order on the
   train.
6. Realistic atlas size (campusOps 48 -> 134 MB, bake 27 -> 118 s in node; shadow-audit section 1) belongs in the LR13
   perf step before any default flip.

## For the laptop

- Logic e2e: `e2e-menus` (the LR13 leg), `e2e-coop` and `e2e-netmove` (protocol 38, `lf` on start / rejoin),
  `e2e-sectorops` (checkpoint restart keeps the mode), `e2e-lightbake`.
- GPU (port 4189):
  - `e2e-darkness` and `e2e-lightbake` with `?falloff=photo` (the photometric loop compiles; luma against the field).
  - A Classic run of `e2e-darkness` to confirm no regression.
  - A Classic -> Realistic -> Classic sequence in one page (no stale compiled effect).
  - Shadow audit: a guard torch on Wren at 2-4 m against the floor; two torches facing a wall with micro detail on.
  - The PROPOSAL 7.4 step 4 perf run (bake time and atlas on warehouseOps and campusOps, S1 bay frame time, photo
    against linear).
