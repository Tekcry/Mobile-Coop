# AF6 - P5 co-op partner (Michael, walk 4.72: "animations are bad, doesnt match existing animations, seem more jumpy")

Branch `feature/afp-af6` off `feature/coop-walk-fixes`. PROTOCOL_VERSION **39** (lead, 2026-10-23: 38 is guard-ai S9's).

## What and why
Receiving side (5f624393):
- `interp.ts` `SnapshotBuffer.sample` returns the span, the time past the newest state and a continuous velocity / yaw
  rate (each span's mean at its middle, blended to the neighbour's); `sampleSpeed` blends the owner's pace across the
  span (it stepped at 15-20 Hz from the older state, then eased at 10 / s); `ExtrapBlend` blends the step back after an
  extrapolation out over 0.12 s (it showed in one frame).
- Delays: `HOST_INTERP_DELAY` 0.13 (was 0.10), `CLIENT_INTERP_DELAY` 0.16 (was 0.12): two send intervals + jitter + a frame.
- `remoteAvatar.ts`: localX / Z, the planner velocity and the derived lean from the smoothed span velocity (not per-frame
  position deltas); the post-wall yaw limit (as player.ts `visYaw`; it snapped in a frame).
Wire (protocol 39, the plan's "only if gaitPhase still fails": receiving side alone left gaitPhase 0.11-0.28 cycle):
- `PlayerState.t`: the joiner's send clock (`sendClock`: wall clock, never closer to the last stamp than the sim time
  between them); the host maps it through a `ClockSync` (`coopHost.stateTime`) instead of stamping arrival time.
- `gph` (owner gait clock), `qs` / `hs` (CT stop blend and held pace), `mo` / `mt` (motion driver state and its time:
  the partner plays the owner's start / stop / turn / pivot; MotionDerive fired them at other moments or never),
  `ax` / `az` (the owner's acceleration: lean and the mocap stop slot fire as the owner's). Sent by both ends.
- Partner stance on the owner's curve (`crouchK` linear over crouchTime / standTime, `easeInOut`); it led the owner's
  crouch by ~0.1 s (stance row 16-32 cm -> 3.5 cm at the fitted lag).
`motionDerive.ts`, `moveState.ts`, `validate.ts`, `netSim` untouched. Allocation: the per-frame paths add only scalars
(the RigPose literal already existed); the sender's `gw` object is per 20 Hz message, like the message itself.

## Files
src/net/interp.ts, src/net/remoteAvatar.ts, src/net/coopHost.ts, src/net/coopClient.ts, src/net/protocol.ts,
tests/partnerAnim.test.ts (new), PROTOCOL_VERSION asserts in tests/{net, coopWalkFixes, hangDownNet, jammer,
jammerFixes, moveState, poseParity, rejoin, sectorLampSync, sectorStep3}.test.ts, changes/feature-afp-af6.md.

## Numbers (anim-audit `--remote`, E2E_GPU=1, desktop lanes, 60 Hz; "clean" / `E2E_NETSIM=typical`)
Audit worst poseError cm (bar 10; wall 20), before -> after (run `acc`, 3d7d1d94; raw dumps test-results/af6/acc-*):

| row | before clean | before netsim | after clean | after netsim | after, fitted lag + owner stalls excluded (clean / netsim) |
| --- | --- | --- | --- | --- | --- |
| stand2 | 36.3 | 18.3 | 9.0 | 9.2 | 5.0 / 5.4 |
| stand4 | 28.3 | 29.3 | 11.7 | 34.7 | 9.2 / 11.0 |
| stand6 | 34.7 | 36.2 | 12.1 | 24.6 | 9.7 / 11.3 |
| crouch3 | 20.6 | 35.5 | 15.9 (settled ankle) | 11.7 | 8.2 / 6.4 |
| stopidle | 27.7 | 22.7 | 6.6 | 15.4 | 3.6 / 6.7 |
| stance | 20.2 | 19.7 | 18.9 | 39.6 | 3.5 / 3.6 |
| wall | 36.4 | 42.1 | 33.1 | 46.8 | 21.0 / 31.5 |

- pops @60 (before clean stand4 12, stand6 21, ramp 17, wall 10): after clean 0 / 0 / 2 / 0 on stand2 / 4 / 6 / crouch3,
  stopidle 0, wall 4; netsim stand4 2, stand6 6, wall 7 (the netsim pops sit on owner-page stalls, below).
- gaitPhase worst / median (cycle; bar < 0.1 / < 0.05): before 0.24-0.50 / 0.19-0.44; after clean 0.03-0.12 / 0.021-0.030,
  netsim 0.04-0.24 / 0.020-0.036. Median met on every row; worst under 0.1 on 4 / 7 clean and 4 / 7 netsim rows.
- lodSkip 0 on every row. lowerBody (bar 10): still 15-45 cm (worst ankleR: the copy's foot planner plants on its own
  history; settled stance differs).
- Partner wrist second difference vs owner (root frame, cm / frame; bar owner + 1): met on every flat row (copy
  1.2-9.9 vs owner 2.3-14.3); stance 5.9 vs 5.6-7.5 (was 10.6 vs 5.8 before the stance curve); wall 15.5 vs 17.1.
- Harness notes: the audit's lag for rows with < 20 moving frames (stance, wall, strike, doorpeek) is a fixed 0.1 s, but
  the host now renders 0.13 s + latency behind, so those rows read 15-35 cm of pure timing; the last column fits the lag
  (mean gate error) offline. The desktop runs at 75-100% CPU: the owner page (B) stalls up to 0.46 s (ramp, stairs,
  stand4 / 6 netsim), its own track freezes then jumps, and the copy's smooth motion scores against it; the last column
  drops frames within 0.2 s of such a stall. Run-to-run spread is large (stand4 netsim 9.9 in the previous run, 34.7 in this one, both on an owner stall).

## Tests
tests one file at a time, all green: partnerAnim 9, net 72, netSim 7, coopFix 13, remoteAvatarSeed 8, coopWalkFixes 15,
hangDownNet 6, jammer 39, jammerFixes 10, moveState 16, poseParity 12, rejoin 12, sectorLampSync 11, sectorStep3 7,
radioNet 21. `npx tsc --noEmit -p .` clean; eslint on the touched files clean.

## e2e
e2e-netmove, E2E_GPU=1, E2E_JOBS=1, desktop lane 2 (heavy2.lock, port 4192, CPU 37% at start) after a fresh build at
f5c48ae5 (protocol 39): pass, 161 s, 54 asserts, max joint error 7.6 cm over 22 compares, no console errors.
e2e-coop not run here (laptop, A6).

## Open items
- Bars not met: wall row (21 / 31.5 cm fitted, bar 20: the wall entry shows a ~20 cm upper-body offset decaying over
  0.3 s and the crouched side-on reversal differs); lowerBody on every flat row (foot planner history, outside AF6's
  files: characterRig / footPlanner); stairs under netsim (33.5 cm: the copy's body dips a step lower, a different foot
  plant); gaitPhase worst over 0.1 on a few rows; pops on rows with owner stalls. Rerun on the laptop (unloaded) before
  judging: the desktop numbers carry owner-page stalls.
- anim-audit: rows with < 20 moving frames should fit the lag (or default to HOST_INTERP_DELAY 0.13), not 0.1.
- Laptop: e2e-coop + e2e-netmove on the pushed head (A6), and a remote audit there.

## Changelog
changes/feature-afp-af6.md: "Co-op partner moves like its owner" (minor, PROTOCOL_VERSION 39).
