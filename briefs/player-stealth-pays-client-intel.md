status: claimed Night Shift | Cloud Builder 1 2026-10-23T20:14+1100

# Brief: stealth-pays client-intel - the Sector Ops co-op client can interrogate for intel (Player Build)

Lead: Night Shift | Player Build, 2026-10-23 ~20:15. Small co-op correctness fix, no wire change, unit tests only.

## The gap
In Marlow Yard the client's guard puppet gets its INTERROGATE info from the map slot it appeared at, with no wire data:
`src/net/coopClient.ts` ~337 `np.info = infoAtSpawn(g.world.layout.course?.squads, e.x, e.z);` (`infoAtSpawn`:
`src/ai/guardInfo.ts:45-59`, nearest slot with `info` within GUARD_INFO_NEAR). Sector Ops guards get `e.info` on the
host only (`src/game/modes/sectorMode.ts` ~756, `if (p.slot.info) e.info = p.slot.info;`, stealth-pays S2), so a
Sector Ops client never sees INTERROGATE on a guard that has `info` (`src/net/enemyPuppet.ts` ~67 / ~311 offer it only
when `info` is set). Result: half the team cannot use interrogation intel in Sector Ops.

## Base and branch
- Base `origin/feature/stealth-pays` at `d228ce59` (PR #249: it adds the Sector spawn info). New branch
  `feature/stealth-pays-client-intel`; push there only. No master merge, no rebase. `npm ci` once if needed.

## Files (only these)
- `src/net/coopClient.ts` (the one `np.info = ...` line, plus at most a small helper call)
- `src/ai/guardInfo.ts` (a pure helper if needed, Babylon-free)
- `tests/sectorIntelClient.test.ts` (new)
- `changes/feature-stealth-pays-client-intel.md` (new fragment, one line; see `changes/README.md`)

## Build
1. Find where the Sector Ops guard slots (`x`, `z`, `info`) of the live map are reachable on the client WITHOUT wire
   data: start from what `sectorMode.ts` iterates at spawn (`p.slot`, ~740-770) back to its source (the map's sector
   defs / layout). Both sides load the same map, as in Marlow Yard.
2. On the client: when the course lookup returns null, look the puppet up in the Sector slots the same way
   (`infoAtSpawn`-style nearest slot with `info`, same radius). Keep Marlow Yard behaviour byte-identical.
3. If a guard's spawn point is not near its slot (reinforcements, guards spawned elsewhere) the lookup returns null:
   fine, same as the host only when the host also has no info for it. If the host's `e.info` cannot be reproduced from
   map data alone (e.g. info set on reinforcements), STOP: `status: blocked needs wire data` with the evidence.
4. Test: the pure lookup with a literal small slot table (Sector shape) - nearest within radius returns info, outside
   returns null, Marlow course squads still win when present; plus, if cheap, the real campusOps map data: at least one
   slot with `info` resolves at its own x / z.

## Run (unit tests only)
`npx tsc --noEmit -p .`; `npx eslint src/net/coopClient.ts src/ai/guardInfo.ts tests/sectorIntelClient.test.ts`;
`npx vitest run tests/sectorIntelClient.test.ts tests/sectorIntelCode.test.ts tests/intelPartB.test.ts tests/net.test.ts`.
Rules: hot paths do not allocate (the lookup runs once per puppet creation: fine); `hyp2`, never `Math.hypot`;
import Babylon only through `src/core/babylon.ts` (not needed here); `src/net` is never imported by single player.

## Done when
tsc / eslint clean, the 4 vitest files pass, `git diff --stat d228ce59` = only the files above. Report at the end of
this brief (where the slots come from, what changed, test counts, deviations), commit trailer
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, then `status: done feature/stealth-pays-client-intel <sha>`.
