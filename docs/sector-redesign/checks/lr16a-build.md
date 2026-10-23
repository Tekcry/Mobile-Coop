# LR16a build - remove Classic, one light model

Michael 2026-10-23 ~18:12: "Disable returning to original lighting system, focus on only the one new system".
Spec: `docs/sector-redesign/checks/lr16-plan.md` (LR16a row, "Default flip / Classic removal (LR16a)").
Branch `feature/sector-redesign-lr16`. Commits: 315a2805 (WIP src, previous agent), 28913ae7 (src remnants),
8abc272e (scripts), 90db8d5f (tests), 99329285 (docs), then this file.

## What changed
- One lamp path. `src/world/lampMath.ts:41-53` `PHOTO`, `lampReach` (always radius x 1.6), `photoFalloff`;
  `:108` `LAMP_MATH_GLSL` is the photometric GLSL. Gone: `LampFalloff`, `setLampFalloff`, `lampFalloffMode`,
  `matchLampFalloff`, `bakedFalloff`, `LAMP_FALLOFFS`, `LAMP_MATH_GLSL_PHOTO`, `lampMathGlsl`. Linear `lampFalloff` /
  `lampTerm` stay for flashlights.
- Light field photo-only, trilinear ambient, 8 door slots: `src/world/lightField.ts:121`, `:241`, `:283-289`.
- Baked lamps: no `LAMP_PHOTO` define, no runtime GLSL swap, door slots 8, torch draw always: `src/world/bakedLamps.ts:173-175`, `:737`.
- Shadow accuracy always on, toggle deleted: `src/world/shadowAccuracy.ts:34` (`gameLightFalloff`), `:53`
  (`torchShadowPass`); callers folded in `src/world/lightRig.ts`, `src/ai/enemyManager.ts:835`.
- Setting removed: `src/core/settings.ts:104` (type), defaults and `sanitizeSettings` (whitelist parse drops an old
  stored `lampFalloff`, no migration); Settings > Gameplay row removed (`src/ui/screens/settingsScreen.ts`).
- `?falloff` removed (`src/core/flags.ts`); `GameState.create` no longer sets a mode (`src/game/gameState.ts`).
- Co-op: `start.lf` removed (`src/net/protocol.ts:168`, `:726`), `StartInfo.lampFalloff` / `hostLampFalloff` removed
  (`src/net/session.ts`), rejoin `lf` removed (`src/core/rejoin.ts:65`, `src/net/coopUi.ts`). An old record or message
  with `lf` still parses (field dropped).
- Save: `src/save/` holds no settings copy (settings live in IndexedDB `kv/settings`, parsed by `sanitizeSettings`): no
  `SAVE_VERSION` bump.
- Scripts: `E2E_FALLOFF` / `falloffParam` gone (`scripts/e2e-lib.mjs:198`, `scripts/smoke.mjs`); `scripts/e2e-menus.mjs:672-680`
  now asserts the Lamp falloff row, setting and match mode are gone (its Classic -> Realistic Retry leg removed);
  `PROBE_PHOTO` dropped from `scripts/light-measure/` and `scripts/shadow-audit/` probes.
- Docs: `changes/feature-sector-redesign-lr16.md` (fragment, not CHANGELOG.md, per coordinator), `docs/systems/lighting.md:30-50`.

## Wire change for the PR body
`start.lf` and the rejoin record's `lf` are removed: every peer runs the photometric lamps. `PROTOCOL_VERSION` is left
at the branch's 38 (orchestrator: the number is assigned at the train build; master is at 40, so the train must bump
past master's value and update the tests asserting it: crateWire, jammer, jammerFixes, moveState, net x5, rejoin,
sectorLampSync, sectorStep3).

## Tests
- `npx tsc --noEmit`: clean.
- vitest PASS (all): lampFalloff (rewritten photo-only, asserts no mode API left), lightField (brute force now
  photometric + trilinear ambient), shadowAccuracy (always on, toggle tests removed), lampAtlasFit, net (new: start
  carries no lf, an old lf is dropped), rejoin (new: old record with lf parses, field dropped), settings (new: old
  stored lampFalloff dropped, incl. an IndexedDB round trip), settingsCover, lights, crateWire, jammer, jammerFixes,
  moveState, sectorLampSync, sectorStep3, volLights, editor/lightPreview; 15 + 2 files, 0 failures.
- No e2e run (brief).

## Files touched outside the LR16a list (forced)
- `tests/lampAtlasFit.test.ts`, `tests/settingsCover.test.ts`, `tests/volLights.test.ts`,
  `tests/editor/lightPreview.test.ts`: compile errors / expectations built on the authored radius (now x 1.6).
- `scripts/smoke.mjs`, `scripts/e2e-menus.mjs`, the two probe scripts and their configs: imported removed symbols.
- `src/ai/enemyManager.ts`, `src/core/rejoin.ts`, `src/world/lightRig.ts`, `src/world/lights.ts` (WIP commit): callers
  of the removed API.

## Open items
1. 22 map light tests fail now that every map runs the photometric model (they were tuned on Classic; the same
   numbers failed under the old Realistic toggle): `ctcourseLight` 5, `warehouseS1Light` 5, `warehouseS2Light` 4,
   `warehouseS3Light` 5, `lampGridLossless` 3. Not edited (map data / retune: LR16d lamp moves, LR16g re-level and
   `ctcourseLight.tuned.json`). CI `npm run check` stays red until then.
2. Real defect behind several of them: with the 1.6x reach a 2 m column lists more lamps than the shaders' 8 slots
   (warehouse S1-S3: 17, ctcourse: 9), and `lampGridLossless` shows the reach listing drops light (warehouseOps 0.21,
   bunker 1.4e-5). Lamps past the 8th are lost in meter and picture alike (parity holds, light is missing). Needs a
   slot / grid fix or the LR16d moves; not in any LR16 slice yet.
3. `tests/lightField.test.ts` boxing budget 64 -> 72 B a query: the photometric reach lists more lamps per column and
   each extra lamp call boxes its doubles (levelAt 32 -> 68 B, bodyLevel 64.8 -> 134 B; reach 1.0 gives 32 B again;
   the old Realistic toggle measured the same 68). No object allocation (the control check still holds). A hot-path
   pass (query point in fields) could recover it.
4. Editor quick light (`src/editor/lightPreview.ts` `quickLevel`) uses the linear `lampTerm` over the photometric
   reach: no longer the baked formula (dev only, Kestrel paused).
5. `src/world/world.ts:267` comment still says "shadow-accuracy fixes on" (harmless; outside the list).
6. Docs still naming the setting (TESTING.md, settings docs, PROPOSAL): LR16h.
