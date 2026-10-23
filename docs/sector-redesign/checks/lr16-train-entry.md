# LR16 train entry (#287): master merge resolution

Branch `feature/sector-redesign-lr16-entry` = `feature/sector-redesign-lr16int` 809c25f4 + `origin/master` 5d1e8e3e
(train/40), merge commit 5efaa646, test commit 5b2aace6. `feature/sector-redesign-lr16int` stays at 809c25f4 (CLAUDE.md:
never merge master into a job branch). For the train: merge lr16int by hand on the train's pre-version head and replay
the resolutions below, or take this branch's tree for the conflicted files.

## Conflicts (23 files) and resolutions

Rule used: both sides' features kept; where the lamp / light code clashed, ours (one LR16 photometric light model,
Michael approved), master's for everything else.

| File | Master | Ours (LR16) | Resolution |
|---|---|---|---|
| `src/net/protocol.ts` | 44, history moved to CHANGELOG / coop.md, `MotionState` import | 39, `SWAY` import, history comment | 45 (master 44 + 1); master's one-line comment + a 45 note (LR16a drops `start.lf` / rejoin `lf`, LR16-5b `sway` event and `sw-<id>` shot); both imports |
| `docs/systems/coop.md` | "currently 42", version list | our 39 / 38 paragraph | master's line, "currently 45", a 45 entry prepended (43-44: see CHANGELOG) |
| `TESTING.md` | coop-walk-fixes, pose-parity rows, LR13 Lamp falloff row | LR16 lamp light, failing tube, swinging pendant rows | master's two co-op rows + ours; the LR13 Lamp falloff row dropped (LR16a removed the setting); "on master" pointers rewritten to A7 / A4 |
| `src/ai/enemy.ts` | `PACE` moved to `response.ts` (adds `rush`), re-exported | `fieldLight` (LR16t) above the old `PACE` | `fieldLight` + master's `export { PACE }` |
| `src/core/flags.ts` (2) | `guardFreeze`, `photoLamps` | neither | `guardFreeze` kept, `photoLamps` dropped (LR16a: no falloff override) |
| `src/game/gameState.ts` (2) | `sectionRatings`, `lampFalloff` field; falloff + shadow accuracy set before `World.create` (voxels retired) | voxel config into `World.create` | `sectionRatings` kept; `lampFalloff` / `setShadowAccuracy` dropped (LR16: always photometric, accuracy always on); master's `World.create` call, no voxels |
| `src/net/coopClient.ts` (2) | `lampReachProbe` import (polish2), `partnerHolds` / `assistTakedown` (P6) | `SWAY_TARGET`, `SWAY`, `simTime()` | union of imports; `simTime()` + both P6 methods |
| `src/net/coopHost.ts` | `holdPulse`, `lampReachProbe` imports | `SWAY_TARGET`, `swayShotOk`, `swayTargetId` | union |
| `src/ui/screens/settingsScreen.ts` (2) | Mocap row removed (AF5), `lampFalloffRow` | Mocap row, no falloff row | neither row; master's comment + "(LR16a) no Lamp falloff row"; the Gameplay reset touches neither key |
| `src/world/bakedLamps.ts` | local `dropCpuCopy` (voxel-retire) | `voxelWorld` import, `LAMP_GRID_SLOTS` / `LAMP_GRID_TEXELS` | master's import line + the two LR16b grid constants (`LAMP_GRID_SLOTS` stays 24) |
| `src/world/world.ts` (3) | voxels gone | flicker / sway imports, torch shadow atlas (LR16t), `micro` from voxels, voxel layer frame | ours minus every voxel piece (`VOXEL_TIER`, `GI_STRIDE`, `micro`, `voxelLayers`) |
| `src/vfx/rtReflections.ts` | deleted (voxel-retire) | flicker in the light colour | deleted |
| `src/world/maps/ctcourse.ts` | Marlow Yard A1-A8 (marlow-final) | LR16g re-level of the old map | master's file |
| `tests/ctcourseLight.tuned.json` | deleted | LR16g re-take | deleted; master's `tests/ctcourseLight.test.ts` kept |
| `tests/net.test.ts` (5), `crateWire`, `jammer`, `jammerFixes`, `moveState`, `rejoin`, `sectorLampSync`, `sectorStep3` | no number asserts (tests read the constant; `protocolConst.test.ts` guards) | `toBe(39)` asserts | master's form everywhere (no test asserts a number) |
| `tests/lampBake.test.ts` | GI-circuit test deleted with `voxelWorld` | LR16e penumbra block | penumbra block kept, GI test dropped |

