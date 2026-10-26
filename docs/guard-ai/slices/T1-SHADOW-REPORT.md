# G327 / T1-SHADOW: anim tier saving with the shadow rule
Owner: Guard AI Build. Status: history.

The laptop alone measure G327 asks for ("measures the CPU saving left"): PR #438 head 1ebdda52 (version 4.103.0),
laptop GPU (E2E_GPU=1), gfx=epic, 1920x1080, uncapped, warm 5 s, sample 10 s. Request
`20261025T071135-night-shift-guard-ai-1ebdda52-5b5c` (status `laptop-e2e/alone-g327-measure` success, 4/4 steps,
1182 s). Raw tables: `C:/NightShift/scratch/guard-cap/g327-measure/{a-tier8,b-tier0,c-shadow0,d-tier8-repeat}/RESULTS.md`
(not in git); logs under `C:/NightShift/scratch/laptop-queue/runs/` (same id).

Runs (`scripts/guard-cap.mjs --maps=sectorops,campusops --cells=patrol,away,alert`):
- a: tier 8 + shadow rule (the PR as shipped), 24 and 32 guards.
- b: `?animtier=0` (every guard solves every frame unless the render freeze has disabled him), 32.
- c: `?animshadow=0` (tier 8, camera-only "seen", the old rule), 32.
- d: a again (repeat, for run-to-run noise), 32.

## 32 guards: anim ms per frame (mean), solves per frame, shadow-seen per frame; frame median ms

| map | cell | a tier 8 + shadow | b tier off | c camera only | d repeat of a |
| --- | --- | --- | --- | --- | --- |
| sectorops | patrol/facing | 2.11, 29, 2.0; 9.0 | 1.20, 29, 2.0; 8.4 | 1.06, 27.2, 0; 7.1 | 1.12, 29, 2.0; 6.6 |
| sectorops | patrol/away | 0.45, 7, 3.4; 5.7 | 0.32, 7, 3.4; 4.8 | 0.19, 3.9, 0; 4.0 | 0.32, 7, 3.5; 4.2 |
| sectorops | alert/facing | 1.44, 26.3, 1.5; 9.3 | 1.30, 29.4, 1.7; 8.3 | 0.97, 21.8, 0; 8.5 | 1.15, 25.9, 1.6; 8.2 |
| campusops | patrol/facing | 1.32, 25.6, 0; 9.2 | 1.65, 29.7, 0; 10.4 | 1.18, 25.6, 0; 8.1 | 1.09, 25.7, 0; 7.8 |
| campusops | patrol/away | 0.21, 3.2, 1.4; 4.8 | 0.25, 3.2, 1.4; 4.8 | 0.13, 2.0, 0; 3.6 | 0.21, 3.2, 1.3; 3.6 |
| campusops | alert/facing | 1.22, 24.4, 2.7; 10.4 | 1.32, 28.5, 2.2; 10.1 | 1.09, 24.1, 0; 9.7 | 1.19, 26.5, 2.4; 9.2 |

## Findings
1. Noise: a and d are the same build and flags, yet the first cell differs by 1 ms (2.11 vs 1.12, the run's first
   map boot); the other cells agree within ~0.15 ms. Read d against b and c.
2. Saving left from the tier (b - d): 0.0-0.15 ms per frame on most cells, 0.57 ms on campus 32 patrol/facing (b solves
   29.7 a frame against 25.7). In the "away" cells b solves no more than a: the guards out of view there are already
   render-frozen (`sectorGuardFreezeView.ts`, FROZEN comes first in `animTier.ts`), which no tier flag changes. The
   freeze, not the off-screen period, removes most off-camera solves in Sector Ops.
3. Cost of the shadow rule (d - c): 0.07-0.18 ms per frame (1-3.5 extra guards solve like on screen because a shadow of
   theirs is in view), within one run's noise on the facing cells. G327 / Q17 ("Like on screen") costs little.
4. Budget: every 32-guard cell keeps the frame median at or under 10.4 ms (96 fps or better) on the laptop GPU at
   epic; anim is at most ~1.2 ms of it in the repeat run. The Q4 60 fps target at 32 guards is not blocked by the
   anim tier; J21 owns the full measure (low-end preset, campaign map).

## Decision
Ship the shadow rule with tier 8 as built (#438). No tuning needed: the rule's cost is near noise and the saving the
tier keeps is small next to the render freeze. Follow-up for J21 only: measure the campaign map, where no render
freeze applies, before counting on the off-screen period there.
