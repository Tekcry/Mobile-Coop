# S24 e2e-levels triage - Opus triage agent (laptop), 2026-10-24

Failure (laptop run `20261023T183353-night-shift-guard-ai-1ae5e211-ec14`, bisected: master 5d1e8e3e and S23 1f97efbf
pass, S24 1ae5e211 and everything stacked on it fail): `scripts/e2e-levels.mjs:95` "a runner climbs the rack ladder to the
player (0.0 -> 0.02 m in 48.00 sim s of 48 s budget, not done: state idle, links 0 ...)".

## Cause
The scenario clears the manager (`em.clear()` -> `intruders.clear()`: no intruder known), teleports the player to the
rack top and spawns a runner with `em.spawn('runner', floor, true, 0)` (3rd arg `alerted`). S23: alerted, out of sight,
no shared lkp -> `Enemy.decide` went for `t.feet` (the A105 wallhack). S24 (A148, `INTRUDERS.noFeet`):
`known = knownSpot(t)` (`src/ai/enemy.ts` ~2604) -> `huntPos()` null (hunt -1) -> no own sighting, no stimulus -> his own
position. He chases his own feet, never moves, drops to searching round his own spot after `ALERT.lostSight` (12 s),
then calm (`state idle`).

Two parts:
1. **Test, by design.** S24.md "e2e: Tests that change by design" names exactly this (an alerted spawn with no sighting
   then a reach assert relied on A105) and says retune it. e2e-levels was missed. Giving the runner the nearest player's
   real position (the triage prompt's hypothesis) would reopen the A148 / G139 wallhack ("Nobody walks to a player's
   real position without having seen or located him"), so it is not done.
2. **Real game gap (fixed in src).** `EnemyManager.spawn(.., alerted = true)` (`src/ai/enemyManager.ts` spawn) only
   called `e.alert()`: the guard got no intruder even when command knew of one. Callers that hit it: Mission's pressure
   reinforcements (`src/game/modes/missionMode.ts:108`), Clear's alarm squads (`src/game/modes/clearMode.ts:96/136`),
   `reinforce` (it tells `alarmHunt` after, -1 when the raiser had none). Before S24 they used the shared lkp; after S24
   they stood at the spawn point even with a valid last known position.

## Fix
- `src/ai/enemyManager.ts`: `spawn(.., true)` calls `sendIn(e)`: `e.tell(commandHunt())` then `e.alert()` (told before
  combat, so `onLevel('alert')` takes it as `pendingHunt` and his contact names it). `commandHunt()` = `alarmHunt` while
  its slot is valid, else `intruders.freshest` (A150, as the response teams), else -1 (nobody known: he still stands,
  A148). Coordinated reinforcements are unchanged (spawned calm, `joinAsReinforcement` tells `alarmHunt`).
- `scripts/e2e-levels.mjs` chase: before the spawn the player is reported seen where he stands
  (`em.ctx.reportSighting` with a stand-in ref carrying the host's id, the S24-FIX e2e-sectorops pattern); the runner
  spawned alerted is sent in on that slot and chases its last known position across the ladder on `flowOf(slot)`. Both
  asserts (up, down) unchanged; the not-done message now prints `slot / hunt`. The "down a ladder" case uses the same
  chase function (fresh `em.clear()`, report at the floor spot, runner on the rack top): same cause, same fix.
- `docs/systems/ai.md`: the S24 paragraph names the spawned-alerted rule.

## Tests
- New in `tests/twoIntruders.test.ts`: (i) spawned alerted with nothing known: hunt -1, stands at his spot (A148); one
  player seen, then he walks on: hunts slot 0 and goes for the seen spot (`lkpOf(0)`), not the feet. (i2) two
  intruders: only A known -> A (B never named); no alarm -> the freshest (B); alarm raised by A's hunter -> A; A
  forgotten -> B. Both fail with the `tell` removed from `sendIn` (checked).
- `npx vitest run` twoIntruders, intruders, coopPerception, targetPick, enemyManagerDespawn, responseWiring: 53 / 53;
  squadWiring, radioWiring, alarmCall, sweep, deviceTrip, coopGuardAi, hearing: 106 / 106.
- `npx tsc --noEmit -p .` clean; eslint on enemyManager.ts and twoIntruders.test.ts clean; `node --check` e2e-levels OK.
- No local e2e (laptop rules). Queued: see below.

## Open items
- Mission's pressure reinforcements while hacking before any shot or sighting (nothing known) stand at their spawn
  (A148 by design; before S24 they ran to the player's feet). Michael's call if Mission (parked) should differ.
- `scripts/e2e-enemies.mjs` spawns alerted guards (`t.spawn(.., true)` :135, :156, :276-277); if any of those blocks
  asserts a reach with no sighting it may need the same retune (not checked: not in this queue set).
- `clear()` drops the intruder positions but keeps each slot's built flow field; the next report rebuilds it on a move
  of a cell (after `FLOW_MIN`), so a stale field can steer for up to 0.5 s. Polish only.

## Queue
Set `s24-levels-fix`, suites `e2e-levels e2e-stealth-ai e2e-coop`, on the fix commit (request id below).