Auto-merged, checked: `lights.ts` (master's `lampReachProbe` beside our reach / sway code), `lightRig.ts`, `lampSync.ts`,
`levelBuilder.ts`, master's new `lighting/circuitSchedule.ts` / `marlowCircuits.ts` (they drive `LightRegistry.setGroup`;
no clash). Master's deleted `changes/` fragments (released in CHANGELOG) stay deleted; CHANGELOG.md not touched.

## Versions
- `PROTOCOL_VERSION` 45 (master 44 + 1). `merge-train.mjs build` writes master + 1 as well, so it stays 45 while master is 44.
- `LAMP_VERSION` 7 (ours; master never changed it from 1).

## Fixes after the merge (commit 5b2aace6)
- `tests/ctcourse/a5Substation.test.ts`: the kiosk lamp test asserted `radius <= 1.2`; the LR16 registry holds the
  photometric reach (authored 1.2 x `PHOTO.reach` 1.6 = 1.92). Now `<= lampReach(1.2)`. Intent unchanged.
- `tests/lampBake.test.ts`: the Marlow scratch-cut hash re-pinned on master's map (0a285ac259cd1791 -> 6efdcc4965ad2745);
  the scratch-cut equivalence stays proven by the fixture hashes (unchanged, green).
- `tests/lampBoxAlign.test.ts`: A8's three counter lamps (`ctcourse:136-138`, y 1.4 over the 1.2 m counters) have the
  counter in the cell under them; listed in `KNOWN_EMBEDDED` for the lead / Marlow Build (not moved: the map is theirs).

## ctcourseLight on master's Marlow map: RED (left red, the lead decides)
`tests/ctcourseLight.test.ts`: 5 passed, 1 skipped, 2 failed. Master's levels were tuned under the linear falloff; the
LR16 photometric model (reach x 1.6, LR16-L bake box, LR16g / polish F bounce) moves 57 points in all eight sets
(51 up, 6 down, 30 saturate at 1.00) and breaks 13 bands. Not a small data change in one Marlow light but a re-tune of
the whole map against the LR16 model (Marlow Build), so no LR16-W lever was applied.

Band breaks (value vs band):
- A1 mark: 0.373 < pool 0.6
- A2 neck crossing west cut: 0.281 > cut 0.24
- A2 neck crossing east cut: 0.281 > cut 0.24
- A2 neck cess west cut: 0.304 > cut 0.24
- A2 neck cess east cut: 0.304 > cut 0.24
- A2 coat corner: 0.614 > pocket 0.22
- A3 office 2 cut: 0.346 > cut 0.24
- A3 office 3 cut: 0.252 > cut 0.24
- A5 strip centre: 0.557 < pool 0.6
- A5 kiosk cut: 1.000 > cut 0.24
- A5 landing mark: 0.230 > pocket 0.22
- A7 R1 cut: 0.399 > cut 0.24
- A8 grille approach cut: 0.374 > cut 0.24

