# LR14 build - character silhouette shadows from lamps
Branch `feature/sector-redesign-charshadow` (off `-lightrev` 7c403385, `-lightrev` 8ccf7822 merged in). Plan:
`docs/archive/lighting-review/LR14-PLAN.md`. Michael (~14:42): "yes i want to include this system now as its one of the main
focus of the game".

## Built
- The 2-4 baked lamps nearest the player (and the camera) get a real-time shadow map of the characters in their reach -
  players (local and the co-op partner), guards, bodies, held weapons and gear - drawn by Babylon's shadow generator,
  copied into ONE shared float atlas (2 x 2 tiles), read by the lamp plugin per lamp. Static geometry stays in the
  baked visibility atlas; every other lamp, Low and Medium keep the capsule shadows.
- Lamp set: candidates are lit lamps whose radius + 3 m reaches the focus; nearest first, re-picked at 10 Hz; a held lamp
  competes at 0.75 x its distance, holds 0.5 s at least and stays a candidate 1 m further; a lamp going dark (switch,
  shot, jammer) lets go on the next frame; a lamp keeps its slot (tile) while it stays.
- Presets: High 2 lamps x 512 px, Ultra 3 x 1024, Epic 4 x 1024; Low / Medium 0. Settings > Graphics > Character
  shadows: Auto (default) / On / Off (`video.charShadows`, sanitized, no save bump; On below High = High's set). Co-op:
  render only, each machine its own setting and its own nearest lamps; no wire change.
- `?gfx=min`, maps without baked lamps and the voxel micro-detail path (`?voxels=1`) never take them (see Budget).

## Files
- New: `src/world/charShadowSet.ts` (pure: presets, `LampSlotPicker`, `fitCone` / `coneCovers`, atlas tiles),
  `src/world/charShadows.ts` (`CharShadows`: slots, generators, atlas copy, `CHAR_SHADOW_GLSL`),
  `tests/charShadowSet.test.ts`.
- Changed: `src/world/bakedLamps.ts` (`LAMP_TEXELS` 7 -> 8, t7 = slot + 1; `writeCapsules` writes it and drops capsules a
  map holds; `LampPlugin` `LAMP_CSHADOW`, sampler `lampCsAtlas`, UBO `lampCsM` / `lampCsP` / `lampCsI`, one call in the
  lamp loop after N.L; `lampLit`, `spheres`, `count`, `lampTexels`), `src/world/world.ts` (`charCasters`,
  `addShadowCaster(.., character)` with props excluded, `CharShadows` made with the baked lamps, configured in
  `applyQuality`, governor in `applyAdaptive`, `frame` before the lamps write), `src/world/lightRig.ts` (default spec
  fields only), `src/core/quality.ts` (`ShadowSpec.charLamps` / `charTile`, `shadowSpec(q, mode)`,
  `qualityLevel(.., charMode)`), `src/core/settings.ts`, `src/core/qualityManager.ts`, `src/ui/screens/settingsScreen.ts`,
  `tests/settings.test.ts`, `scripts/e2e-lightbake.mjs` (LR14 asserts at smooth Epic), `scripts/e2e-desktop.mjs` (its
  shot-lamp probe read the data texture with a stale stride of 6 texels: now `L.lampTexels`).
- Docs: `docs/systems/lighting.md` (Character silhouette shadows), `docs/systems/graphics-quality.md` (preset row),
  `docs/systems/ui.md`, `TESTING.md`, `changes/feature-sector-redesign-charshadow.md`.
- Merge note for the -shadow auditor: the lamp loop gains 4 lines after `k *= ndl;` (own `#ifdef LAMP_CSHADOW`), and
  `nsCharShadow` lives in its own string in `charShadows.ts`; the bake visibility tap is untouched. `LAMP_TEXELS` is 8.

## Budget numbers
- Textures per lit shader: +1 (`lampCsAtlas`) while on; the slots' spot lights reach no mesh, so their maps add none.
  The voxel micro-detail shader is at 16 with its one flashlight shadow (`LightRig` `MICRO_SHADOWS`), so that path keeps
  the capsules; `e2e-desktop` part 3 (voxels) is unchanged. Smooth default: the real maximum is measured by the new
  `e2e-lightbake` assert (Epic, guards alerted, <= 16) - not yet run on a GPU (see below). If it reads 17,
  `BAKED_SHADOWS` drops 2 -> 1 while character shadows are on.
- GPU per frame: per slot one depth pass of the characters in reach (guard parts are instanced, so about 20-40 draws a
  lamp; nothing when no character is in reach), one tile copy (a 512^2 or 1024^2 quad); far slots (> 8 m) every 2nd
  frame, x the governor's `shadowEvery`. Per pixel in a mapped lamp's light: one mat4 x vec4 and 4 texelFetch, in place
  of up to 4 capsule tests. Worst case Epic: 4 extra depth passes, about 80-160 extra draws (pending the laptop's
  count against the 600-draw budget).
- Memory: High atlas 1024^2 R32F 4 MB + 2 maps (512^2 float + depth) about 4 MB; Epic atlas 2048^2 16 MB + 4 maps
  (1024^2) about 32 MB.
- CPU: the picker over the baked lamps at 10 Hz (a dark-lamp check each frame), per slot one pass over
  `World.charCasters` (sphere tests). No allocation per frame in LR14's code (typed arrays, render lists refilled in
  place; `tests/charShadowSet.test.ts` bounds the picker + fit at <= 16 B a call, i.e. no object). Babylon's own
  `ShadowGenerator.getTransformMatrix` makes one `Vector3` when a slot's light moved (as every flashlight shadow map
  already does).

