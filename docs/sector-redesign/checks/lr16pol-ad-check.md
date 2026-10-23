# LR16-POLISH parts A + D check

Fresh checker, 2026-10-23. Brief `briefs/LR16-POLISH.md` ("Rules for every part", "Part A", "Part D"; lampBounce bake-time item moved to part F).

## Verdicts
| Part | Branch @ sha | Verdict |
| --- | --- | --- |
| A | `feature/sector-redesign-lr16pol-a` @ 36547c1e (base lr16int 82f9e1bb) | **PASS** |
| D | `feature/sector-redesign-lr16pol-d` @ 477a3390 (base artpol b5e93548) | **PASS** |

No must-fix.

## Part A
Run in a detached worktree at 36547c1e: `npx tsc --noEmit` clean (tests included); vitest `--maxWorkers=2` (slot lock) flickerGlare, lampAudit, nightVision, lampFlicker: 4 files, 57 / 57 pass; `node --check` on `e2e-darkness.mjs` and `e2e-desktop.mjs` ok. No e2e (laptop: `e2e-darkness`, `e2e-desktop:3`). `lamp-audit.mjs` not re-run (builder's run: warehouse 0 flagged, warehouseOps 1 flagged, same as the committed table).

Item by item:
- A1 `nightVision.ts:196,204`, `nightAutoGain.ts:72`: `pickGlare` skips `flicker <= 0`, scores `min(1.5, intensity * flicker)`; target is `glareTarget(blocked, l.flicker)`. Skipped lamps keep target 0 (`t.fill(0)` at :64), so `easeGlare` still fades them. OK.
- A2 `rtReflections.ts:374-376`: each `lCol` channel `* l.flicker`. OK.
- A4 `e2e-darkness.mjs:31-34`: sets `reg.lights[id].flicker = 1` for `w.level.lights.flickering` in the same synchronous evaluate before the search; does not call `setFlicker`. `flickering` is a public getter of ids into `lights` (`lights.ts:245`). OK.
- R3 `e2e-desktop.mjs:584,589`: `stats` added to the evaluate return, printed only in the `copies > 0` message. OK.
- check 4 `lightView.ts:671`: `bounce: c.field.bounce`. OK.
- dx 2 `lampAudit.ts:604-620`: plan extents turned by yaw, then the `FIT_GAP` test. Yaw 0 reduces to the old formula. OK.
- check 7 (bake-time): not touched, per the lead's change. OK.

**Light parity: holds.** All three consumers read the registry's own `LightDef` array and the same field the meter and guards use:
- Meter / guards: `contribution` (`lights.ts:105`), `lightField.ts:335,405` = `LAMP_LEVEL_GAIN * intensity * flicker * term`; `volLights.ts:52` = `intensity * flicker`.
- NV glare / auto-gain: `NightAutoGain` is built with `world.level.lights.lights` (`gameState.ts:544`), so `l.flicker` is the registry value `tickFlicker` writes (`lights.ts:289`).
- RT reflections: `reg.lights` (`rtReflections.ts:340`), same `l.flicker`.
So a tube at 0 reads 0 in meter, guards, haze, glare and reflections, and 0.5 reads 0.5 in all. The RT candidate pick (`:341-352`) still ranks by distance only, so a dropped-out tube can hold one of the `RT_LIGHTS` slots at colour 0: harmless, on the polish list.

Builder assumptions:
1. `GlareLamp.flicker` required + `tests/nightVision.test.ts` lamp helper edited: accept. The real `LightDef` already has `flicker`, so the only other `GlareLamp` producer is the registry; the one-token edit keeps tsc green and is the minimal fix. No other test builds a `GlareLamp`.
2. Crowds yaw test with a 1.4 m neighbour: accept. Inside `SPACING` (1.0 m) a lamp always crowds on the centre test, so the brief's 0.5 m example could not show the yaw effect; the 1.4 / 0.1 cases do (yaw 0 and PI/2, both directions).
3. One commit for all items: accept (small, file-disjoint, build report separate).
Also fine: `glareTarget` extracted as the pure rule because no `NightAutoGain` test exists (needs a scene); `crowds` turns both fittings by their own yaw (brief said the foot owner's; both have a foot).

## Part D
- `git diff b5e93548 477a3390`: 6 files. Code: only `src/ai/enemyGunMerge.ts`, header comment lines (` * `) inside the existing block, `*/` intact; no non-comment change. Rest are `TESTING.md`, `world-and-characters.md`, `changes/feature-sector-redesign-artnext.md`, `perfg-build.md`, the new `lr16pol-d-build.md`. The b5e93548 laptop verdict stays valid.
- Numbers match `checks/artnext-build.md` at b5e93548 (artCounts "After lane B"): draws 35 + 33 + 27 + 19 + 29 = **143**; triangles 13104 + 51428 + 16016 + 79532 + 25452 = **185,532** (186 k); placements 76 + 780 + 189 + 632 + 253 = **1930**. The brief's 1921 is lane A's dump (S2 777, S5 247); the builder's 1930 is right and the deviation is recorded in the build report.
- artnext 1 `TESTING.md:477-481`: dropped lockers / vault frame / monitor wall, kept S2 green wall and S5 kitchen run (both built), "S1 35, S2 33 of 40". Matches lane B's Done / Dropped table. OK.
- artnext 2 `world-and-characters.md:118-119`: per-section draws, 143 / 186 k / 1930, "Not built yet" bullet removed. OK.
- artnext 3 `changes/...artnext.md:10`: as the brief. OK.
- perf 4 `enemyGunMerge.ts:12-15` and `perfg-build.md:19-22`: `partMat` at `partLibrary.ts:103` (`make('partMat')`) and `:115` (`mesh.material = m`), `partSkinMat` at `:107` with the voxel / smooth plugins at `:108,111`. Claim is true and states the look claim rests on the GPU shot. OK.
- Stale-number grep (`39 of 40`, `1852`, `162 draws`, `183 k`): the only hit is `perfa-build.md:7`, a dated historical report. Leave.

## Polish list (nothing blocks)
1. `world-and-characters.md:119`: the budget bullet's last sentence ("Perf budgets: ... shots: ...") was joined onto the long "Now" line; wrap it.
2. `rtReflections.ts:341-352`: skip `flicker <= 0` lights in the nearest-light pick so a drop-out tube does not take one of the `RT_LIGHTS` slots.
3. `nightAutoGain.ts:84`: `abcWeight(dist, l.intensity)` ignores flicker; harmless (the eased weight `wt` already follows it), only if the veil should dip with a stutter.
4. `lampAudit.ts` `crowds`: wall fittings now turn by yaw too (the old test used the authored axes for all); warehouseOps flags unchanged per the builder, re-run `lamp-audit.mjs --no-views` on the merged sha.
5. Laptop on the merged sha (as briefed): `e2e-darkness` (probes in a drop-out burst), `e2e-desktop:3` (`copies > 0` now prints `stats` on a flake).
