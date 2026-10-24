# AI5 built: response teams and fights with 4 players (Opus builder, 2026-10-24)

Branch `feature/guard-ai-coop4` (the main coop4 worktree), on b49daa0b (AI1-AI4). Brief: `docs/coop4/briefs/AI.md`
section 1 "AI5", A175-A179. Every rule is gated (A170: `players().length >= COOP4.from` 3); 1-2 players are today's
code path (identity test below).

## Built
- **A175 response size hook** (`src/ai/gear.ts`): `RESPONSE_N = { extraPerPlayer: 1, splitAt: 4 }`; pure
  `responseShape(stage, perStage, players, headroom, out: ResponseShape, over: ResponseShapeOverride | null = null):
  ResponseShape` (`{ teams, size }`); `responseTeamSize(k, size, teams)` (even split, the first teams one more);
  types `ResponseShape`, `ResponseShapeOverride { extraPerPlayer?, splitAt? }`. Rule: `size = perStage + (players - 2)
  x extraPerPlayer` from 3 players, the extras clamped to `headroom - perStage` (the base is never cut: below the cap
  today's guards still wait for room in `pending`, so 3-4 players never get fewer than 2 would); `teams = 2` when
  `size >= splitAt` (3+ players), else 1; 0 when stage < 1 (as `responseTeam`). 1-2 players: `perStage`, 1 team, no
  clamp (today). Manager wrappers in `src/ai/enemyManager.ts`: `setResponseShape(over)` (section load) and
  `shapeResponse(stage, perStage, out)` (reads `players().length`, `maxAlive - alive`, the stored override).
- **AI4 handover risk closed (A174 "a team shares one")**: `joinReinforcement` records the guard whose draw moved the
  round robin (`drawE`, `drawSlot`); `joinTeam` right after (Sector Ops' `fill` and `stealthSystems` call them back to
  back): the team's first member that drew sets `SweepTeam.hunt`; a later member gets `alarmK--` (his draw given back:
  the next team takes it) and `Enemy.retell(t.hunt)` (new, enemy.ts: overrides the `pendingHunt` / `hunt` that `tell`
  keeps first). A member refused at the cap never draws; the next one that spawns sets the team's hunt. Gated on
  `ALARM_HUNT.split && coop4()`.
- **A176 own-LKP sweep**: `SweepTeam.hunt` (-1 none); `EnemyManager.teamsStep()` (the old one-line team tick, moved to a
  method) ticks a team with its slot's LKP (`intruders.x / z[hunt]`) while valid, else the mirror (freshest, A150).
  `releaseSlot` (AI1 reuse) drops a team's hunt on that slot. Flag `SWEEP4.own`.
