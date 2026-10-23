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
