# R2 jump - solo top-landing check (sector-fixes-r2 jump), WIP notes

Question: can one player run-jump from R2S's top (4.0) onto R3S's top (4.4) across the 3.0 m A3 gap (R3S's west face
is `noLedge`, so no grab; the risk is the capsule stepping / riding up onto the top)?

## Derived so far (no code written yet)
- Constants: `LEAP.vy` 5.6, `GRAVITY` 18, top gear 4.0 m/s (carry 1.0, cap 5.0; air control 0.05 holds the pace),
  `MOVEMENT.maxStep` 0.42, radius 0.3, mantle 1.8 (ground probe only, `TraversalController.probe`, no airborne mantle).
- Landing on a top at `to` from `from`: the feet must still be at or over `to - maxStep` when the capsule reaches the
  far face. 4.0 -> 4.4: threshold 3.98, t = 0.626 s, plan travel 2.50 m; plus a radius past the take-off edge and a
  radius to the far face: reach 3.10 m vs the 3.0 gap. It REACHES by ~0.10 m (conservative bound).
- Mitigating engine facts: a jump pressed within 0.75 m of the edge is a drop (`probe`, nothing ahead and floor > 0.6
  down), unless the stick points along the edge at the press (then a leap with the old velocity) - so the edge take-off
  is reachable. The running hop (`probe`, speed > 3.5) needs the far floor within 0.35 of the feet; 0.4 is outside.
- Mantle on landing: only from a grounded spot; landing short puts the feet on the A3 floor (4.4 up, over 1.8): none.

## Next
1. `soloJumpReach.ts`: add `soloTopLandingReach(from, to)` and check every co-op top in the S1-S3 tests.
2. A headless check or e2e part 2 leg: top-gear running jump R2S -> R3S must not end on R3S.
3. Fix: raise R3S (4.4 -> 4.5 gives threshold 4.08, t 0.613, reach 3.05; still reaches) or widen the gap (>= 3.6 m
   for a 0.5 margin) within PLAN's rules; keep C1b and the guard paths.
4. tsc, eslint, npm test.