Tuned levels, old -> new (tolerance 0.08):
- A1 mark: 0.7 -> 0.37
- A1 apron centre: 1 -> 0.85
- A1 lounge: 0.79 -> 1.00
- A1 cabin: 0.67 -> 1.00
- A1 apron floor: 0.81 -> 0.62
- A2 neck crossing west cut: 0.16 -> 0.28
- A2 neck crossing east cut: 0.16 -> 0.28
- A2 neck cess west cut: 0.19 -> 0.30
- A2 neck cess east cut: 0.19 -> 0.30
- A2 rake gap: 0.71 -> 0.94
- A2 cess: 0.71 -> 0.88
- A2 vantage: 0.54 -> 0.69
- A2 cabinet 1: 0.57 -> 1.00
- A2 coat corner: 0.19 -> 0.61
- A2 deck: 0.54 -> 1.00
- A2 cabinet 2: 0.45 -> 0.62
- A2 east rake gap: 0.71 -> 0.94
- A3 corridor centre: 0.83 -> 1.00
- A3 west lobby: 0.61 -> 1.00
- A3 east lobby: 0.61 -> 1.00
- A3 office 2 cut: 0.14 -> 0.35
- A3 office 3 cut: 0.14 -> 0.25
- A3 far desk: 0.48 -> 1.00
- A3 corridor floor: 0.41 -> 1.00
- A4 main aisle: 0.83 -> 0.91
- A4 main aisle east: 0.83 -> 0.98
- A4 aisle 2: 0.45 -> 1.00
- A4 aisle 2 east: 0.45 -> 1.00
- A4 east lane: 0.6 -> 0.85
- A4 mezzanine: 0.89 -> 1.00
- A4 floor: 0.35 -> 0.63
- A5 strip centre: 0.75 -> 0.56
- A5 kiosk cut: 0.22 -> 1.00
- A5 landing mark: 0.14 -> 0.23
- A5 switchroom: 0.68 -> 1.00
- A6 gauge board: 0.85 -> 0.59
- A6 outfall approach: 0.95 -> 0.69
- A6 holder: 0.52 -> 1.00
- A6 cage: 0.75 -> 1.00
- A7 T1: 0.67 -> 1.00
- A7 aisle B: 0.8 -> 1.00
- A7 aisle C: 0.76 -> 1.00
- A7 north apron: 0.76 -> 1.00
- A7 R1: 0.53 -> 1.00
- A7 R1 cut: 0.14 -> 0.40
- A7 lobby: 0.56 -> 1.00
- A7 corridor: 0.9 -> 1.00
- A7 grating: 0.48 -> 1.00
- A7 T2: 0.61 -> 1.00
- A7 hall floor: 0.34 -> 1.00
- A8 grille approach: 0.64 -> 0.86
- A8 grille approach cut: 0.22 -> 0.37
- A8 gallery east: 0.59 -> 1.00
- A8 office: 0.82 -> 1.00
- A8 T1: 0.79 -> 1.00
- A8 T2: 0.83 -> 1.00
- A8 hall floor: 0.23 -> 0.42

## Checks (desktop, merged tree 5b2aace6)
- `npx tsc --noEmit`: 0. `npm run lint`: 0 errors (42 warnings, all existing `no-console` in docs / scripts).
- vitest single files, `--maxWorkers=2`, slot lock: 111 files. 110 green (1789 tests, 3 skipped, after the three fixes
  above); `ctcourseLight` red as above. Covered: every test importing a conflicted file (enemy, flags, gameState,
  coopClient, coopHost, protocol, settingsScreen, bakedLamps, world, ctcourse), every `PROTOCOL_VERSION` test,
  protocolConst, mergeTrain, ctcourse / ctcourseGreybox / ctcourse/a1-a8 + facility, warehouseS1/S2/S3Light,
  lampBoxAlign, lampBake, lampBounce, bounceGrid, lightField, lampFalloff, lampFlicker, lampSway, charShadow*,
  torchShadow*, sectorLampSync, net, netSim.
- Not run (orchestrator rule): full vitest, `npm run check`, build, e2e, GPU probe.

## Risks
- Marlow Yard's light: the whole A1-A8 tune is off under LR16 (above). In game the sets read brighter and the cut
  circuits (A2 neck, A3 offices, A5 kiosk, A7 R1, A8 grille) no longer read dark enough. Needs a Marlow re-tune on LR16
  before or with the train, or the lead accepts the red test for now.
- Master's Marlow tests that read `LightRegistry.radius` as the authored radius: only A5's kiosk tripped; other
  linear-falloff assumptions may only show in e2e-ctcourse.
- The A8 counter lamps sit 0.2 m over the counters: their bake rays from below cross the counter top.
- Shadow accuracy is always on (LR16) where master gated it on Realistic, so master's new code ran with it off by default.

## Laptop suites for the merged head
e2e-coop and e2e-netmove (wire change: protocol 45, `sway`, no `lf`), e2e-lightbake, e2e-ctcourse (master's Marlow under
LR16 light; its level gates may read as above), plus e2e-darkness and e2e-sectorops (lighting files merged with master's
guard-ai / player work).

## marlowLightingLevels: levels.ts on the LR16 model (Marlow Build report)
Master's `tests/marlowLightingLevels.test.ts` was red here (2 of 7; the merge check above missed it): `lampLevel` kept the
old linear falloff while the registry (`lights.ts` `contribution`) runs LR16's photometric model.
- `src/world/lighting/levels.ts`: one model. `lampLevel` = `LAMP_LEVEL_GAIN x intensity x photoTerm(..., lampReach(radius),
  hemisphere cone)`, the registry's own pure function (`LampSpec.radius` stays the authored radius, as given to
  `LightRegistry.add`). `poolIntensity` solves through `lampLevel` at intensity 1 (was `1 - drop / radius`).
  `spillsPast` and `lampsPerColumn` use the reach `lampReach(radius)` as the plan reach, as the bake does.
