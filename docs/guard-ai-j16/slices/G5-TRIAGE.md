# guard-ai-j16 G5 triage: shadowCue "0 candidates"
Owner: Guard AI Build. Status: current.

**Cause: a test (brief) bug, and the warehouse cannot host the scenario at all.** The pick's gate (far point
contrast >= 0.5 and footprint length >= 4 m, G5-BRIEF "Picking the spot" step 2) cannot occur under the warehouse's
5.05 m hall lamps. Beyond the gate, the scenario's spacing needs a contrast >= 0.40 shadow point at least ~2.55 m from
the player's feet, and no warehouse lamp gives one farther than 1.5 m. No game or flag bug: the flag, the fill, the
slot and the field names are right.

Triage by Opus 5.5, 2026-10-27, on feature/guard-ai-j16-2 (head d7fc1f6d5 before this commit).

## Evidence
- Laptop logs, the same in the run and the rerun, on both heads:
  - 13c844815: `runs/20261026T222403-night-shift-guard-ai-13c84481-6535/4189.log:143-144` and
    `rerun-e2e_stealth_ai.log:142-143`.
  - d7fc1f6d5 (j16-g5b): `runs/20261026T222718-night-shift-guard-ai-d7fc1f6d-2144/4192.log:143-144` and
    `rerun-e2e_stealth_ai.log:142-143`.
  - The failing lines: `shadowCue` / `Error: ASSERT: shadowCue: a lamp footprint (contrast >= 0.5, length >= 4 m) with
    a guard place beside it (0 candidates)`.
  - The block printed nothing before the assert: the old pick returned no numbers. Every other scenario passed.
- The flag, the fill and the accessors are right:
  - `flags.ts:303` `charShadowLight: darkFlag(params.get('charlight'), PREVIEW_ON)`: `charlight=1` turns it on in any
    build. `/preview/` is not needed, so the queue's build without VITE_PREVIEW is fine.
  - `gameState.ts:1838-1839`: the 10 Hz fill in `updateLight`, every slot, with the flag on and not on a client.
  - The player's slot is `'local'` (`gameState.ts:653`). The `pts` index `((s*3+k)*3+j)*4` matches
    `shadowCues.ts` (`PT` 4, `SRC_STRIDE` 12). `t.step(0.25)` covers 2-3 fills. The pick never pins `updateLight`.
- The geometry, from `shadowCues.ts:338-347`. The length is `D x h / (lamp y - top y)`, with h = 1.67 m for a standing
  1.68 m body (`fillPlayers`: top = 1.48 + r 0.22, feet 0.03) and D the horizontal distance to the lamp.
  - The hall lamps are at y 5.05 (`warehouse.ts:436`), so L = 0.50 x D. That is 1.5-3.0 m in the pick's 3-6 m ring,
    so `L >= 4` never holds.
  - The one low lamp (the gatehouse door, y 2.45, reach 6.4 m) reaches L 3.3+ m. Its far points are near the end of its
    reach and at a grazing angle, so their contrast drops to 0.
- A node probe used the real `warehouse` bake: `LevelBuilder`, `canonicalLightSet`, `bakeLamps`, `bakeMoon`, the
  `LightField` with doors shut, the real `ShadowCues` and a `fillPlayers` standing capsule. It tried every lamp,
  8 / 16 directions, at 1-8 m from the lamp, the same as the page minus the nav.
  - Old gate (far point q >= 0.5, L >= 4, 3-6 m): **0 spots**, which matches the laptop.
  - The best contrast anywhere is 0.53, 0.5 m from the feet. Per lamp at 1.5 m: about 0.44-0.50.
  - Contrast falls along the shadow. Lamp 7 (0, 5.05, -3): m 3, L 1.50, q [0.36, 0.33, 0.28]; m 6, L 2.99, q [0.10,
    0.06, 0.03].
  - The farthest point with q >= 0.40 from the feet is 1.5 m, on lamps 2 and 3. With q >= 0.45 it is 1.25 m, on lamps 4,
    7 and 9.
- Why 2.55 m: the guard needs the player >= 2.3 m away (>= `PERCEPTION.closeRange` 1.8 + margin) and >= 120 deg off
  his facing. He also needs the point >= 1 m away (`SHADOW_NOTICE.near`) inside his 27.5 deg cone
  (`perception.ts:18`).
  - So the angle at the guard between the player and the point is >= 92.5 deg.
  - That gives |feet - P|^2 >= 2.3^2 + 1^2 + 2 x 2.3 x 1 x cos(87.5 deg), so |feet - P| >= 2.55 m.
  - Even at the edge of sight (player 1.9 m away and only 90 deg off), the point must be >= ~1.7 m from the feet. That
    still beats the warehouse's 1.5 m.
  - So no threshold at or above the rule's 0.40 makes the block pass on this map.
