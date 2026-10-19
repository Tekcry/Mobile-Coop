# B7 check (403b2871), read only

Verdict: PASS (no blockers).

## Blockers
None.

## What was traced
- Station 7 flow: top player stands on the 1 m thick wall top; hangPoint probes 0.4 / 0.7 / 1.0 m ahead, so from anywhere on the top facing the near edge it finds the drop. ropeRoom(4.4, ~0) = ok (2.2..6.0). Refusal at the real wall height does not fire.
- Climber: offer window (ropeReach 2.0, up 1.8..6.4) holds at 4.4 m; host check (checkTeamRequest rope) bounds the claimed foot to 1.6 m of the holder and 0.4 m height; climber height is its own and never trusted for anything but pose.
- Stranding: holder death / disconnect -> partnerPos or mate lookup null -> holder ends, climber slides after ropeLost 1.5 s; climber death -> end(true) clears override; B / Co-op from either -> slide; top-out sends pull, holder ends via ended(). Far-side stair gives a way back up.
- Co-op button at the edge: standing = rope, crouched = hang-down (prompt names both); a crouched mate below cannot hijack the holder's offer (needs |dy| < 0.4).
- No per-frame allocations in runRope / runRopeHold / idle (hp2, a, b, kin reused).

## Polish
1. coopHost.ts:603 - teamPairs entry stays after a climber slides because the holder was lost, or when the holder's offer timed out before tstart arrived (no hangEnd sent). Harmless (overwritten on the next rope or hang), but a stale pair lets a later `hangEnd` hit an old partner.
2. teamController.ts:677 - hangPoint (up to ~9 ray casts) now runs every idle frame for any standing player with a mate within 12 m (was crouched only). Not an allocation; consider probing only near an edge or every few frames.
3. teamController.ts:677 - any standing edge with a 2.2-6 m drop now offers a rope instead of the B4 throw (for example the station 5 roof facing the hatch). Harmless, but check no throw station sits at a drop.
4. ropeTop path (teamController.ts ~299): y rises to the spot before across starts at e = 0.4, so the climber clips the wall corner for a few frames. Cosmetic.
5. Lost `tstart` to the holder leaves the climber on the rope with the holder free; the climber slides after 1.5 s (safe).
