# light-realism L1 e2e triage 2: e2e-sectorops:1 on 02c92e690

Commit 02c92e6908d5ad28ebfb3f8e850c00250929d31f (feature/light-realism-l1, the fix from triage 1:
`C:/NightShift/scratch/sector-ops-checks/light-l1-e2e-triage.md`). Status `laptop-e2e/light-realism-l1-e2e` failure
"1/2 pass, 412 s; FAIL: e2e-sectorops:1" (2026-10-25T21:51Z), request `20261025T213408-night-shift-sector-o-02c92e69-82d9`
(parts 1 and 6, laptop). Triaged from code only (Opus, G319): no e2e run on the desktop.

## Verdict: stale test expectation after L1 moved the lane head (not a game bug, not a flake, not the environment)

## The log

Not readable from the desktop. The status has no target_url, the request has no PR (so no failure comment with the
failing line), and the laptop keeps the log in its own `C:/NightShift/scratch/laptop-queue/runs/20261025T213408-...-82d9/`.
Nothing for this sha is in `origin/laptop-queue` `logs/` or the desktop's `laptop-queue-desktop/runs/`. The cause below
is from geometry; the rerun log confirms or refutes it.

## Cause

Triage 1 moved the lane lamp lookup to the head at (9.8, 6.0, -66) but left the client at x 12 ("can stay"). That is
2.2 m from the head instead of the old 3 m, which is too steep:

- `fireAt` aims through the ADS camera's pivot (1.68 - 0.16 = 1.52 m over the feet, `src/config/camera.ts:46,50`), so
  the converged pitch is atan2(6.0 - 1.54, 2.2) = 1.11 rad.
- The camera's limit is `maxPitch: 1.05` (`src/config/camera.ts:134`). The client page runs real frames, and
  `player.ts:353` calls `cam.addLook` every step, which clamps the pitch to 1.05 (`src/player/shoulderCamera.ts:235`)
  before `w.shoot()` runs.
- At 1.05 the aim line runs about 0.6 m under the head at x 9.8 and hits the arm's underside near x 9.33
  (arm box x 9.0-9.6, y 6.10-6.20, `src/world/maps/campusS1.ts:245`). The round goes from the muzzle to that point and,
  at best, grazes the corner of the head's padded fixture box (x 9.44-10.16, y 5.89-6.11, `lightOnRay`,
  `src/world/lights.ts:615`). The likely failing assert is `scripts/e2e-sectorops.mjs:1048` (on 02c92e690:
  "the client's round on the lane lamp's pole top shoots it out on the host").
- Before L1 the head sat on the pole top at x 9: from x 12 the pitch was atan2(4.46, 3.0) = 0.98, inside the limit.
- The host's car-park shot keeps the 3 m stand-off (feet x -29.2, head x -32.2): pitch 0.98, fine.

Part 6 was in the same run; the status counts it as a pass (it is quarantined to 2026-10-27), so its log should still
be read for the 16 / 10 heads and the two light-meter lines (triage 1, "What to rerun").

Not a game bug: a player aiming freely cannot ask for more than 1.05 either; they step back, as the test now does.

## Action

`scripts/e2e-sectorops.mjs` part 1: the client fires from (12.8, 0.02, -66), 3 m east of the lane head (pitch 0.98), with
a comment naming the limit. Commit 5dceab9bce0e3d2b80aadd7987ec811f4cf37afa, pushed. `node --check` passes;
`npm run typecheck:fast` does not cover `scripts/` (tsconfig `include`: src, tests) and this worktree has no
node_modules, so no tsc run.

## Rerun

Request `20261025T225359-night-shift-sector-o-5dceab9b-37f2`: `e2e-sectorops:1` on 5dceab9b, set
`light-realism-l1-e2e`, requester "Night Shift | Sector Ops Build" (no PR). Pass means:
`ok - the client fires one round at the lane lamp`, `ok - the client's round on the lane lamp's pole top shoots it out
on the host` and `ok - the host's round on the car-park lamp's pole top shoots it out`.

Watch item: with the head at the arm's end and nothing behind it, the aim ray past the host's car-park head goes to the
sky, so the round no longer converges on a pole top; it passes about 0.14 m to the side of the head's centre (muzzle
against camera shoulder offset) against a 0.21 m padded half-width. If the host shot fails next, that margin is the
cause.
