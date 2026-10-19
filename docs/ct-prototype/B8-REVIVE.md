# B8 - revive and finish (2026-10-19)

## Built
1. **Revive (G126)**: a downed player gets a 30 s window; the partner revives with the existing hold-A revive point
   (2.5 s hold). At most 2 revives per mission (team total, per match). Past 30 s, or down with no revives left, the
   player is out until the next checkpoint; in the course that is the bay restart (the airlock needs both players), so
   being out restarts the bay after `RESTART_DELAY`. Both down still reloads the bay (unchanged `CourseState` rule).
   A checkpoint respawn stops the windows without using a revive. Countdown: the host writes the seconds left into the
   revive point's label (`Revive Name (23)`, sent with the items list once a second); the downed page shows
   `DOWN - revive in N s` (HUD `.hud-down-timer`), then `OUT - wait for the checkpoint`. A partner's revive in the
   course counts on the results (team and reviver).
2. **Station 8 final beat**: the held-console placeholder (`h-s8`, timed hold gate, door) is gone; the 3.5 m wall keeps
   an open doorway; the course ends when both stand in the lit exit zone (G138 rule unchanged, "Revive first" while
   one is down). The existing results course panel shows time, alarms and revives (no screen edit needed).
3. **B3 polish 1 fixed**: `CtDevices` re-arms a pass zone whose flag the course cleared (`rearmZones` in
   `game/jammer.ts`, called each step before the zone loop), so the station 3 door can reopen after a bay restart.
4. **Rope drawn (B7 stub)**: `game/ropeLine.ts`, two pooled thin boxes (hands to the lip, lip to the foot), built on
   first rope use, render only, no per-frame allocation. Shown on the holder's and the climber's pages.

## Numbers (starting values, G10)
Window 30 s, cap 2 per mission (`game/reviveClock.ts`); rope 3.5 cm thick, hands 0.95 m above the holder's feet.

## Files
New: `src/game/reviveClock.ts`, `src/game/ropeLine.ts`, `tests/reviveClock.test.ts`. Edited: `src/net/coopHost.ts`,
`src/net/coopClient.ts`, `src/ui/hud/hud.ts` (`setDownTimer`), `src/game/gameState.ts` (rope line hook),
`src/game/teamController.ts` (`partnerPos` public), `src/game/jammer.ts`, `src/game/ctDevices.ts`,
`src/world/maps/ctcourse.ts`, `tests/ctcourse.test.ts`, `scripts/e2e-ctcourse.mjs`.

No wire change: protocol stays 22.

## Stubs / not done
- No 50% heal on revive (full heal as before). Outside the course, "out" leaves the player down until the host's next
  checkpoint respawn (no other checkpoint hook).
- The client's countdown is the host's label, so it updates once a second and only while items sync.
- A third player's page (not in a rope move) sees no rope; the holder's offer before anyone takes it shows only on the
  holder's page. Rope hangs straight (no sag, no physics).
- Station 8's final throw (CT) is not built; the beat is walk through and both in the zone.

## Tests
Unit: `tests/reviveClock.test.ts` (window, expiry once, third down out, checkpoint / reset, two windows; zone re-arm),
`tests/ctcourse.test.ts` (station 8: no console / gate / door, open doorway, both-in end). E2E `e2e-ctcourse` station 8:
host downs the client, the client sees the countdown, the host's window is 15-30 s left (sim time) after 2.5 s, the host revives,
the countdown hides, 1 revive used; the course end summary has time and revives = 1.

## Results
`npm run check`: lint 0 errors, 152 files / 1710 tests pass (1 skipped), build ok.
E2E (port 4193, one runner, another session running e2e at the same time): smoke ok. e2e-ctcourse: 5 runs, none fully green. Failures in earlier stations under load, none in B8 code: station 3 "the pistol is drawn" (twice), station 5 "the client takes the hang-down", station 7 "the client offers a leg-up". One run reached station 8: no console ok, client down ok, the client HUD countdown ok, then failed my own assert "20-29 s left after 2.5 s" (29.5 s left: the host sim runs slower than wall time on software GL). The bound is now 15-30 s (sim time). Not yet seen green: the host revive inside the window, the countdown hiding, 1 revive used, the end summary (time, revives 1). Next: a solo e2e-ctcourse rerun on a quiet PC.

## Try it
Two tabs (first hosts): `?net=local&autostart=ctcourse&mode=course` (no URL param for the start bay; the lobby's bay choice sets it where offered).
Get downed (a partner's shot in the course), watch the countdown, revive with hold A; let it run past 30 s and the bay
restarts. At station 7 the rope now shows. At station 8 walk through the doorway and both stand in the green zone.
