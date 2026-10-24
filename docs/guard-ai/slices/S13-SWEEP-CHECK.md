# S13 sweep fix - check (Opus, read-only)

Reviewed `git diff 0d97f94c 1d99012a` (branch `feature/guard-ai-sweep`), against `S13-SWEEP-FIX.md` and `S28.md` Train 45.

## Verdict: PASS (no broken or wrong behaviour), with two follow-ups the next laptop run needs (findings 1 and 2)

## Checks run
- `npx vitest run tests/responseWiring.test.ts`: 19/19 pass.
- `npx vitest run tests/lockedDoorPath.test.ts`: 10/10 pass.
- Scratch probes (scratchpad only, nothing in the worktree): the warehouseOps runtime grid (`tests/helpers/runtimeNav.ts`,
  origin (-24, -26), cell 0.5, 3 layers) round the leader, the straddle cells, the guard spawns.

## Findings

### 1. Root cause: probed, not shown. The blocked-cell freeze is unlikely here
- The grid round the leader: the facade margin is rows z -18.5..-17.5 (blocked, x 6..10.5), door 5 is open cells at
  x 10.5..11.5, and row z -19..-18.5 is walkable. The diag's z -18.5 is rounded to 0.1 m and sits exactly on that cell
  boundary: z in [-18.55, -18.5) is the walkable cell (8.75, -18.75), z in [-18.5, -18.45) the blocked one (probed both).
- `tryMove` never lets a guard step from a walkable cell into a blocked one, and guards are only placed elsewhere by
  `holdAt` (a seized body), the co-op hold feed, spawns, link ends and closures. None applies at (8.8, -18.5): no door
  closure there (door 5's ends at its jambs, x 10.5), no link, the team spawns at the reinforce points (5, -25), (8, -25),
  both walkable, and the e2e player only hides. So he was most likely in the walkable row, pressed against the margin's
  edge. In that case `outward` never runs and only the stall rule changes anything.
- Team 1 members on team 0's point 0 is not a good fit: the leader stands 8 m from p0 (3.6, -12.3), on the first leg of
  his route (east to door 5). A jam at door 5 or on the facade row is a better fit. Per S28 Train 45, team 1 now leaves
  through door 5 and walks west along this facade row to p2 (-6.5, -19.6), head-on to team 0's leader. The diag line
  cannot settle it. The new diag fields (cell walkable, route length) will.
- Coverage: the stall rule covers any hold where the leader stays within 1 m for 5 s, then 5 s more. It does not cover a
  leader who shuffles more than 1 m at a jam (S20 sidestep, squeeze and back, a door wait and retry): the anchor resets
  each time and progress towards the point is never measured. A "distance to the point not reduced in N s" or a per-point
  time budget would cover both. Not needed if the next run shows a plain hold.

### 2. The e2e can pass with the leader still frozen
- `next()` on a skip counts in `visited`, and the S13 assert is `visited >= 1 && moved > 2` (moved was already 9.3 m). Two
  stalls (about 10 s) give `visited` 1 even if the leader never moves again, so a green S13 does not show which fix helped,
  or whether either did. In this layout the next point p1 (10.5, -21.0) is 2.8 m away across open yard, so a skip most
  likely leads to a real look there. Still, the run cannot tell.
- Wanted: the assert on `visited - skipped >= 1`, or `skipped` / `stallN` logged on a pass too (the diag only prints on a
  failure).

### 3. The tryMove unstick: safe enough, one known hole
- Guards are kinematic (`pos` written directly; no character controller), so `tryMove` + `doorStep` is the only gate.
- Held by the change:
  - A shut leaf (locked or not) is still refused by `doorStep` before the cell test.
  - Off the map: `c < 0` is refused.
  - Another blocked cell: refused (`c === cur` only).
  - Storeys: `nearestWalkable` with `pos.y` weighs height ((dh / 0.5)^2), so the same storey wins within ring 2.
  - A lock closure (S28) or a sector seal shutting on a guard in the doorway: he may be pointed across the shut leaf.
    `doorStep` refuses it, so he stays frozen, as before. That is no regression.
- The hole (already in the report's risks), now made concrete:
  - `outward` takes its target from `nearestWalkable`'s ring order. On a tie it always picks the -z row first, then -x,
    whichever side of the wall he stands on.
  - A blocked cell with walkable cells on both sides straddles the blocker's plane. warehouseOps has 12 such cells: NS
    only, e.g. the 0.1 m thick, 2.2 m high panel at (-13.5, -21.2), cells x -14.25..-12.75 at z -21.25.
  - A guard in the north half of one walks south through it. `findPath` starts from the same cell, so his route agrees.
  - It is reachable only after something puts him in a blocked cell (a seized body released, a spawn, the co-op hold feed),
    so it is rare.
  - Hardening, if wanted: pick the walkable 8-neighbour whose centre is nearest his actual position, in metres, not by
    ring order.
- Ledges: the existing `!isWalkable(cur)` branch takes a step from a blocked cell into any walkable cell with no height
  check. Moving inside the cell widens that hole a little; the same-storey target keeps it unlikely. Not new.
- Guards legitimately in a blocked cell:
  - Cover spots, posts and link transitions sit on walkable cells (links run in `linkStep`, outside `move`).
  - A ragdoll or carried body does not run `move`.
  - One warehouseOps guard spawn, (14, 0, 9.5), stands in a blocked margin cell: its nearest walkable cell is (14.25,
    9.25), on the same side. Before, he froze until one step crossed the edge; now he walks out. That is a gain.

### 4. Allocation, sweep logic, co-op
- Allocation:
  - `outward`: a ring-2 scan, `centerInto` into the reused `outP`. It runs only while the guard stands in a blocked cell
    (up to 3 `tryMove` calls a step).
  - The stall bookkeeping is scalars.
  - `routePath.length = 0` does not allocate.
- Stall logic:
  - Dwelling is not a stall: `lead` at the point clears the anchor and the clock.
  - The sweep has no peek.
  - Combat ends the sweep (`tick`: `sweeping` false), and `begin` calls `unstall`.
  - A change of leader moves the anchor more than 1 m, which resets it.
  - The first stall's replan is one `findPath` (3000) per 5 s at most.
  - A door swing or a short squeeze is under 5 s. A jam of 10 s or more skips the point, as designed.
  - A truly frozen leader skips every point, one every 10 s, forever. That is harmless (he stands either way), but it
    inflates `visited` (finding 2).
- Co-op: the AI and the stall run where the grid is (host or solo). No wire field, no `PROTOCOL_VERSION` change.

## Files
- Reviewed: `src/ai/enemy.ts` (`sweepStep`, `outward`, `tryMove`), `src/ai/sweepTeam.ts`, `src/ai/navGrid.ts`
  (`centerInto`), `src/ai/gear.ts` (`SWEEP`), `scripts/e2e-sectorops.mjs` (S13 diag), `tests/responseWiring.test.ts`,
  `tests/lockedDoorPath.test.ts`, `changes/feature-guard-ai-sweep.md`.
- Written: this file only.
