# jammer-fixes - brief

Job lead: Night Shift | Character Build (laptop). Branch `feature/jammer-fixes` in `C:/NightShift/Mobile-Coop-jammer-fixes`,
from master 4.48.0 (ea3399ed). A patch: fixes from the orchestrator's code review of PR #101 (marlow-jammer, 4.48.0).
Test runs for other job leads come first.

## The ask (orchestrator, 2026-10-22 ~08:40)
1. Medium: `ctDevices.ts` ~786-793: a jammed lamp relights from the jam-start `wasOn` even if a wall switch or an EMP
   turned its group off meanwhile (courselab: the host's groupOn then shuts the mains gate; the client lights the whole
   group - breaks light parity). Restore to the current switch / EMP state, not the jam-start state.
2. Medium: `courseMode.ts` ~471-476 + `courseState.ts` ~194: jamming courselab's mains lamp (`courselab.ts:53`,
   electric) opens `g-mains` without the switch, and each flicker toggles it. A jam must not count as the group being
   switched off for gates: read the switch state, not the lamp state.
3. Low-medium: the host re-checks the client's jam line of sight from the client's head (`ctDevices.ts` ~594-600) while
   the client aims from its camera eye (~535): "JAMMER READY" but nothing jams. Same point on both sides: the client's
   camera eye sent in the claim, with a tolerance.
4. Low: `gameAudio.ts:130`: `a.spatial()` (`audioEngine.ts:181`) allocates every frame while jammed; reuse one object.
5. Design: `CAMERA.irLight` applies to every camera (`security/camera.ts:67`), so in Sector Ops and missions a player
   the light meter shows hidden is seen at the fully-lit rate - against light and shadow, the core. Make IR a
   per-camera flag, on only for Marlow bay 3's camera (its use case), off by default. Michael can decide later where
   else he wants it.
Item 5 withdrawn (Michael, 2026-10-22, through the orchestrator): "Cameras should still work in the dark." Keep
`CAMERA.irLight` on every camera as it is; no per-camera flag. Note his decision in the PR body.
Tests for 1-3. Check, e2e-ctcourse and e2e-coop, then the full run, a PR (patch), tell the orchestrator.

## Assumed decisions (undo by telling the orchestrator)
- F3 (item 3): an eye claim beyond 1.5 m of the head (or without a clear head-to-eye line) falls back to the head
  check (the 4.48 rule) instead of refusing the jam, so a client whose camera is still blending into aim is not refused.
  Undo: refuse the claim instead (`jamOrigin` in `src/game/jammer.ts`).
- F2 (item 3): if the claim carries the client's eye, the `jam` message changes, so `PROTOCOL_VERSION` 26 -> 27, then 28 after #92 took 27 (merged master 4.51.1).

## Limits
CLAUDE.md hard rules (light parity; gameplay never reads graphics state; hot paths allocate nothing). Do not touch the
animation tracks' files. One implementer, one checker, one fix round.
