status: open

# LR16-POLISH - one polish batch for the LR16 / #226 open lists

Planner: Opus 5.5, 2026-10-23. Plans only. Source: STATE.md resume block "Polish:" line (lr15-check 1/2/4, lrpolish 1-6,
art P6, perf 3-7, lr16dx 2-7, lr16t, lr16-1 except item 3 (LR16-L's), lr16e, lr16-5 A 1-8 / B 1-6, artnext 1-9) plus the
older S4 / S5 / E8 / E9 lists. Each item was checked in the code at lr16int `4ebcecbd` (artnext / art / perf items at
artpol `b5e93548`; S4 / S5 / E8 / E9 at origin/master `33fff449`). CLAUDE.md "Current goal" holds: the build parts fix
wrong behaviour, a light-parity or perf leak, a CI flake or a stale doc; pure looks stay held.

Counts: 74 items on the named lists. **25 to build** (6 parts), **30 held** (open, not built: cosmetic, a GPU look first,
or "fix if seen"), **19 dropped** (fixed, obsolete, or another slice's). Older S4 / S5 / E8 / E9 lists: **0 open** on
master.

## Rules for every part
- Preamble: `docs/systems/agent-preamble.md`. Worktree `C:/NightShift/Mobile-Coop-sector-redesign-lr16pol-<x>` with a
  node_modules junction; push WIP per step; report `docs/sector-redesign/checks/lr16pol-<x>-build.md`.
- Line numbers are at the base sha. Re-read before editing; parts E and F start on a later lr16int head, so find the
  anchors by name.
- Never touch the files of the running agents: LR16g (`src/world/maps/*`, `src/voxel/lampBounce.ts`,
  `src/voxel/lampJobs.ts`, the map-light tests), LR16-5b (`lampSway.ts`, `lights.ts`, `lightField.ts`, `bakedLamps.ts`,
  `world.ts`, `charShadows.ts`, `charShadowSet.ts`, `lightRig.ts`, `src/net/protocol.ts`, plus `gameState.ts`,
  `coopClient.ts`, `coopHost.ts`, `lampSync.ts`, `volLights.ts` in its diff), LR16-L (Low-preset lamp / fill shaders:
  treat `bakedLamps.ts` and the standard level material path `levelBuilder.ts:579-584` as its until
  `briefs/LR16-L.md` names its files), #226 (`src/world/campusArt/*`, `campusDress.ts`, `campusS*Dress.ts`, and the
  train-entry merge files `src/ai/enemy.ts`, `animFrozen.ts`, `animTier.ts`, `sectorGuardFreezeView.ts`).
- No wire change, no `PROTOCOL_VERSION` change, no save change in any part. `hyp2` / `hyp3`, never `Math.hypot`; no
  per-frame allocation.
- Vitest `--maxWorkers=2` under an `sr-slot-{1..4}.lock`; no e2e on the desktop (laptop queue, `E2E_GPU=1`).

## Parts and order

| Part | Branch | Base | Model | Earliest start | Items |
| --- | --- | --- | --- | --- | --- |
| A | `feature/sector-redesign-lr16pol-a` | lr16int `4ebcecbd` | Sonnet | **now** | 7 |
| B | `feature/sector-redesign-lr16pol-b` | lr16int `4ebcecbd` | Opus | **now** (read LR16-L's brief before merging) | 5 |
| C | `feature/sector-redesign-lr16pol-c` | lr16int `4ebcecbd` | Opus | **now** | 1 |
| D | `feature/sector-redesign-lr16pol-d` | artpol `b5e93548` | Sonnet | **now** (merges into -artpol, rides #226) | 4 |
| E | `feature/sector-redesign-lr16pol-e` | lr16int after the LR16-5b merge | Opus | after LR16-5b is merged into lr16int | 5 |
| F | `feature/sector-redesign-lr16pol-f` | lr16int after the LR16g merge and part A | Opus | after LR16g is merged into lr16int (and A, both edit `tests/lampBounce.test.ts`) | 3 |

Recommended order: start A, B, C and D at once (file-disjoint from each other and from every running agent). E when
LR16-5b lands, F when LR16g lands. Integration branch `feature/sector-redesign-lr16pol` off lr16int: merge A / B / C after
their checker, then E / F; merge it into lr16int before the LR16 PR opens, so the batch rides that one PR. D goes into
-artpol (docs and one comment: the b5e93548 laptop verdict stays valid) with the lead's OK, else into the #226 train-entry
merge commit.

Checkers (one per batch): Sonnet for A + D; Opus for B + C; Opus for E + F. E's `src/net` change is comments only, so
no second net checker. Laptop requests on the merged sha: A -> `e2e-darkness`, `e2e-desktop:3`; B -> `e2e-desktop:3`,
`e2e-lightbake`, look shots (below); C -> campus first-load tab memory (Test Runner); F -> `e2e-lightbake`.

---

## Part A - small fixes in free files (Sonnet, start now)

Files (only these): `src/vfx/nightVision.ts`, `src/vfx/nightAutoGain.ts`, `src/vfx/rtReflections.ts`,
`scripts/e2e-darkness.mjs`, `scripts/e2e-desktop.mjs`, `src/editor/lightView.ts`, `src/world/lampAudit.ts`,
`tests/lampAudit.test.ts`, `tests/lampBounce.test.ts` (the bake-time case only), NEW `tests/flickerGlare.test.ts`.

| Item | Change |
| --- | --- |
| lr16-5 A1 (NV glare and auto-gain ignore flicker) | `nightVision.ts:179` `pickGlare`: skip a lamp with `l.flicker <= 0` (add to the `continue` at :194); score `Math.min(1.5, l.intensity * l.flicker)` at :202. `nightAutoGain.ts:72`: target `... ? 0 : l.flicker` instead of `... ? 0 : 1`. A tube in a drop-out loses its glare; the weight still eases (`easeGlare`). |
| lr16-5 A2 (RT reflections keep the tube lit) | `rtReflections.ts:374-376`: each `lCol` channel `* l.flicker`. |
| lr16-5 A4 (e2e-darkness picks probes during a burst) | `e2e-darkness.mjs` `findProbes` (:26): inside the same synchronous `page.evaluate` that reads `f.levelAt`, before the search loops, set `l.flicker = 1` for every id in the registry's `flickering` list (the next fixed step's `tickFlicker` restores it). Do NOT call `setFlicker(id, 0)`: it drops the light from `flickering`, so the renderers stop rewriting its texel and it can stay at a drop-out value. Find the registry handle the script already uses to reach the field `f`. |
| lr16t recheck R3 (e2e part 3 `copies > 0` gives no detail on a flake) | `e2e-desktop.mjs:581-589`: add `stats: w.torchShadows?.stats?.() ?? null` to the evaluate's return and append `JSON.stringify(ts.stats)` to the `copies > 0` assert message only. |
| lr16-1 check 7 (bake-time ratio can flake under load) | `tests/lampBounce.test.ts:175-188`: keep the `console.info` line; change the assert to `expect(ms.bounce).toBeLessThanOrEqual(0.5 * ms.vis)` (a regression bound at 2x the 0.25 budget; the budget stays a logged number) and say so in the test name. |
| lr16-1 check 4 (Kestrel light view: field has the bounce, picture does not) | `src/editor/lightView.ts:671`: add `bounce: c.field.bounce` to the `BakedLamps` extras object. |
| lr16dx 2 (audit `crowds` ignores fixture yaw) | `lampAudit.ts:604-610` `crowds`: use each fitting's plan extents turned by its yaw: `ex = abs(cos y) * sx + abs(sin y) * sz`, `ez = abs(sin y) * sx + abs(cos y) * sz` (`y = foot owner's yaw ?? 0`), then the same `FIT_GAP` test. |

Acceptance
1. `npx tsc --noEmit` clean; `npm run lint` on the changed files clean.
2. NEW `tests/flickerGlare.test.ts`: `pickGlare` skips a lamp at `flicker` 0 and ranks a lamp at 0.5 below the same lamp
   at 1; an `NightAutoGain` target (or its pure target rule, if extracted) is 0 at flicker 0, 0.5 at 0.5, 0 when blocked.
3. `tests/lampAudit.test.ts`: a 1.2 x 0.2 strip at yaw PI/2 crowds a lamp 0.5 m away along z, not along x (and the
   reverse at yaw 0). `node scripts/lamp-audit.mjs --map=warehouse,warehouseOps --no-views`: the same flags as before
   (strips are yaw 0 today).
4. `node --check` on both e2e scripts.
5. Vitest: flickerGlare, lampAudit, nightVision / nightAutoGain tests (grep `tests/` for `pickGlare`, `NightAutoGain`),
   lampFlicker, lampBounce (the bake-time case, 300 s).
6. Laptop: `e2e-darkness`, `e2e-desktop:3` on the merged sha.

---

## Part B - torch picture: shadows atlas and torch-lit receivers (Opus, start now)

Files (only these): `src/world/torchShadows.ts`, `src/world/torchShadowSet.ts`, `tests/torchShadowSet.test.ts`,
`src/world/levelBuilder.ts` (the fence material block :445-451 only), `src/world/ropes.ts`, `src/game/ropeLine.ts`,
`src/vfx/vfx.ts` (`decalMat` :77 only), new tests as needed. Before merging, read `briefs/LR16-L.md`: if it claims any of
these files, the lead sequences.

| Item | Change |
| --- | --- |
| lr16t check A 6 (atlas built on maps with no torch) | `TorchShadows` constructor: when the registry holds no `kind === 'flashlight'` light (`addTorchSlots` runs first, `world.ts:188`, and only dark maps get slots), build no generators, targets or atlas; `on` stays false, so `LAMP_TSHADOW` is off and the lit shaders lose the extra sampler. Do it inside `torchShadows.ts`; if that turns out impossible without `world.ts`, stop and move the item to part E. |
| lr16t check A 5 (`holdsTorch` drops every character near the torch) | `torchShadows.ts:292` / `torchShadowSet.ts:124`: drop only the holder. Without touching `src/ai`: per slot, skip only the character whose bounding-sphere centre is nearest the torch (and within `r + 0.3`, as now); a second guard or the player beside him casts again. Pure helper in `torchShadowSet.ts`, tested with two characters shoulder to shoulder. |
| lr16t recheck 1 (forced renders ignore the governor) | `torchShadows.ts:276`: when `governorEvery > 1`, a slot whose pose only turned (within the move threshold) is not forced; a moved, invalid (`params !== 1`) or new slot is still forced. At governor 1 nothing changes. Split `torchPoseStale` into turn and move parts (`torchShadowSet.ts:220`), unit-tested. The shader rule that a stale map reads 0 off its frustum (`torchShadowSet.ts:264`) is unchanged, so a turned beam can only show a dark rim, never light through a wall. |
| lr15-check 1 + lr16t check A 7 (fences, ropes, rope line and bullet decals get no torch light) | Move these four materials to `PBRMaterial` where the level material is PBR (follow `levelBuilder.ts`'s own `opts.atlas` switch, settings as `:563-575`: metallic 0, roughness 1, `usePhysicalLightFalloff` false, `directIntensity` PI, authored sRGB colours linearised; keep alpha, back-face and freeze; no `markLampLevel`). Keep `StandardMaterial` on the standard / `?gfx=min` path. Then update the `torchShadows.ts` header: which receivers still get no torch light (editor, menu, flat standard materials). |

Acceptance
1. `npx tsc --noEmit` clean.
2. Vitest: torchShadowSet, torchOcclusion, shadowAccuracy, lampTorchCone, coopTorches, lightField, lampPluginClone,
   lampPluginGap, plus the new cases (bright registry -> `on` false and 0 slots; holder-only drop; turn vs move pose split
   and the governor rule as a pure function).
3. No gameplay file changed: the meter and guards read the field, which no item here touches.
4. Laptop: `e2e-desktop:3` (warehouse is dark: atlas on, `copies > 0`), `e2e-lightbake` (every shader <= 16 textures),
   and look shots: a guard torch on a fence, a rope and a bullet decal (lit like the floor beside it, no PI jump); the
   same fence under a baked lamp looks as before; a bright map's texture count is one lower.

---

## Part C - penumbra bake scratch memory (Opus, start now)

Files: `src/voxel/lampBake.ts` (`PenumbraBuffers` :405-440 and its readers :254-299, the box sums and filter after
:450), `tests/lampBake.test.ts`.

| Item | Change |
| --- | --- |
| lr16e 1 (21 B per cell of the largest lamp box per worker: campusOps 3.35 M cells = 70 MB x 12-16 workers on the first campus load) | Cut the scratch: size the box sums and the filter to the edge cells' bounding box +- 2 x the search reach (the builder's own open item), and / or share views so the five Float32 arrays are not all live per cell. The baked bytes must not change. |

Acceptance
1. Bytes identical: a test hashes `bakeLamps` output on the lampBake fixture and on ctcourse; the expected hashes are
   taken from lr16int `4ebcecbd` before the change. No `LAMP_VERSION` change (LR16g owns `lampJobs.ts`; identical bytes need
   none).
2. Report the largest-lamp scratch per worker on ctcourse, warehouseOps and campusOps, before and after (target <= 1/3).
3. The bake-time case (`lampBake.test.ts:283`, paired ratio) still passes; vitest lampBake, lampBounce, lightField,
   lampGridLossless.
4. Test Runner: campus first load, tab memory during the bake, before vs after.

---

## Part D - #226 docs and the gun-merge comment (Sonnet, start now, off artpol)

Base artpol `b5e93548`. Files: `TESTING.md`, `docs/systems/world-and-characters.md`,
`changes/feature-sector-redesign-artnext.md`, `src/ai/enemyGunMerge.ts` (header comment :7-15 only),
`docs/sector-redesign/checks/perfg-build.md` (the same sentence). Read `checks/artnext-build.md` for the current numbers.

| Item | Change |
| --- | --- |
| artnext 1 | `TESTING.md:477-480`: drop the pieces that were dropped (S3 lockers, S5 vault frame, monitor wall) from the "No greybox showing" line; "S1 and S2 at 39 of 40" -> "S1 35, S2 33 of 40". |
| artnext 2 | `world-and-characters.md:119-121`: budget line -> S1 35 / S2 33 / S3 27 / S4 19 / S5 29 draws, 1921 placements (re-take the campus draw / triangle totals from the artnext report, or drop them); delete the "Not built yet" lane B sentence. |
| artnext 3 | `changes/feature-sector-redesign-artnext.md:10`: "Freeze polish C4-C6 (C1-C3 were already on the base; C7-C9 at the master merge)." |
| perf 4 | `enemyGunMerge.ts` header: the gun parts drew with `partMat` (`partLibrary.ts:103,115`); the merged gun moves them to `partSkinMat` (the same `make()` settings plus the voxel / smooth plugins), as the merged body; the no-look-change claim rests on the GPU look shot. Same fix in `perfg-build.md`. |

Acceptance: docs and one comment only; `npx tsc --noEmit` clean; nothing else changed.

---

## Part E - after LR16-5b: rig bulbs, flicker clock wording, character-shadow tests (Opus)

Base: lr16int after the LR16-5b merge. Before starting, read `briefs/LR16-L.md` and confirm it claims neither
`lightRig.ts` nor `charShadows.ts`. Files: `src/world/lightRig.ts` (`paintBulbs`), `src/world/lights.ts` (the
`tickFlicker` comment only), `src/net/coopClient.ts` (the `simTime` comment only, lr16int :492-494), `src/world/charShadows.ts`
(`copy()` comment, export `COPY_GLSL`), new tests.

| Item | Change |
| --- | --- |
| lr16-5 A5 (`paintBulbs` repaints every bulb on each flicker move; every frame on refinery) | On a `flickerVersion`-only move, write only the flickering lamps' bulb texels (as `BakedLamps.writeFlicker` does), indexed loop, no `for...of`; the full repaint stays on `version`. Keep LR16-5b's sway pendant bulb path. |
| lr16-5 A6 + B1 (comments overclaim the clock) | `lights.ts` `tickFlicker` and `coopClient.ts` `simTime`: "the client trails the host by its one-way latency, as every host state; snapping to the step absorbs jitter only". Comments only. |
| lrpolish 4 (`copy()` relies on skipped observers doing nothing) | `charShadows.ts` `copy()` (lr16int :453): say what is skipped (`setFloat2('scale')` feeds only `vUV`, which `COPY_GLSL` never reads: it reads `gl_FragCoord`; `bind()` is a no-op here). Export `COPY_GLSL`; a test asserts it holds no `vUV`. |
| lrpolish 5 (no test drives `CharShadows.covers`) | NullEngine test with a fake slot (`spReady`, `kReady`, `ready`, the lamp): a capsule midpoint inside a fitted sphere -> as today; outside every fitted sphere -> false; `kReady` 0 -> false. |

Acceptance: `npx tsc --noEmit` clean; vitest lampFlicker, lights, charShadowSet, coopTorches, net, sectorLampSync and the
new tests; an allocation test for the bulb write (no allocation per flicker move); a count test: one flicker move writes
only the flickering fittings' texels.

---

## Part F - after LR16g: bounce face-glow strips, cache-key note, S3 dead lamp (Opus)

Base: lr16int after the LR16g merge and part A. Files: `src/voxel/lampBounce.ts` (`bounceBits`, lr16int :138-214; the
constants comment :24-30), `src/voxel/lampJobs.ts` (`LAMP_VERSION`), `src/world/maps/warehouseS3.ts` (:129, one dead
lamp), `tests/lampBounce.test.ts`, `tests/warehouseLamps.test.ts` if it pins that lamp.

| Item | Change |
| --- | --- |
| lr16-1 recheck 1 (face-glow strips the per-axis codes miss: thin walls, a crate's hull with a wall in the same half cell) | In `bounceBits`, set a crossing code only when the segment from the run's end to the neighbour's centre is clear; a second solid run gives code 0, so the point keeps its home. Rotated walls stay out of scope (none on the maps). The read (`bounceGrid.ts`, `nsGrid2`) is unchanged. `LAMP_VERSION` + 1 over LR16g's value. |
| lr16-1 recheck 4 | The `BOUNCE` comment (:24-30): retuning `BOUNCE_SUB`, `BOUNCE_T_STEP`, `BOUNCE_T_FAR` or `BOUNCE_T_SHIFT` also bumps `LAMP_VERSION`. |
| lr16dx 4 (S3 hall row ends 1.05 m off its column) | `warehouseS3.ts:129`: the dead lamp `[23.2, -2.6, 6.5, 0]` -> `[22.15, -2.6, 6.5, 0]` (in line with 87 / 93 / 103). Intensity 0: no light changes. Leave lit lamp 80 where it is. |

Acceptance
1. `npx tsc --noEmit` clean.
2. `tests/lampBounce.test.ts`: the recheck's cases: a 0.1 m wall at x 10.54 and 10.58 -> bounce <= 0.03 at 0.05-0.15 m
   behind; a 0.2 m gap between a box and a wall with a lit room past the wall -> the gap reads <= 0.03 from that room.
   Every existing case passes (lit side not lower than before by more than 10%).
3. Real maps: re-measure the recheck's points (warehouseOps (0.2, 1.5, 11.65-11.85), campusOps (-30.2, 1.0, -46.65)) and the
   cross-wall share table; report before / after. Parity: field vs the GLSL port (`tests/helpers/bounceRead.ts`) still
   2e-16. Bake time +5% at most.
4. The four map-light test files: no new red over LR16g's final numbers (report any; do not retune levels, that is
   LR16g's). `node scripts/lamp-audit.mjs --map=warehouseOps --no-views`: no new flag; `warehouseLamps` passes.
5. Laptop: `e2e-lightbake`.

---

## Dropped (19)

| Item | Why |
| --- | --- |
| lr15-check 4 (drawn torch has no closed-door test) | Fixed by LR16t: `nsTorchDoors` (`torchShadowSet.ts:299`, called `shadowAccuracy.ts:182`). |
| lrpolish 1 (resumed host pinned to the record's falloff) | Obsolete: LR16 removed the falloff setting and `start.lf` (315a2805); no `lf` code left. |
| lrpolish 6 (`setShadowAccuracy(false)` left behind in a test) | Obsolete: the toggle is gone; `shadowAccuracy.test.ts:22` asserts it is not exported. |
| art P6 (two S5 hall portraits at y 1.93) | Fixed by artnext B8 (`campusS5Dress.ts:182-193` at b5e93548: removed and re-hung at the hall floor). |
| perf 3 (animFrozen vs master's animTier at the merge) | The lead's #226 train-entry merge step (STATE resume block, with perf polish 1-2). |
| perf 6 (`?guardmerge=0` cannot isolate the gun) | The checker's own alternative suffices: the 1d34c348 numbers isolate it. |
| lr16dx 3 (S3 east bay pocket, lamp 87) | LR16g's (its brief: lamp 87 down for the east bay pocket). |
| lr16t check A 1, A 2 (stale map lit off its frustum; slot change waits) | Fixed in the LR16t fix round (recheck: A1 and polish A2 closed). |
| lr16t check B "camera skip uses last frame's planes" | Fixed in the same round: an out-of-view slot whose pose moved goes to w 0 (`torchShadows.ts:250-253`). |
| lr16t check B "`torchOcclusion.test.ts` uses Math.hypot" | Already gone at 4ebcecbd (no `Math.hypot` in the file). |
| lr16-1 recheck 2 (lit faces near zero at some in-cell positions) | LR16g's call (the checker says so). |
| lr16-1 recheck 5 (doorway fill faint) | A note for LR16g's sheets, not a code item. |
| lr16-1 check 6 (omni receiver lifts floors by a pool) | LR16g's call (its brief cites it as the S1 lift cause). |
| lr16e 4 (side tap weak for w 0.10-0.15 m) | Checker: acceptable now (physical edge under a cell). |
| lr16-5 A 7 (meter samples at 10 Hz, picture chatters at 18 Hz) | The existing sampling contract; same value at each sample. |
| lr16-5 B 3 (`snap.time` post-increment) | Checker: trivial, not worth a change. |
| lr16-5 B 6 (`simTime?.()` may box a number per step) | Negligible, inside the measured budget. |
| artnext 8 (C4 test drives the rig, not the frozen tier) | C7 is in the #226 train-entry merge (STATE). |

## Held (30) - open, not built in this batch

| Item | Why held / trigger to build |
| --- | --- |
| lr15-check 2 (drawn torches have no specular) | Cosmetic shader work in the torch term; after LR16-L, if Michael asks. |
| lrpolish 2, 3 (a neighbour's sphere hides a capsule for one gap; past `MAX_SPHERES` double shadow) | "Fix if seen": dense crowds only; build if a GPU sheet shows it. |
| perf 5 (gun pattern scale read once) | Nothing scales a guard rig later; cosmetic. |
| perf 7 (18 disabled gun parts stay in the scene) | Only if a profile shows the mesh count. |
| lr16dx 5, 6 (warehouse strips at z 3 vs 3.8; floating gatehouse door lamp) | The parked legacy map `warehouse` (`?legacy=1`); 6 also moves a lit lamp (re-level). |
| lr16dx 7 (plant deck / void panel columns uneven) | Checker: harmless; moving lit lamps re-levels light. |
| lr16t check A 3, 4, 8; check B invisible static blocker, `rayOccluder` 0.25 m short; recheck 2 | GPU look items or notes (wall-base band, thin panel near the torch, window body, beam rim); build only if the sheets show one. |
| lr16t check B `world.ts` double `configure` | Harmless (quality change only); `world.ts` is LR16-5b's. |
| lr16-1 check 1 (Epic `?voxels=1` double bounce) | Non-default path; shader work after LR16-L. |
| lr16-1 check 2 (uplight march start under a slab) | Not seen on any shipped map; changes the bake bytes. |
| lr16-1 check 5 (sub-box bounce upload) | The 0.25 s picture lag is an accepted parity exception; needs raw `texSubImage3D`. |
| lr16e 2, 3 (strip blocker bias; blocker mean not path-aware) | Penumbra width only, never light; changes bake bytes. Fold into the next `LAMP_VERSION` bump if one is wanted. |
| lr16-5 A 3 (voxel GI keeps the tube's fill) | GPU look first (the checker asks for the laptop look). |
| lr16-5 A 8 (Kestrel `volume` mode does not re-mix on flicker) | Editor only; Kestrel paused. |
| lr16-5 B 2, 4, 5 (host stall offset, client before first snapshot, repeated value per frame) | Cosmetic; B4 is a `src/net` code change (two checkers) for one RTT. |
| artnext 4 (dresser refusal allocates at load) | Only if GPU item 4 shows a campus load regression. |
| artnext 5 (S5 portrait filter by literal z) | No defect now; campus dress files are #226's. |
| artnext 6, 7, 9 (frame code dead; S4 floor tiles z-fight check; lead options) | Dead until a `frame` piece; a GPU shot; features. |

## Older lists (S4 / S5 / E8 / E9): none open on master
S4 polish 1-5, S5 polish 1-5, E9 P1-P4, E8 P5-P7: done or skipped by triage in `checks/polish-batch.md` (items 1-21),
E9 P1 by `checks/crate-client-fix.md` (`coopClient.ts` sets `progress = 0`), S4 5 / S5 5 at the s45 join (J3),
S5 3 (`S5_CAMERA_FLAGS`) gone at the E8 join.