- `src/world/lighting/marlowCircuits.ts`: `MARLOW_LAMP_BUDGET.perColumn` = `LAMP_GRID_SLOTS` (24 since LR16b; was a
  literal 8, which the test's `toBe(LAMP_GRID_SLOTS)` hid behind the cove assert).
- Callers: none in gameplay, the meter, the guards or the picture (they read the light field). Marlow's map files import
  only the `MARLOW_LEVEL` constants (unchanged); `lampLevel`, `bodyEstimate`, `poolIntensity`, `spillsPast`,
  `lampsPerColumn` are read only by this test. (`src/editor/lamps.ts` `lampLevel` and the e2e `lampLevel` in
  `scripts/e2e-ctcourse/a4GoodsShed.mjs` are other functions.)
- Test inputs that encoded the linear model (each with the reason in a comment, intent kept): the cove row's intensity
  0.45 -> 0.15 (0.45 saturates the room on LR16: centre and wall 1.00; 0.15 reads centre 0.47 >= 0.40, wall 0.83);
  `poolIntensity`'s out-of-reach drop 7 -> 8 m (radius 5 reaches 8 m); the cut-circuit neighbour radius 5 -> 3.5
  (reach 5.6 < 6 m); `spillsPast` radii 3.5 / 3.9 -> 2.3 / 2.4 (reach 3.68 / 3.84 against 4 m less 0.3); the alloc
  limit (2 -> 3) x lamps + 2 boxed doubles (292 B a call in Turbofan on `photoTerm`; a per-lamp object still fails).
- The cove fail was the test's inputs, not Marlow's data: no Marlow value comes from these helpers.
- For Marlow LR16-M: `docs/marlow-final/LIGHTING-PLAN.md` lines 90, 260, 310 still say 8 per column (now 24), and the
  gallery rule (line 80, 276) now holds on the reach: a gallery lamp's authored radius <= (distance to glazing - 0.3) / 1.6.
- Checks: tsc 0; lint 0 errors (42 existing warnings); vitest single files, `--maxWorkers=2`, slot lock:
  marlowLightingLevels 7/7, marlowLightingCircuits + smoothWorldLight green (22/22 with levels), ctcourse/a1-a8 green;
  ctcourseLight still 2 failed / 5 passed / 1 skipped (the Marlow re-tune above; it reads no `levels.ts` helper).

## Refresh vs master cacd0c7e (4.86.0)
Merge 614871a9 (6e53e036 + origin/master cacd0c7e). npm deps unchanged (package.json / lock: version only).
- `src/ai/enemy.ts`: master's Guard AI S24-S27 perception (per-player `P_*` pass, `P_LIGHT`). LR16t needs one line
  there, twice: both light samples (the per-player pass and the target's NaN fallback) read `fieldLight(this.ctx, ...)`
  (flashlights tested with `ctx.lightOccluder`) instead of a bare `lightField.totalAt`. Rest is master's.
- `src/net/protocol.ts`: master's `PROTOCOL_VERSION` line (46, no history in the comment; master's form). The train bumps it.
- `src/net/session.ts`: master's `lateBay` (coop-rejoin) kept; `hostLampFalloff` stays removed (LR16a dropped `start.lf`
  and the `LampFalloff` import; master's side would not compile).
- `docs/systems/coop.md` (auto-merged, edited): "currently 46"; LR16's wire change is "the train after 46", not 45.
- Auto-merged both sides: enemyManager.ts (keeps `lightOccluder: this.bodyOccluder`), gameState.ts, coopClient.ts,
  coopHost.ts, net.test.ts, TESTING.md, testing-tools.md. Master changed nothing under `src/world` or `src/render`.
- Marlow #291 (`feature/marlow-lr16m`): `git merge-tree` onto the merge is clean; no file it touches changed on master.
- Checks: tsc 0; lint 0 errors (42 warnings); vitest single files, `--maxWorkers=2`, slot lock, 96 files in 8 batches
  (tests importing enemy / protocol / session, master's new or changed tests since 5d1e8e3e, PROTOCOL tests, the light
  set, charShadow*, torchShadow*, torchOcclusion, enemy* / guard*): 92 passed, 3 skipped, 1 failed; 1452 tests passed,
  8 skipped, 2 failed. The 2 are ctcourseLight's band / tuned-level checks, red before this refresh (the Marlow re-tune).