- Other maps, the same probe (q >= 0.45, the farthest point from the feet):
  - warehouseOps 1.65 m, campusOps 2.09 m, seclab 2.28 m, courselab 1.52 m.
  - ctcourse **5.09 m (q 0.61)**: lamp 47, a 2.8 m lamp at (10.25, 2.8, 14.75), radius 20.8, intensity 3.5, feet
    near (10.6, 11.4). Also lamp 101 at 2.61 m (q 0.49).
  - Only ctcourse clears 2.55 m. It boots only in `mode=course`.

## Design finding (for the lead / the walk, PLAN risk 1)
- In the warehouse hall, a standing player's cast shadow can never cue a guard who cannot already see him. Every
  contrast >= 0.40 point lies within 1.5 m of the feet, so any guard with that point in his cone has the player in
  front of him.
- The cue code works as specified. The light model leaves a shadow under 5 m lamps short and faint at its tip. This is
  a tuning or map call (`SHADOW_NOTICE.contrast`, the shadow model, lamp heights), not a code bug. It is for Michael's
  walk.

## The fix (this commit, `scripts/e2e-stealth-ai.mjs` `shadowPick` and its assert)
The brief's order stays the same:
- FIX 1: tp, `t.step(0.3)`, then spawn, in `shadowRun`, untouched.
- G5 check FIX 1-2: `isWalkable(cellOf(..))` floor checks, the snapped guard cell, and the walk's nearest point and
  ends checked.

What changed in the pick:
- **It matches the rule.** A candidate is any of the footprint's 3 points with contrast >= 0.45, not only the far
  point. `noticeInto` reads all three. 0.45 is the rule's 0.40 plus 0.05 for the drift while the walk moves the
  footprint 1.2 m. Contrast changes by about 0.02-0.05 per 0.5 m in the probe.
- **No length gate.** The guard checks set the real minimum (~2.55 m). Candidates go farthest point first, then by
  contrast.
- **The guard stands on the shadow's line**, facing along it, from 2.4 m out to 1 m short of the point, at 0.6 / 0.4 /
  0.8 m to the side. Before, he stood at a fixed 2.4 m beside the far point.
- **Spots tried:** 1.5-6 m from the lamp (was 3-6). The brief's 3 m inner bound dropped the best-contrast spots.
- **Diagnostics on a miss:** the assert prints `diag`: lamps, floor spots, cue fills during the pick, footprints from
  the spot's lamp, max contrast, and the farthest point at >= 0.40 and >= 0.45 (lamp, ring, direction, point, distance,
  contrast).

On the warehouse this still fails, now with numbers. Passing needs one of these decisions from the lead (not taken
here):
1. Move the cue page (and its flag-off control, which today reuses the main warehouse page) to a map with a long,
   contrasted shadow. Today that is only ctcourse lamp 47, in `mode=course`. It needs an `installT` check in course
   mode and a second `charlight=0` page on the same map.
2. Change the scenario so the player is hidden by cover instead of by spacing. Example: around a corner, with the
   shadow cast past it into the guard's cone. This needs a new brief.
3. Treat the design finding as the answer: record it for Michael's walk and drop or park the e2e until the lamps or
   the tuning change.

## Verify
- `node --check scripts/e2e-stealth-ai.mjs`: ok.
- `npm run typecheck:fast`: clean.
- The probes (`warehouse` bake and all maps) were run in vitest and not committed. They assert nothing that should
  hold, so they are not regression tests.

## What the next laptop run must show
`--suites "e2e-stealth-ai" --only=shadowCue`, cue page still on the warehouse:
- The pick assert fails with a `diag` like the probe's. `fills` > 0 and `withFootprint` > 0 show that the fill runs in
  the page. Expect `maxQ` about 0.45-0.53 and `far40.d` / `far45.d` <= about 1.5 m. That confirms the cause above.
- If instead `fills` is 0, or `withFootprint` is 0, the in-page fill is not running. That would be a game / wiring bug.
  Look at `updateLight` and `charRefs` on that page.
- After the lead picks option 1, the same run must log `pick {...}` with `dp >= 2.55` and pass the walk asserts.
