# S24 e2e-coop "two intruders" triage (Opus, 2026-10-23/24) - DONE

Failure (laptop + desktop, deterministic, also on S26 d30601a2): `S24: no pair guard sees a player during the hide
(setup: hide spots walled off)`, `seen [0,0,467,226]` (rerun 477 / 241; an earlier run 474 / 0), `own[2] 0.74`,
`kOwn` all 0, `wrong` all 0, spots host [-14.25, 5.25], client [9, 3]; client hide snapped [9.25, -10.25], host hide
[0.25, -13.75] (dispatch).

## Verdict: test staging bug (no game change)
Guards 2 and 3 really see the hidden client: no sight through a wall, and not the S24 LKP logic.
- **Who they see.** In combat `pickTarget` (`src/ai/targetPick.ts:65-71`) takes any player in sight and `takeSighting`
  (`src/ai/enemy.ts:1255`) moves the guard's hunt to that player's slot. `wrong` stayed 0 and `hunts` stayed [0,0,1,1],
  so pair 2 saw the client, not the host.
- **From where.** Pair 2's own cover picks against the client's spot (9, 3) are in the service corridor, on the far side
  of the z -8.8 wall (`src/world/maps/warehouse.ts:249`). `pickCover` (`src/ai/enemy.ts:2957`) scores
  `dMe + |dT - 14| x 0.5` by straight-line distance and needs only the wall between the cover and the LKP. The
  corridor's north wall face (normal toward (9, 3), dT about 12.6) is about 3.6 m in a straight line from (8, -6), so
  it wins, although the walk there goes through the x 2..3.6 gap (about 12 m). The squad roles' `scoreCover`
  (`src/ai/squadRoles.ts:318`) pick the same corridor points for overwatch, flank and reporter. A probe over the real
  cover list, from (8, -6) and (9.2, -6):
  - The best 6 `pickCover` spots are all at x 6..11.8, z -9.5. Each sees the hide [9.25, -10.25] from 1-2 m, and none
    has a line to (9, 3).
  - The top role picks are the same spots.

  Pair 2 heads there at combat entry (cover-first) and sees the client as soon as he arrives. `own[2] 0.74` is that
  guard reaching the client's refreshed LKP, the hide itself.
- **S24 logic is fine.** `kOwn` is 0 throughout: every guard works from his own player's LKP. `kOther` is 23.36 (> 10)
  and `wrong` is 0.
- **The host's dispatch spot was not walled off either.** Corridor cover (6.01, -9.5) and (5.3, -10.2) see
  [0.25, -13.75] through the glazed dispatch window (clear glass passes sight, G45). The host was not seen only
  because pair 2 sat further east beside the client.

## Fix (scripts/e2e-coop.mjs only)
Both hides moved out through the south facade into the dark yard lane: host [-3.75, -24.75], client [8.75, -24.75]
(nav cells, snapped to themselves). A SightWorld probe over every floor-level walkable cell, eye at 1.55 m and 1.0 m,
targets at 1.3 m and 1.6 m, door leaves left out (worst case), found 0 cells inside the building with a line to either
spot. Only yard cells see them, and no pair guard reaches the yard in 10 s: it is about 30 m by path through the
workshop. The S24 LKPs, the pairs, the asserts and their thresholds are unchanged. The block comment records why the
spots moved.

## Tests
- Throwaway vitest probes (SightWorld + `runtimeNav` + `coverPointsFromSegments` + `scoreCover`) confirmed each point
  above. Deleted, not committed.
- `node --check scripts/e2e-coop.mjs`: OK. No `src/` change, so no tsc run.
- Laptop rerun queued on 0a42c6b5 (set `s24-coop-fix`, suite `e2e-coop`, jobs 2): request `20261023T130628-night-shift-guard-ai-0a42c6b5-f67c`.

## Open item (not fixed: pre-existing, prototype rule)
`pickCover` and `scoreCover` choose cover by straight-line distance and need only a wall between the cover and the
LKP. Neither checks that the guard is on the cover's side of the wall, or that the spot has a peek or fire line to
the LKP. So a guard that sees a player 9 m away can detour about 12 m through a doorway to stand behind a full wall
from which he can never engage. This dates from S8 / older (not S24). It is a candidate for the guard-ai polish list
or a later tactics slice: score cover by path length, or skip full-height cover with no line to the LKP from either
end.
