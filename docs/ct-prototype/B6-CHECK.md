# B6 check (commit 97a6fdab) - read only review

Verdict: PASS (no blockers).

## Blockers
None.

## What was checked
- Completable by two: the host times both hacks on its own `pair.clock` (`scanners.ts` scanStep), started when the host processes each press, so client network delay only shifts the start. Window 1.5 s after a 2 s hack means the partner may start up to 1.5 s after the first; achievable with the radio prompt.
- No stuck state: every fail path calls `scanReset` (all phases, who, t, at). A downed or departed hacker aborts the hack and resets both; a stale READY cannot count after a reset. A READY panel with nobody started times out in 1.5 s and resets. Door flag set once on `open`; a bay restart deletes the flag (`courseState.restart`), and `stepScan` re-arms the pair when `has(flag)` is false.
- Health cost cannot repeat per frame: a fail resets both panels, and a new hack needs a new press plus 2 s. `scanDamage` floors at 1 HP; dead player gets 0.
- Client cannot hack away from a panel: `scanPress` checks alive, within 2 m and |y|<1.5 on the host, and the hack aborts if the holder leaves reach. Protocol 21 `sc` is clamped per index in `secWire`.
- No hot-path allocation in `scanStep` / `stepScan` (results written into a reused object).

## Polish
1. `ctDevices.ts` ~280: `health?.hp ?? 100` fallback would skip the floor if a target had no `health`; both player targets have it today.
2. A player who finishes first while the partner never starts pays 10 HP after 1.5 s; by design, but harsh for a solo explorer. Radio line covers it.
3. `RemotePlayer.damageMul` could break the 1 HP floor if ever above 1; not so today.
