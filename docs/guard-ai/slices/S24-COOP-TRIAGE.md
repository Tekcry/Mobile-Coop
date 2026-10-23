# S24 e2e-coop "two intruders" triage (Opus, 2026-10-23) - IN PROGRESS

Failure (desktop overflow, run + rerun, deterministic): `S24: no pair guard sees a player during the hide (setup: hide
spots walled off)`, `seen [0,0,474,0]` (first run 479), `own[2] 0.74`, spots host [-14.25, 5.25], client [9, 3], client
hide snapped [9.25, -10.25].

## Finding so far
- `own[i]` is the guard's closest approach to his **own player's last known position** (`em.lkpOf(mine)`), not to the
  hiding player. Guard index 2 reached the client's LKP (9, 3) within 0.74 m: that is S24 working (he advances on the
  LKP). He did not walk up to the hide spot (9.25, -10.25), which is 13 m south of the LKP behind the z -8.8 wall.
- The client hides in the service corridor (z -11 .. -8.8). The z -8.8 wall (`warehouse.ts:249`) has a gap at x 2 .. 3.6
  (and 18 .. 19.1). Pair 2 spawned at (8, -6) / (9.2, -6), 2.8 m north of that wall. Checking next: which line from pair
  2's reachable positions goes through the x 2 .. 3.6 gap down the corridor to the hide spot.