- **A177 sweep spacing**: `sweepStart(team, count, spread = 3)`: spread > 3 -> `floor(team x count / spread) % count`;
  3 or less: today's thirds exactly (the brief's `max(3, spread)` form would change spread 3 by rounding, so 3 keeps
  the old formula). `SweepTeam` gets `spread` (6th ctor arg, default 3) and `newTeam(..., spread = 3)`. Pure
  `pointBusy(x, z, others, self)` in `sweepTeam.ts`: another sweeping team of the section heading for / dwelling at a
  point within `SWEEP.thin`. `SweepTeam.next()` passes over busy points (not counted as visited, `busySkips`), all busy:
  the next one anyway; `begin()` moves a busy start to the next free point. `peers` (the manager's `teams`) is set each
  step only from 3 players (null = off). Flag `SWEEP4.dedupe`. #302 (stall replan, then give up; `outward` walk) is on
  master (55592902) and in this branch: kept untouched; the dedupe sits after it in `next()` (tested together).
- **A178 fair cover order**: `rolesStep` walks the slots from `rolesRR` (one later each roles tick, 3+ players; 1-2:
  slot 0 first); reservation stays the shared `coverSet.owner`, role caps per group (one reporter / point / overwatch /
  flank each). `targetCoverT(slot)`: the cover time of the player who owns the slot (`idOf`), else today's max. Flags
  `FIGHTS4.rotate`, `FIGHTS4.ownCover` (`src/ai/intruders.ts`).
- **A179 `spotted` per slot**: `EnemyManager.spottedStep()` (the old block, moved to a method): from 3 players a
  player's `spotted` clears once no guard in combat hunts his slot; while any guard fights with `hunt` -1 nobody clears
  but by the old all-calm rule (safe side). Flag `FIGHTS4.spotted`.

## For Sector Ops (sectorMode.ts; not edited here)
Hook signatures:
- `EnemyManager.setResponseShape(over: ResponseShapeOverride | null): void` - at section load (beside `setSection`):
  `em.setResponseShape(s.responseShape ?? null);` with a new optional `SectorDef.responseShape?: ResponseShapeOverride`
  (`import type { ResponseShapeOverride } from '../ai/gear'` in sectors.ts).
- `EnemyManager.shapeResponse(stage: number, perStage: number, out: ResponseShape): ResponseShape` - at the alarm.
- `EnemyManager.newTeam(section, override, routes, posts, spread = 3)` - pass `SECTOR.alarmMax * shape.teams`.
- Pure helpers (gear.ts): `responseShape(...)` (above), `responseTeamSize(k, size, teams)`, `responseTeam(stage, n,
  out)` per team (a shield lead each).

Sector Ops decision (fix round): `shapeResponse`'s "+1 per player past 2" is THE rule; `alarmStep`'s
`SECTOR.reinforcePerExtra` scaling is only the fallback when `em.shapeResponse` is missing. The two defaults are equal
(1; `tests/gear.test.ts` holds them equal once `SECTOR.reinforcePerExtra` is on the branch). Wiring, corrected after
check B finding 1 (never scale twice):
1. Every section load AND every checkpoint restart: `em.setResponseShape(s.responseShape ?? null);` (the manager keeps
   the last value; `clear()` does not reset it, so `null` must be passed for a section without an override).
2. `raised()` (sectorMode.ts:943-960 on this branch; :959-1004 on feature/coop4): `want` (the run's scaled count) only
   says whether the stage sends at all. Then, with `base` = the section's UNSCALED `perStage`:
   `const sh = em.shapeResponse(stage, base, this.shape);` (`private readonly shape = { teams: 0, size: 0 }`);
   `if (!want || sh.size === 0) return;` (early return first);
   `const send = capReinforce(sh.size, base, em.maxAlive - em.alive - this.pending.length);` (one cap, SM's; it also
   subtracts what is still pending, which `shapeResponse`'s headroom does not).
3. For each team `k < sh.teams`: `responseTeam(stage, responseTeamSize(k, send, sh.teams), this.teamKinds)` (a shield
   lead per team) and one `em.newTeam(this.run.index, s.sweep ?? null, ...this.sweepSource(s), SECTOR.alarmMax *
   sh.teams)` per team.
4. Queue each team's members together (team 0's, then team 1's) in `pending`; `fill` must call `joinTeam(e, team)`
   right after that same guard's `joinReinforcement` (it does today, :926-928 on feature/coop4), with no other
   `joinReinforcement` / `sendIn` in between: the team-hunt sharing and its draw give-back rely on it.
Live cap: 24 placed + 3 stages x 4 = 36 > 32, so Sector Ops still budgets placed guards for 4 players (brief risk 1).

## Shared-file line ranges (after the change)
- `src/ai/enemyManager.ts`: 40, 67 (imports), 183-190 (fields), 875, 887-892 (`joinReinforcement` draw record),
  1005-1015 (`newTeam` spread), 1024-1036 (`joinTeam` team hunt), 1823-1837 (`setResponseShape`, `shapeResponse`),
  2842-2843 (`releaseSlot`), 3141-3146 (`rolesStep` rotation), 3197 + 3249-3261 (`targetCoverT(slot)`), 3455, 3475
  (calls), 3526-3567 (`teamsStep`, `spottedStep`), 3644-3646 (`clear`).
- `src/ai/enemy.ts`: 1337-1344 (`retell`).
- `src/ai/intruders.ts`: 66-72 (`FIGHTS4`). `src/ai/gear.ts`: 15, 46-50 (`SWEEP4`), 166-213 (`RESPONSE_N`,
  `responseShape`, `responseTeamSize`), 273-282 (`sweepStart` spread). `src/ai/sweepTeam.ts`: 16, 33-56 (`SweepPeer`,
  `pointBusy`), 60-67 (`hunt`, `peers`, `busySkips`), 113-114 (ctor `spread`), 149, 158-167 (`begin`), 214-253
  (`next`, `step`, `dedupeOn`).

## Tests (all green)
- `tests/gear.test.ts` (+4): `responseShape` 1-2 players today (no clamp, stage 0 -> no team), 3 / 4 players (3 x 1,
  4 x 2, split 2 + 2 / 3 + 2, a shield lead per team), headroom clamp of the extras only, override and undo.
- `tests/sweep.test.ts` (+7): spread 3 (or less) = today for teams 0-7 x counts 1-13; spread 6 -> six distinct starts;
  `pointBusy` (range, never self, other section, not sweeping); `next()` skip with peers, none without; all busy ->
  the next anyway; `begin` moves a busy start; the #302 stall skip still works with the dedupe on.
- `tests/fourIntruders.test.ts` (+13): team hunt per team (teams hunt 1 / 2 / 1, lone between them 0; later members
  retold, draws given back); cap refusal; 2 players: no team hunt, nobody retold; own-LKP tick (4 players own, forgotten
  -> freshest, 2 players freshest, peers null); `newTeam` spread; reuse drops the team hunt; `shapeResponse` (players,
  room, override); 4 fights 4 groups, distinct covers, first pick rotates 0-1-2-3 / 1-2-3-0 / 2-3-0-1 (2 players:
  0 first always); four groups on one cover set never share; flank trigger per slot (2 players: max); `spotted` per
  slot (huntless guard blocks; all calm clears); **2-player identity**: one scripted fight + alarm + two teams + sweep +
  spotted + shape ends deep-equal with every AI5 rule on and undone (and differs when the gate is forced to 2: checked).
- Unedited and green: `tests/twoIntruders.test.ts`, `tests/intruders.test.ts`, `tests/responseWiring.test.ts`,
  `tests/responseTeam.test.ts`, `tests/squadWiring.test.ts`, `tests/squadRoles.test.ts`, `tests/combatHearing.test.ts`,
  plus every test file importing enemyManager / sweepTeam / gear / sectorMode / stealthSystems / intruders (50 files,
  674 tests). `npx tsc --noEmit -p .` clean; eslint clean on the 8 files.

## Changelog line (appended to `changes/feature-guard-ai-coop4.md`)
- With 3-4 players a stage's response grows by one guard per player past 2 (two teams from 4 guards, a shield lead
  each, never past the live cap); each team hunts and sweeps round its own intruder's last known position and keeps off
  the points another team holds; fights take cover in turn, the flank trigger and `spotted` follow each player's own
  fight; 1-2 players unchanged.

## Fix round (checks A FAIL, B PASS: `AI-CHECK-A.md`, `AI-CHECK-B.md`)
- A F1 (A171 / G139): a slot reuse left the old player's tells live. `releaseSlot` now calls `Enemy.dropHunt(s)` on
  every guard (new, enemy.ts: clears `hunt` and the private `pendingHunt` when they equal `s`, so a calm guard told by
  a contact call or a reinforcement walking in never takes the new player on going to combat) and
  `RadioNet.cancelInc('contact', s)` (new, radioNet.ts: drops the open contact calls and queued contact receivers of
  that slot, counted in `cancelled`; allocation-free loops over the fixed pools). Tests (fourIntruders): real
  `Enemy.prototype` stand-ins told by `radio` and `joinAsReinforcement` lose the tell on the reuse (another slot's tell
  kept); an open and a queued contact for the slot never deliver after the reuse, another slot's still does; both
  fail with the old `releaseSlot` (checked).
- A note 3, intended: a team whose first member drew nothing (no intruder known, or a device responder) takes its hunt
  from the first later member who draws; the earlier members keep `alarmHunt` (-1 then), so the team is never split
  across two intruders.
- B finding 1 / Sector Ops decision: wiring sketch corrected above; `RESPONSE_N.extraPerPlayer` held equal to
  `SECTOR.reinforcePerExtra` by a test (src/ai does not import src/game/sectors: layering, not a cycle).
- B docs: AI.md section 5 has AI2-AI4 entries; A177 text matches the code; `ai.md` types `ghostOf` as `number`.

## Risks
1. Sector Ops wiring pending: until `raised()` uses `shapeResponse` / two `newTeam`s, a stage still brings one team of
   `perStage` (the team-hunt sharing and own-LKP sweep already work for that one team at 3+ players).
2. The team hunt relies on `joinTeam` following its member's `joinReinforcement` with no other reinforcement between
   (true in `fill` and `stealthSystems`); a different order only loses the give-back (the member keeps his own draw).
3. Live cap at 4 players (brief risk 1): the extras are clamped to the room left, so a full section gets no extras.
4. `spotted` per slot stays conservative while any guard fights with no hunt (`hunt` -1): then the old all-calm rule.
5. Docs `docs/systems/ai.md` note added under the coop4 notes; e2e (AI6 'two teams', sectorops 4 players) not run.