## Parity note (render only)
The light meter and guard perception are unchanged: they read `LightField`, which never had a character shadow (the
capsules were render-only too), and the darkness curve's input (`nsLampRaw`) stays without character shadows. What
changes is only the picture, and only inside a mapped lamp's silhouettes, where that lamp's direct term drops to 0.15
(the capsules' floor, so the depth of a shadow is the same at every preset):
- New casters: the co-op partner, bodies, held weapons and gear now shade the lamps nearest you (the capsules covered
  only the local player and living guards). Example: you stand in your partner's shadow under an S1 goods-in strip:
  on screen that strip's share of your body drops by up to 85% while the meter still reads it in full (S1 bay standing
  body median 0.436, `light-measure.md`). Before LR14 there was no partner shadow at all, so this gap is new.
- Shape: a standing guard's capsule (r 0.22, 1.6 m tall, about 0.86 m^2 across plus its penumbra) becomes the real
  silhouette (about 0.6 m^2 standing); a crouched or prone guard shrinks to its pose (the capsule never crouched).
  So the shaded area under a guard is about 30% smaller standing and about half crouched; the darkness inside is the same.
- Self shadow: an arm or rifle across your own chest now shades it from that lamp; the meter samples the lit chest /
  head of the field and does not see it. Back faces only are drawn into the maps, so a lit surface never shades itself.
- Nothing changes at Low / Medium, with the setting Off, on `?gfx=min`, or for lamps outside the 2-4 nearest.

## Tests and checks
- `npx tsc --noEmit`: clean (after the merge and the toggle).
- vitest (single files, `sr-slot-3.lock`): `charShadowSet` (11), `graphics`, `settings`, `settingsCover`,
  `lampFalloff`, `lampPluginClone`, `lampPluginGap`, `lampLevel`, `lampBake`: all pass (51 + 15 tests in the last runs).
- eslint on every changed `.ts`: clean.
- GPU smoke: NOT run. Desktop CPU read 59%, 82%, 99%, 86%, 77% at each check (the rule is < 50%), and `heavy2.lock` was held
  at the first. So the shader compile, the atlas copy and the console are unverified on a GPU: the laptop's
  `e2e-lightbake` run below is the first real check.

## What the laptop must run (Test Runner, branch `feature/sector-redesign-charshadow`, head of this report's commit)
1. `E2E_GPU=1` `node scripts/run-e2e.mjs e2e-lightbake` (port 4189): the LR14 asserts (smooth Epic: on, 4 slots,
   `LAMP_CSHADOW` compiled, maps copied, every shader <= 16 textures with the guards alerted) and no console errors;
   log the printed `LR14 character shadows` line (max textures, slot stats).
2. `E2E_GPU=1` `e2e-desktop` (Epic texture cap on the voxel path, the corrected shot-lamp probe), `e2e-darkness`,
   `e2e-menus` (the new Graphics row).
3. Console smoke at Epic on `?autostart=campusOps` and `?autostart=ctcourse&mode=course`: no errors, `world.charShadows
   .stats()` shows lamps with casters near the player, `copies` rising.
4. Perf (`docs/systems/performance.md`): `perf.mjs --preset=high --budget` and `--preset=epic --budget` with 24 guards
   per section on Sector Ops and campusOps, character shadows Auto against Off (`video.charShadows`): frame time p95,
   draws (<= 600), triangles, allocations (<= 11.5 MB/s), GPU ms of the shadow passes.
5. A look: a contact sheet of a guard and the partner under a lamp at Epic (silhouette) and Medium (capsule); walk
   between two lamps and watch for set flicker.
