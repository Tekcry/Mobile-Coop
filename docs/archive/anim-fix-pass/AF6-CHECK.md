# AF6 - checker (fresh Opus, read-only review of b1de49f5 vs origin/feature/coop-walk-fixes)

## Verdict: PASS

No required fixes. Laptop e2e-coop + e2e-netmove on b1de49f5 still owed (A6) before merge.

## Is the partner better for a player? Yes.
Against Michael's "doesnt match, more jumpy": clean-net poseError drops on every row (stand 28-36 -> 9-12 cm, crouch3
20.6 -> 15.9, stopidle 27.7 -> 6.6); pops at 60 Hz go from 12-21 per row to 0-2 on flat rows; gaitPhase median from
0.19-0.44 to 0.02-0.04 cycle (the stride now runs on the owner's clock); start / stop / turn and the CT stop hold are the
owner's (mo / mt / qs / hs on the wire). Three netsim rows read worse (stand4 34.7 vs 29.3, stance 39.6 vs 19.7, wall 46.8
vs 42.1), but each sits on an owner-page stall at 75-100% desktop CPU or on the audit's fixed 0.1 s lag for short rows;
with the lag fitted and stalls excluded every row is better than before. Raw dumps: test-results/af6/acc-* (desktop,
not in git). Not unloaded-verified: rerun the remote audit on the laptop.

## Review
- Files: src/net/{interp, remoteAvatar, coopHost, coopClient, protocol}.ts, tests/partnerAnim.test.ts, PROTOCOL_VERSION
  asserts in 11 net tests, scripts/anim-audit.mjs (AF0's remote wait, taken from AF0), report, changelog. All coop code in
  src/net (dynamic-import side); no edits to characterRig / footPlanner / motionDerive.
- Wire: PlayerState t / gph / qs / hs / mo / mt / ax / az added (protocol.ts:79-96), parsed and clamped in `playerState`
  (protocol.ts:318-323; pairs mo+mt and ax+az required together), sent by both ends (coopHost snapshot, coopClient pstate),
  read by RemoteAvatar with undefined fallbacks. validate.ts not needed: the fields are pose-only and clamped. Every
  `expect(PROTOCOL_VERSION)` in tests is 39; old peers refused by session.ts:149 (`msg.v !== PROTOCOL_VERSION`).
- Host times joiner states by their send clock through a per-joiner ClockSync, kept monotonic (coopHost.ts:550-562); a
  forged `t` can only skew that joiner's own avatar; hit checks use `r.feet` / `this.time`, not the buffer.
- Hot path: interp.ts sample / spanVel / ExtrapBlend use a preallocated scratch; remoteAvatar adds scalars only (the
  RigPose literal at remoteAvatar.ts:685 predates AF6). The per-joiner Map entry and the per-message `gw` object are
  per-join / per-20 Hz message. hyp2 used; no Math.hypot.
- Standing / OFF: attached and scripted modes keep the old per-frame deltas (`free` gate, remoteAvatar.ts:476); no state
  with undefined gph / mo changes behaviour beyond the receiving-side smoothing.

## Known misses (polish, owners named)
- Wall row 21 / 31.5 cm fitted vs 20 (wall-entry upper-body offset decaying over 0.3 s, crouched side-on reversal):
  follow-up on characterRig wall path (group-2 follow-up / AF2 owner), recheck on the laptop first.
- lowerBody 15-45 cm vs 10 on flat rows: the copy's foot planner plants on its own history (footPlanner.ts, AF1's file;
  characterRig.ts, AF2's). Not worse than before (53.7 / 45.1).
- gaitPhase worst > 0.1 cycle on 3 / 7 rows; netsim stairs 33.5 cm (different foot plant).
- anim-audit: rows with < 20 moving frames should fit the lag or default to HOST_INTERP_DELAY 0.13, not 0.1 (AF0 harness).
- Stale test titles say "is 37 / 17 / 24" while asserting 39: tests/coopWalkFixes.test.ts:240, hangDownNet.test.ts:14,
  jammerFixes.test.ts:205, moveState.test.ts:115, net.test.ts:676 / 722, poseParity.test.ts:49, sectorLampSync.test.ts:53.
- Client-side view of the host is unaudited (PLAN polish list).

## Tests (checker, one file at a time, in the afp-af6 worktree)
partnerAnim 9/9, net 72/72, netSim 7/7, coopFix 13/13, coopWalkFixes 15/15, poseParity 12/12, remoteAvatarSeed 8/8.
`npx tsc --noEmit -p .` clean. No e2e run here (e2e-coop / netmove are the laptop's).
