status: open (plans only; investigator Opus 5.5, 2026-10-23 ~23:10)

# LR16-P - where the LR16 frame time went, and the cheap fixes

Question (lead, STATE "LR16 perf"): Test Runner measured 273539ec -> f8008542 on the laptop (GPU, 4189 alone, one sample
per cell): CPU p95 Epic start 4.5 -> 5.0, Epic S5 6.4 -> 7.6, Medium start 3.8 -> 4.9, Medium S5 6.3 -> 6.7; GPU p95 Epic
S5 5.01 -> 6.17, Medium start 2.83 -> 3.59, Medium S5 3.66 -> 4.57; draws 177 -> 178. The triage
(`checks/lr16-perf-triage.md`) estimated +0.1-0.3 Epic / +0.3-0.7 Medium. lr16int 4ebcecbd has since added LR16-1
bounce, LR16-5 flicker and LR16t torch shadows. File:line below are at 4ebcecbd unless named.

## Finding 0: the A/B measures the light model switch, not only the LR16 fix round

`273539ec..f8008542` is 36 commits, not the fix round: LR15 (8 door slots, drawn torches), lrpolish, lampx tex3d,
LR16a (one light model), LR16b (24 slots, feathered cone), LR16-7, LR16-3, LR16f, LR16v, LR16d and the fix round. At
273539ec the lamp falloff was a setting, default `'linear'` (`settings.ts:167` there; `?falloff=photo` was the only
other way in) and the shadow-accuracy fixes rode it (`shadowAccuracy.ts` there: `shadowAccuracyOn()` = photometric).
The view harness sets neither, so A ran Classic: linear falloff at the authored radius, 8 slots per column, no drawn
torches, 4 door slots. B runs the photometric model at `PHOTO.reach` 1.6 x the radius (`lampMath.ts:59-63`,
`lights.ts:171`) with every accuracy fix on. Most of the gap is the model Michael chose (~18:12 "focus on only the one
new system"), and the triage's estimate left it out. The perf request below splits model cost from code cost.

Probe (scratch vitest on 4ebcecbd, campusOps built in `LevelBuilder`, 134 baked lamps, bake box 144 x 158 m):

| campusOps | Classic reach (A) | Photometric 1.6x (B) |
| --- | --- | --- |
| 2 m column list: mean / p95 / worst | 2.97 / 7 / 10 | 4.63 / 11 / 16 |
| Lamps within 3D reach per lit point (1 m grid, 2.6 m under the nearest lamp) | 2.45 (7558 lit points) | 4.12 (12693 lit points) |
| The same within 20 m of the start view (24, -78) | 0.35 | 0.98 |
| The same within 20 m of the S5-worst view (-50.25, 62.25) | 0.14 | 0.51 |
| Lamp data texture (RGBA32F), re-uploaded whole every frame | 144 x 91 = 205 KB (grid 178 KB) | 432 x 83 = 560 KB (grid 533 KB) |
| Lamp visibility atlas (R8 3D) | 2036 x 90 x 540 = 99 MB | 2019 x 90 x 1352 = 246 MB |

## Cost breakdown (273539ec -> f8008542; estimates fitted to the measured deltas)

CPU main thread:

| # | Item (commit) | Evidence | Epic | Medium |
| --- | --- | --- | --- | --- |
| C1 | Character-shadow slots work over the 1.6x reach: more lamps qualify for a slot (picker limit = reach + 3 m) and each map draws every caster within the reach (plan area x 2.56), at ~50-75 us per guard drawn. Grows with guards (S5: 24) (LR16a reach on LR14 code) | `bakedLamps.ts:191-192` (spheres w = baked reach), `charShadowSet.ts:254`, `charShadows.ts:330-347` | start +0.1-0.2, S5 +0.4-0.7 | in C2 |
| C2 | Low / Medium gain one slot (512, every 2nd frame): gather, caster draws, copy pass, and `lampCsM` / `lampCsP` in every PBR bind (LR16-7) | `charShadowSet.ts:26-27`, `:102`; `bakedLamps.ts:1079-1085` | 0 | start +0.3-0.6 p95 (about half on the median), S5 +0.2-0.4 |
| C3 | Lamp data texture re-uploaded whole every frame (`capsules` are written every frame): the grid tripled from 2 to 6 texels a column, 205 -> 560 KB a frame of `texImage2D` (LR16b) | `lampBake.ts:703-705`; `bakedLamps.ts:222-233`, `:371-393` | +0.1-0.3 | +0.1-0.3 |
| C4 | Plugin uniform arrays compared per PBR bind (`lampTorch` 48 floats, LR15) and each material's UBO re-sent on a frame a torch or a slot moved | `bakedLamps.ts:1087`; Babylon `UniformBuffer.updateUniformArray` (compare per float, then `bufferSubData` per material) | +0.05-0.1 | +0.05-0.15 |
| C5 | The rest, each tiny: door leaves into slot maps (`addDynamic`, campusOps has no props), body-light rays (1 Hz), trilinear ambient, 24-slot field loop, photometric `contribution` | `charShadows.ts:389`, `enemyManager.ts:835`, `lightField.ts` | < 0.05 | < 0.05 |

Sum: Epic start +0.25-0.6 (measured +0.5), Epic S5 +0.55-1.1 (+1.2 p95, +0.9 median), Medium start +0.45-1.1 (+1.1
p95, +0.6 median), Medium S5 +0.35-0.8 (+0.4). No LR16 path allocates per frame (triage confirmed; still true at
4ebcecbd except `writeFlicker`'s one-time index).

GPU:

| # | Item (commit) | Evidence | Epic S5 | Medium |
| --- | --- | --- | --- | --- |
| G1 | The lamp loop over the 1.6x reach: lamp evaluations per shaded point x2.8 (start) to x3.6 (S5), each ~8 `texelFetch` + one 3D atlas tap + door and capsule tests; lit area +68%; the atlas 2.5x larger (more cache misses) (LR16a; LR16b lists every lamp) | `bakedLamps.ts:1206-1291`; probe above | +0.5-0.8 | +0.4-0.6 |
| G2 | Contact-hardening PCF: 8 search taps on every pixel inside a slot frustum (was 4), 16 more in a penumbra; frustums wider (door spheres in the fit, 1.6x reach) (LR16f, fix round) | `charShadows.ts:107-160`, `charShadowSet.ts:86` | +0.2-0.4 | (C2's slot: 4 + 2 taps) |
| G3 | The Medium slot: a 512 depth map every 2nd frame + its taps (LR16-7) | `charShadowSet.ts:26-27` | 0 | +0.1-0.3 |
| G4 | Feathered cone smoothstep, `LAMP_TORCH` loop (4 slots, early out), `LAMP_DOORS8` fetch, the data texture copy | `lampMath.ts` `LAMP_MATH_GLSL`, `shadowAccuracy.ts` `TORCH_DRAW_GLSL` | +0.05-0.1 | +0.05-0.1 |

Sum: Epic S5 +0.75-1.3 (measured +1.16), Medium +0.55-1.0 (+0.76 start, +0.91 S5). Draws stay flat because the
harness counts the main pass: slot-map and torch-map draws are not in 177 / 178 (ask for all-pass draws, below).

Added on lr16int 4ebcecbd (not measured yet; estimates):

| # | Item | Evidence | CPU | GPU |
| --- | --- | --- | --- | --- |
| N1 | LR16-1 `nsGrid2`: 8 RGBA8 `texelFetch` on the fill texture plus a flood fill over dynamically indexed local arrays (`float v[8]`, `int e[8]`, `bool c[8]`: on NVIDIA these spill to local memory) on every lit pixel | `bakedLamps.ts:785-840`, called at `:1112-1123`, used `:1316-1320` | ~0 (`BounceGrid.sync` is one compare per field query; the fill re-upload only on a lamp change, <= 4 Hz) | +0.15-0.4, every tier |
| N2 | LR16t torch shadow atlas: up to 4 maps (512 at Epic) of the level and characters in each cone, the nearest torch every frame, the rest every 2nd; PCSS 12 + 6 per torch-lit pixel; the rig's 2 shadowed Babylon flashlights are gone | `torchShadows.ts:190-295`, `world.ts:730` | -0.1 to +0.2 (gather over `rig.casters` x 4 slots ~0.05) | +0.1-0.3 with torches in view |
| N3 | LR16-5 flicker: `tickFlicker` per frame (campusOps: one stutter tube); each `flickerVersion` bump repaints every bulb and re-sends the bulb, fixture and each fitting face colour buffer | `lights.ts:262`, `gameState.ts:1515`, `lightRig.ts:418-421`, `:648-674` | < 0.02 average, 0.03-0.08 on bump frames | ~0 |

Budget note: Epic S5 GPU p95 6.17 is inside the 2560 x 1600 120 Hz goal (7.5 ms) but over the 1920 x 1200 165 Hz goal
(5.5 ms, `performance.md`); which resolution the harness ran at is not in the summary. CPU stays under the 5.5 ms Epic
main-thread goal at start (5.0) and over it at S5 (7.6, the guard cost that #226's freeze addresses, per the triage).

## Ranked fixes (each keeps light parity: the field, the meter and the guards read the same numbers as today)

| Rank | Fix | Files, lines | Approach | Saves (est.) | Parity / look | Risk | Shares files with |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | F1 Upload only the dynamic rows of the lamp data texture | `bakedLamps.ts:291` (create), `:329-354` (`update`: keeps the full upload), `:357-394` (`frame`) | Every per-frame write lands at or after `lampBase` (lamp texels t1 / t5 / t7, capsules at `capBase`, door shut flags at `doorBase`, LR16-5 `writeFlicker`, LR16-5b `writeSway` t0). Keep the layout; per frame call `engine.updateTextureData(this.data.getInternalTexture()!, buf.subarray(y0 * w * 4), 0, y0, w, h - y0)` with `y0 = floor(lampBase / w)` (ThinEngine method, `texSubImage2D`, no side-effect import; the texture has `invertY` false). Full `data.update(buf)` stays in the constructor, `update()` and on `onContextRestoredObservable`. The static grid (533 KB on campusOps) is sent once | CPU -0.1-0.3 every tier (560 -> ~27 KB a frame); GPU copy ~-0.03 | Same texels, same GLSL: none | Low | LR16-5b (`bakedLamps.ts` `writeSway` at `frame`): build after 5b merges, or hand 5b the one-line rule "per-frame texels must sit at or after `lampBase`" |
| 2 | F2 A picture-only shadow reach for the character slots | `bakedLamps.ts:191-192` (spheres w), new pure `charShadowReach` in `charShadowSet.ts` (+ `CHAR_SHADOW.minLevel`) | `spheres[i*4+3]` = the distance where `LAMP_LEVEL_GAIN x intensity x photoFalloff(d, reach)` falls to `CHAR_SHADOW.minLevel` 0.04 (load time; intensity is map data, jams and flicker do not change it). The picker limit (`charShadowSet.ts:254`), `gather` (`charShadows.ts:330-347`), `addDynamic` and the far plane (`charShadows.ts` `reach + 0.5`) follow it. Characters between it and the lamp reach keep their capsule (`writeCapsules` still uses t0.w + 0.5, `covers` is false for them) | Plan area per slot -45% (0.55 kept at 0.04; 0.67 at 0.02): CPU -0.2-0.5 Epic S5, -0.1-0.3 Medium; GPU -0.05-0.15 (narrower frustums) | Character shadows are picture-only (`charShadowSet.ts` header; the field has none): no parity effect. Look: in a lamp's faint tail (level < 0.04) a guard's silhouette shadow becomes a capsule | Low-medium (look check on the GPU sheet) | LR16-5b (spheres xyz in `writeSway`, picker `update` `:225`, `refreshEvery` `:301`): after 5b |
| 3 | F3 `nsGrid2` without local arrays (4ebcecbd only) | `bakedLamps.ts:785-840` | Corner values in two `vec4`, wall bits in two `ivec4`, the reach set as an 8-bit int mask; the flood fill as the cube's 12 fixed edges, unrolled bit tests per pass (<= 7 passes, usually 1-2); the renormalised blend unchanged | GPU -0.1-0.25 every tier | Same arithmetic step for step: `tests/bounceGrid.test.ts` (shader vs field) must pass unchanged | Medium (GLSL; GPU read-back) | LR16-1's code; LR16g and LR16-5b must not touch GLSL: own slice after both |
| 4 | F4 Skip unchanged uniform arrays | `bakedLamps.ts:1079-1095`; version counters in `lightRig.ts` (`writeTorchDraw` / `followTorches` `:505`), `charShadows.ts` (`copy`), `torchShadows.ts` | Each array gets a version bumped when a value moves; the plugin keeps the last version and the last `ubo` it wrote and skips `updateFloatArray` when both match (WebGL keeps one `_bufferData` per UBO, so a skipped write keeps the old value) | CPU -0.05-0.1 (the triage's insurance 2, extended to `lampCs*` / `lampTs*`) | None | Medium: a rebuilt UBO (define change) must re-send (key on the `ubo` object) | LR16t (`torchShadows.ts`), LR16-5b (`lightRig.ts`) |
| 5 | F5 Flicker repaints only the flickering fittings | `lightRig.ts:418-421`, `:648-674` | On a `flickerVersion` bump write the colours of `reg.flickering` ids only (a load-time id -> (fitting, index) map), not every bulb | CPU -0.03-0.08 on bump frames (p95 during a stutter burst) | Bulb glow is picture-only and follows the same `flicker`: none | Low | LR16-5b (`paintBulbs`): after 5b |
| 6 | F6 Epic slot taps 16 -> 12 (search 8 -> 6) | `charShadowSet.ts:86` | Ultra's count on Epic | GPU -0.05-0.15 Epic | Picture-only; penumbra slightly noisier | Low | none |

Not cheap, Michael's call (G1 is the model itself): the lamp loop cannot shrink without changing the light numbers.
Options if the GPU sheet wants it: (a) a level floor applied by the field and the shader alike (a lamp's term counts
from its own cut, `eps` 0.01 = ~0.92 x reach median): exact parity, -0.1-0.15 GPU, but every map-light test re-measures
(LR16g); (b) `PHOTO.reach` 1.6 -> 1.4: -23% plan area, a rebake and a full re-level. Recommend neither now.

Also rejected: `CHAR_SHADOW_EVERY` low / medium 2 -> 3 (triage insurance 1): p95 still lands on the refresh frames;
F2 cuts the work per refresh instead.

## Unit tests (Babylon-free where possible; NullEngine for the plugin and the texture)

- F1 `tests/lampDataUpload.test.ts`: (a) a pure `lampDataRows(lampBase, width, height)` returns `y0`, `rows`; (b) a small
  NullEngine `BakedLamps` (or the `Object.create` pattern of `tests/lampPluginGap.test.ts`): snapshot `buf`, move a
  capsule, shut a door, bump a flicker, run `frame()`; every changed index is >= `y0 * w * 4`; (c) spy
  `engine.updateTextureData`: `frame()` sends `(0, y0, w, h - y0)` with `buf.subarray(y0 * w * 4)`; a registry version
  change sends one full `update`; (d) campusOps layout: the per-frame bytes are <= 64 KB.
- F2 `tests/charShadowReach.test.ts`: `charShadowReach` <= reach; the level at it equals `minLevel` (1e-3); monotonic in
  intensity; 0 when the lamp never reaches `minLevel`; `LampSlotPicker` with the shadow spheres skips a lamp whose shadow
  reach + margin misses the focus; a character past the shadow reach keeps its capsule (`spheresHold` false).
  `tests/lightField.test.ts` and `tests/lampFalloff.test.ts` pass unchanged (the field never reads `spheres`).
- F3: `tests/bounceGrid.test.ts` unchanged and green; a guard test that `NS_GRID2_GLSL` declares no local arrays
  (`/\b(float|int|bool)\s+\w+\[8\]/` absent).
- F4: NullEngine: a second bind with unchanged versions writes no array; a new `ubo` object writes all of them.
- F5: one bump changes only the flickering ids' entries in the colour buffers; `tests/lampFlicker.test.ts` green.

## Laptop perf request (Test Runner; GPU, 4189 alone; the campusOps view harness)

Views: campusOps start and S5-worst (-50.25, 3.0, 62.25) facing 158, 24 guards; Epic and Medium; 3 samples per cell
(one sample is noisy at +-0.3 ms). Record per cell: CPU p95 / median, GPU p95, the page URL (falloff), the render
size, draws over all passes (`engine._drawCalls` per frame, slot and torch maps included), and the slot casters
(`world.charShadows` slots' `list.length`, `world.torchShadows.stats()`).

| Run | sha | URL | Splits out |
| --- | --- | --- | --- |
| A0 | 273539ec0e6193d8b35c3cf1e16d795fddb6116b | default (Classic) | have it; rerun for 3 samples |
| A1 | 1c22b9136cfc768490e228b617217c17f57cb934 (lampx tex3d PASS, before LR16a) | default (Classic) | LR15 / lrpolish / lampx code under Classic |
| A2 | 1c22b913... | `&falloff=photo` | A1 -> A2 = the photometric model + accuracy fixes (G1, C1). Its grid still caps at 8 lamps a column (campusOps worst 16), so it reads a little low |
| B | f8008542dec825b9890397cacfa2d078fbcabe94 | default | A2 -> B = LR16b / f / 7 / 3 / fix code (C2-C4, G2-G4) |
| C | 4ebcecbd502dadd6d6507a006c63ccd8d2493cb4 | default | B -> C = LR16-1 / 5 / t (N1-N3) |
| D | lr16int + F1 + F2 (+ F3 when built) | default | C -> D = the fixes |

273539ec cannot run `&falloff=photo` on campusOps: before lampx tex3d its photometric atlas passed the 3D texture
size and every lamp read 0 (`checks/lr-tex3d-fix.md`), hence A1 / A2 at 1c22b913.

Expected: A1 -> A2 holds most of the GPU gap (+0.5-0.8 Epic S5) and C1; A2 -> B holds C2-C4 and G2; D recovers about
0.3-0.8 ms CPU p95 (Epic S5) and 0.2-0.4 ms Medium, with GPU about -0.1-0.4 (F3 counts only from C on).
