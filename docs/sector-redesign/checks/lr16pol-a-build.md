# LR16-POLISH part A - build report

Branch `feature/sector-redesign-lr16pol-a`, base lr16int `82f9e1bb` (the brief's `4ebcecbd` plus LR16-5b sway). Code commit `005d9afb`.

## Done
| Item | Where |
| --- | --- |
| lr16-5 A1 NV glare and auto-gain follow flicker | `src/vfx/nightVision.ts`: `GlareLamp.flicker`, `pickGlare` skips `flicker <= 0` and scores `intensity * flicker`; new pure `glareTarget(blocked, flicker)`; `src/vfx/nightAutoGain.ts` target uses it (0 blocked, else `l.flicker`) |
| lr16-5 A2 RT reflections keep the tube lit | `src/vfx/rtReflections.ts` `frame()`: each `lCol` channel `* l.flicker` |
| lr16-5 A4 e2e-darkness probes in a burst | `scripts/e2e-darkness.mjs` `findProbes`: sets `flicker = 1` on every id in `w.level.lights.flickering` inside the same synchronous evaluate, before the search |
| lr16t R3 e2e part 3 detail | `scripts/e2e-desktop.mjs`: evaluate returns `stats: w.torchShadows?.stats?.()`; only the `copies > 0` assert message prints it |
| lr16-1 check 4 Kestrel bounce | `src/editor/lightView.ts` `render()`: `bounce: c.field.bounce` in the `BakedLamps` extras |
| lr16dx 2 audit crowds by yaw | `src/world/lampAudit.ts` `crowds`: plan extents turned by each fitting's yaw (`ex`, `ez`), then the `FIT_GAP` test |

## Skipped
- lr16-1 check 7 (`tests/lampBounce.test.ts` bake-time ratio): moved to part F by the lead. File not touched.

## Tests
- `npx tsc --noEmit`: clean. eslint on the changed src and test files: clean.
- vitest (`--maxWorkers=2`): flickerGlare (new, 3), lampAudit (+1 yaw case), nightVision, lampFlicker: 4 files, 57 tests passed.
- `node --check` on both e2e scripts: ok.
- `node scripts/lamp-audit.mjs --map=warehouse,warehouseOps --no-views`: warehouse 18 lamps 0 flagged; warehouseOps 133 lamps 1 flagged (1 decided, `none`): same as the committed full table. The script overwrote `docs/sector-redesign/checks/lr16-lamp-audit.md` with a partial table; reverted, not committed.
- Not run (per the lead's rules): e2e. Laptop requests on the merged sha: `e2e-darkness`, `e2e-desktop:3`.

## Assumptions
1. No `NightAutoGain` test exists (it needs a scene), so the "pure target rule" is extracted as `glareTarget` and tested in `tests/flickerGlare.test.ts`.
2. `GlareLamp` gained a required `flicker` field (real `LightDef` already has it); `tests/nightVision.test.ts` lamp helper got `flicker: 1` so tsc stays green. That file is not on part A's list.
3. The crowds yaw test uses neighbours 1.4 m away: closer than `SPACING` (1.0 m) always crowds on the centre test, so the brief's 0.5 m example cannot show the yaw effect. Cases: 1.2 x 0.2 strip, yaw 0 crowds along x (1.4, 0.1) not z (0.1, 1.4); yaw PI/2 the reverse.
4. `crowds` uses each of the two fittings' own `yaw ?? 0` (the brief says the foot owner's yaw; both fittings have a foot).
5. The registry handle in e2e-darkness is `w.level.lights` (`LightRegistry`; `lights` and `flickering` are public).
6. One commit for all six items, not one per item.
