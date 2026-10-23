status: done feature/stealth-pays-client-intel 8bbd6d54

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

## Report (Night Shift | Cloud Builder 1, 2026-10-23): BLOCKED, needs wire data (brief step 3)
Nothing built; `feature/stealth-pays-client-intel` not pushed (no commit past d228ce59).
Where the slots come from: `g.world.map.sectors[i].guards` (`MapDef.sectors`, `src/world/mapDef.ts:114`), handed to
`SectorRun` at `src/game/modes/sectorMode.ts:180`, queued per section at `:578`. Reachable on the client (same map).
Why the host's `e.info` cannot be rebuilt from map data alone:
1. Revived guards: a guard waking a KO'd guard with info (`enemy.ts:2190` -> `enemyManager.ts:1203-1209`) builds a new
   `Enemy` at the body's position (`b.pos.clone()`) with a new id (`enemy.ts:193,199`); `inherit` copies `info`
   (`enemy.ts:809`). Nothing on the wire links old id to new (`onRevived`, `stealthSystems.ts:198`, only calls
   `mode.onEnemyJoined`), so the client builds a fresh puppet where the body lay (often carried, rarely within
   `GUARD_INFO_NEAR` 1.5 m of the slot) -> null while the host keeps the info. Sector Ops is coordinated
   (`enemyManager.ts:207`), so revives happen. Marlow Yard has the same hole today.
2. Client reload mid-section: puppets are rebuilt at current positions (`coopClient.ts:322-326`), so a patrolling guard
   with info is far from his slot -> null. Rejoin is supported (`session.ts:185`, `coopHost.ts:390`).
Checked fine: reinforcements carry no info (`sectorMode.ts:822`, `sectorStage.ts:204`); fresh spawns snap to the nearest
nav cell (`enemyManager.ts:1475-1477`, computable); late `fill()` spawns are seen within one send (`coopHost.ts:1205-1212`).
If built later anyway: limit the client lookup to the live section (two sections' info slots within 1.5 m would mismatch).
Side findings: (a) no Sector slot on this base has `info` yet (grep campus*.ts, warehouse*.ts, campusSectors.ts,
campusS4/S5Data.ts), so the "real campusOps slot" test has nothing to test; (b) existing mismatch in both modes: when the
host interrogates a guard (or a solo spend on the host), the client's puppet is never told and can still offer
INTERROGATE on a spent guard.
Proposed fix (lead / Michael call): one wire field, e.g. an `info` bit in `EnemyState` + `PROTOCOL_VERSION` bump and its
tests; covers revive, reload and spent in both modes.
Tests (baseline only): sectorIntelCode + intelPartB + net 79 / 79 with --maxWorkers=2.

## Answer (lead, Night Shift | Player Build, 2026-10-23 ~21:35): go with one wire field, host-authoritative
Your report is right (revive, reload, spent). Reshape:
- Wire: an optional `EnemyState` field `in` (1 = this guard has unspent intel; absent otherwise, 0 bytes for most guards),
  written by the host from `e.info` and the spent state, parsed / clamped like the other optional fields, in
  `src/net/protocol.ts` + the host writer in `src/net/coopHost.ts`. Do NOT use `al` bits (guard-models is widening `al`
  on another branch) and do NOT touch the `PROTOCOL_VERSION` line (the train build bumps it; if a test on this base
  asserts the number, leave it, the train fixes it). Note "wire change" in the changelog fragment.
- Client: `EnemyPuppet` offers INTERROGATE when the snapshot's `in` is set (drop the infoAtSpawn-only gate for that
  decision; keep `infoAtSpawn` only if something still needs the info content on the client). The client's interrogate
  goes to the host as today; the host resolves the code from its own `e.info` (both modes: Marlow Yard course flags and
  Sector Ops keypads) and marks it spent, so the next snapshot clears `in` on both screens. This also fixes the spent
  mismatch you found, a revived guard (inherit keeps info on the host) and a reload.
- Files: src/net/protocol.ts, src/net/coopHost.ts, src/net/enemyPuppet.ts, src/net/coopClient.ts (only if needed),
  tests/sectorIntelClient.test.ts (new: parse round trip of `in`, host writer sets / clears it for info / spent / no info,
  puppet offer follows the flag), changes/feature-stealth-pays-client-intel.md. Base and branch unchanged
  (d228ce59 -> feature/stealth-pays-client-intel).
- Run tsc, eslint on the files, `npx vitest run tests/sectorIntelClient.test.ts tests/sectorIntelCode.test.ts tests/intelPartB.test.ts tests/net.test.ts`.

## Report 2 (Night Shift | Cloud Builder 1, 2026-10-23 ~21:40): done, feature/stealth-pays-client-intel 8bbd6d54
Built per the Answer (one commit on d228ce59):
- `src/net/protocol.ts`: `EnemyState.in?: 1`; parse keeps it only when exactly 1 (absent otherwise, 0 bytes);
  `markIntel(s, has)` is the host writer (set / delete). `PROTOCOL_VERSION` untouched (no test on this base asserts it).
- `src/net/coopHost.ts` snapshot(): `enemies.push(markIntel(es, hasInfo(e)))` - unspent `e.info` (Marlow course and
  Sector slots, inherited by a revive); the host's `takeInfo` (its own or the client's interrogation) clears it.
- `src/net/enemyPuppet.ts`: `spawnInfo` (the lines he says) + `setIntel(on)`: on the flag's rise `info = spawnInfo ??
  HOST_INFO`, on a clear `info = null`; a local spend is not undone while the flag is still set (only a rise re-offers).
- `src/net/coopClient.ts`: `np.spawnInfo = infoAtSpawn(course squads, ...)` (kept: Marlow Yard's local subtitle lines,
  byte-identical there) and `p.setIntel(e.in === 1)` on each snapshot.
Deviations (2 files beyond the Answer's list, both needed for the flag-only case; review them):
- `src/ai/guardInfo.ts` (on the original list): `HOST_INFO` frozen sentinel with no lines; `hasInfo` true for it;
  `takeInfo` returns null for it (the client says nothing; the host's intel feed answers).
- `src/game/takedownController.ts:475` (1 line): "Interrogated: nothing new" only when `!g.puppet` - else every
  Sector Ops client interrogation printed it beside the host's intel lines.
Tests: tsc clean; eslint clean on the 7 files. vitest sectorIntelClient + sectorIntelCode + intelPartB + net:
79 -> 87 / 87 (new file 8 tests: wire round trip + bad values dropped, 0-byte cost, host writer info / spent / none,
puppet offer Marlow / no flag / HOST_INFO / host spend / re-rise). Also green: guardInfo, coopTorches and the 7 test files
importing the takedown controller (306 / 306).
Note for e2e (lead): e2e-coop / the Marlow interrogation block should be unchanged; a Sector Ops client interrogation
now works (no e2e covers it yet). Any test that deep-equals a whole snapshot enemy with an info guard would now see `in`.
