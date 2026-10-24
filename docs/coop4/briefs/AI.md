# coop4 AI slice brief: guards against up to 4 intruders (Sector Ops only)

Opus planner, 2026-10-24, on master a10382bc. Docs only. Builder: Opus (AI code, CLAUDE.md "A job"). Referenced by
`docs/coop4/PLAN.md` (Sector Ops Build). Ask: ROADMAP Decided 2026-10-23 ~10:25, Michael: "make a note to increase
sector ops to 4 player coop after the redesigned map is completed. marlow yard stays at 2." Overturns G2 / G50 for
Sector Ops only (DECISIONS at the coop4 merge).

Hard rules that bind every item: no allocation in think / hear / roles / sweep paths (typed arrays, module scratch,
`hyp2` / `hyp3`); `src/ai` never imports `src/net` (`MAX_INTRUDERS` mirrors `MAX_PLAYERS`, targetPick.ts:11); gameplay
reads no graphics state; pure logic in Babylon-free modules with Vitest tests.

**Gate (A170): every behaviour change below applies only while `players().length >= COOP4.from` (3).** With 1-2
players (solo, Marlow Yard, today's 2-player Sector Ops) the AI is bit-for-bit today's: e2e-coop, e2e-ctcourse and
tests/twoIntruders.test.ts stay green unedited. `COOP4` lives in `src/ai/intruders.ts`: `{ from: 3 }` (undo: `from:
Infinity`). Exceptions (fixes that also hold at 2, each named): A172, A173.

## 0. Audit: what is N-general on master, what is not

N-general already (verified, no work): `IntruderBoard` slots / LKP / seenT / locT for 4 (intruders.ts:20-102);
`Enemy.perceive` loops `min(players, 4)` into module scratch, `mayBeSeen` cull, `pickTarget` (enemy.ts:2102-2240,
targetPick.ts:26-75); `seenMask` / `seesIndex` per player index (enemy.ts:280, 743); hunt / tell / radio per slot
(enemy.ts:1306-1376); contact calls carry the slot as `inc` (radioNet `startCall`, enemyManager.ts:385-400); per-slot
callers / reporters (enemyManager.ts:440, 3126); one squad group per slot with shared cover reservation `coverSet.owner`
(enemyManager.ts:2989-3093); per-slot chase fields, one rebuild per update round robin (enemyManager.ts:2774-2806); per-slot
search plans and heard reports (enemyManager.ts:180, 196, 2687-2700); `hear` / `noise` take a `by` id
(enemyManager.ts:2543, 2609), S26 `hearFight` per slot (2650-2683); host step and shot noise loop every remote by id
(coopHost.ts:1462-1488, `clientStepNoise` validate.ts:188); separation, recon drones, anim tier loop `players()`.
No "partner / other player" logic exists in src/ai: every `partner` there is a talking-pair guard (S10), not a player.

2-only or wrong at 3-4 (the work):
| # | Where | Problem at 3-4 players |
| --- | --- | --- |
| a | intruders.ts:31, 42-53 | `ids` never freed: after one leave + a new joiner (a 5th distinct id) `slotFor` returns -1; that player is never reported (A148 noFeet: unhuntable). Literal `['', '', '', '']`. |
| b | gameState.ts:2690 | ghost reads `slotFor` (assigns a slot on a read). Clients have no ghost / arcs on the wire at all. |
| c | enemy.ts:2112-2200 | rays per think = 3 per calm player in field (chest, head, hips), 2 per player in combat: 12 / 8 at 4 players, no budget. |
| d | coopHost.ts:771 | a client's noisy hold `em.hear(it.pos, it.holdNoise)` has no `by` (the host's own has it, gameState.ts:1321): never located in a fight. Also a 2-player bug. |
| e | radioNet.ts:60 | receiver queue 64: 4 simultaneous contacts x up to 31 receivers overflow (`dropped`). |
| f | enemyManager.ts:766-767, 860, 869, 1028, 1749-1758 | every reinforcement hunts ONE slot (`alarmHunt` / `commandHunt`): at 4 players the others are ignored by the whole response. |
| g | enemyManager.ts:3289-3291 | every response team sweeps round the freshest LKP (`this.lkp`), not its own intruder's. |
| h | gear.ts:220-224 | `sweepStart` spreads teams at thirds: team 3+ of a section starts on team 0's point; teams never avoid each other's point. |
| i | enemyManager.ts:2993 | groups take cover in slot order each tick: slot 0's fight always picks first. |
| j | enemyManager.ts:3096-3104 | `targetCoverT` is the max over ALL players: one player camping in cover flips every fight's flank trigger. |
| k | enemyManager.ts:3309-3314 | `spotted` cleared only when nobody at all is in combat: a player spotted in fight A stays un-takedownable while fight B runs. |
| l | gear.ts:149, sectorMode.ts:943-960 | one team of `perStage` per stage, sized for 2 players; no player-count hook. |

## 1. Slices

### AI1 (S) Intruder slots: reuse, read API, ghost per player
- intruders.ts: `ids` from `Array.from({ length: MAX_INTRUDERS }, () => '')`; add `gone = new Uint8Array(MAX_INTRUDERS)`.
  `find(id): number` (no assignment, -1). `leave(id)`: marks its slot gone (kept for a rejoin: the same id returns it,
  `gone` cleared in `slotFor`). `slotFor(new id)` with no free slot (A171): first a gone slot not valid and not hunted,
  else the gone slot with the largest `seenT`; returns the reused slot index plus `reused = slot` field the manager reads.
  The board cannot see hunters: `slotFor(id, hunted?: (s) => boolean)` takes the manager's `huntingOf` (a bound method
  made once, no closure per call).
- enemyManager.ts: `intruderLeft(id)` -> `intruders.leave(id)`. On a reuse (`reportSighting` 598-603, `noise` 2551,
  `hearFight` 2671): `releaseSlot(s)`: `plans[s].reset`, `callers[s] = -1`, `slotFlowVer[s] = -1`, `heardRepAt[s] = -1e9`,
  every guard with `hunt === s` gets `hunt = -1` (keeps searching where he stands), then `forget(s)`. lkpSlot (161) by
  `MAX_INTRUDERS`.
- `ghostOf(id, out: Vector3): number` (read only, `find`): 0 none, 1 position known, 2 show (`seenT > 0.6` and
  `huntingOf`): the rule gameState.ts:2690-2694 uses now. gameState.ts:2690 switches to `find` (one-line, Sector Ops
  Build owns gameState; the AI builder may make it in this slice with their OK).
- Named, not built here: the client's own ghost (and meter arcs: `seesIndex(i)`) on the wire per player (net layer,
  coop4 PLAN), drawn by the client HUD (UI).
- Host hook (net layer, coopHost.ts:510 `removeRemote`): `this.g.enemyMgr?.intruderLeft(id)`. Until it lands, reuse is
  exercised by unit tests and e2e fakes only.
- Tests: tests/intruders.test.ts: 4 ids fill 4 slots; leave + rejoin same id -> same slot, LKP kept; leave + new id ->
  the gone slot, never a live player's; all 4 present (none gone) -> -1; `find` never assigns. New
  tests/fourIntruders.test.ts (copy the FakeGuard harness of tests/twoIntruders.test.ts): reuse releases plan / caller /
  hunters; `ghostOf` 0 / 1 / 2.

### AI2 (M) Perception over 4: budget and cost
- Cost: Test Runner measured the AI manager at 0.004-0.013 ms / guard with 2 players (guard-cap cf5a2bf8). What
  scales with players is the per-player loop of `perceive` (rays) plus the step / shot `hear` calls (1 per remote per
  0.25 s). Worst case linear: 4 players <= 2x = 0.008-0.026 ms / guard, 24 guards <= ~0.65 ms a frame, combat rays
  8 per guard per think (~4 Hz, enemy.ts:2079-2082) = ~770 rays / s at 24 guards in combat. Inside budget; the cap is
  insurance for the calm worst case.
- Cap (A181, flag `PERCEIVE = { maxRays: 9 }` in targetPick.ts): pure `perceiveOrder(n, cur, hunt, dist, rr, out:
  Int8Array): number`: `cur`, then `hunt`, then the rest by distance, rotated by `rr` among equals; perceive walks that
  order and starts a player only while `used + cost <= maxRays` (cost 3 calm, 2 alerted, 0 when `mayBeSeen` false). A
  skipped player keeps rate 0 / los 0 this think; `this.perRR++` each think rotates who waits. Effect: 4 alerted
  players = 8 rays (never capped); 4 calm players all in one guard's field: 3 per think, each seen 3 thinks in 4. At
  1-2 players unreachable (max 6): no change.
- `raysThisStep` counter on `EnemyManager` (summed by perceive, reset per update; tests and Test Runner's measure).
- Tests: tests/targetPick.test.ts: `pickTarget` with n = 4 (calm best rate, sticky cur, hunt, ties lower index);
  `perceiveOrder` budget 9 with 4 calm -> 3 started, rotation covers all 4 in 4 thinks; 4 alerted -> all 4.

### AI3 (S) Hearing and teammates
- Every noise maker id, audited: host body noises carry `localRef.id` (gameState.ts:627-629, 1321, 1421, 1558, 1846,
  1981, 1985; takedownController.ts:794); clients' steps / shots / takedown noise carry `r.ref.id` (coopHost.ts:858,
  1476-1485); gadgets, doors, drops, shot lamps are `by` null on purpose (lures / world noise: S26 never locates them,
  A155-A160). Only gap: (d).
- A172 (holds at 2 players too): coopHost.ts:771 -> `em.hear(it.pos, it.holdNoise, 'noise', null, r.ref.id)`. Net-layer
  file: one line, given to the coop4 net slice (or this slice with Sector Ops Build's OK).
- S26 combat hearing (hearing.ts:107-125, enemyManager.ts:2650-2683): N-general; `switchAfter` 8 s per guard, unchanged.
  Client step noise from sent speed (`clientStepNoise`, per remote, one shared 0.25 s timer): N-general, unchanged.
- A173 (holds at 2): `RADIO.queue` 64 -> 128 (`MAX_INTRUDERS x 32`), radioNet.ts:60; fixed pool, no other change.
- Tests: tests/combatHearing.test.ts: 4 bys -> 4 slots located, a searcher on slot 2 re-aims only after `switchAfter`;
  tests/radioNet.test.ts: 4 contacts in one section with 31 receivers -> `dropped` 0.

### AI4 (S) Alarm draw and radio: which intruders reinforcements hunt
- Contact calls stay one intruder each (G139). The alarm raiser's intruder stays `alarmHunt` (766-767, S24 fix rules).
  S27 draw on alarm unchanged: any alarm stage ends the calm area for every guard (A164, enemy.ts:1464-1467).
- A174 (gated): pure `alarmHunts(alarm, valid, seenT, out: Int8Array): number` in intruders.ts: the alarm's slot first
  (when valid), then every other valid slot by smallest `seenT` (freshest sighting first); none: 0 (today: device /
  none, A148 / A102). Manager `nextAlarmHunt()`: round robin over that list (`alarmK`, reset in `resetAlarm` 748).
  Lone reinforcements (`joinReinforcement` 869, `sendIn` 1749) each take `nextAlarmHunt()`; a team takes one for all its
  members (AI5). Nearest is not used: entries are far from all of them and hunting the alarm's first keeps G139 / S24.
  `reinforce` (parked modes, 1028) unchanged.
- Tests (fourIntruders): 3 valid slots, alarm on slot 1 -> 4 lone reinforcements hunt 1, x, y, 1 in that order;
  alarm slot forgotten -> freshest first; at 2 players every reinforcement hunts `alarmHunt` (today).

### AI5 (L) Response teams and fights with 4
- Hook (Sector Ops owns the numbers): pure `responseShape(stage, perStage, players, headroom, out: { teams, size })` in
  gear.ts beside `responseTeam` (149). Default (A175): `size = perStage + max(0, players - 2) x RESPONSE_N.extraPerPlayer`
  (1), clamped to `headroom` (`maxAlive - alive`; spawn already refuses past it, enemyManager.ts:1762); `teams = players
  >= COOP4.from && size >= RESPONSE_N.splitAt (4) ? 2 : 1`, members split evenly, a shield lead per team. 1-2 players =
  today exactly. `SectorDef.responseShape?: { extraPerPlayer?, splitAt? }` override (sectors.ts:126-129). Sector Ops
  Build wires it: sectorMode.ts:943-960 calls `responseShape` and makes `teams` `newTeam`s, pushing each team's members
  consecutively. Live cap: today a section may hold 24 placed + 3 x 2 = 30 <= `SECTOR.maxAlive` 32 = `MAX_ENEMIES`; +2
  per stage at 4 players needs 36: Sector Ops must lower placed guards or raise the cap with the net layer (wire).
- A176 (gated): `SweepTeam.hunt` (slot, -1 none): set by `joinTeam` (991) from `nextAlarmHunt()` on the first member;
  every member gets `e.hunt = t.hunt`. enemyManager.ts:3291 ticks each team with its own slot's LKP (`intruders.valid /
  x / z[t.hunt]`), else the freshest (A150, today).
- A177 (gated): `sweepStart(team, count, spread = 3)` (gear.ts:220): `spread` > 3: `floor(team x count / spread) %
  count`; `spread` <= 3: today's thirds exactly (`team x max(1, ceil(count / 3)) % count`, as built in AI5),
  `spread` = alarmMax x teams per stage (Sector Ops passes it to `newTeam`; default 3 = today). `SweepTeam.next()`
  (sweepTeam.ts:171) skips a point another sweeping team of the section is heading for or dwelling at within
  `SWEEP.thin` (pure `pointBusy(x, z, others, self)`, the section's teams passed in, no allocation); all busy: take it
  anyway. The #302 sweep fix (stall replan then give up, sweepTeam.ts:134-170) is kept: it already handles teams
  crossing.
- A178 (gated): squad fights: `rolesStep` walks slots from `rolesRR` (rotated each roles tick) so no fight always picks
  cover first; reservation stays the shared `coverSet.owner` (two fights never take one cover, S24 (b)); role caps stay
  per group (1 point, 1 overwatch, 1 flank, one reporter). `targetCoverT(slot)`: the cover time of the player whose id
  owns the slot (`idOf`), not the max over all.
- A179 (gated): `spotted` cleared per player when no guard is in combat on his slot (enemyManager.ts:3309-3314).
- Tests: tests/gear.test.ts `responseShape` (1-4 players, headroom clamp, override); tests/sweep.test.ts spread 6 ->
  distinct starts, `pointBusy` skip, all busy fallback; fourIntruders: 4 fights 4 groups no shared cover, first pick
  rotates, flank trigger per slot, team hunt per team, `spotted` per slot.

### AI6 (M) e2e
- e2e-stealth-ai (Guard AI owns; single browser, fakes, A180): `t.fakes([[x, z], ...])` replaces
  `g.remotePlayers` with up to 3 stand-in `PlayerRef`s (ids `fake1..3`, feet set by the test, a stub `Damageable`:
  `alive`, `aimPoint` / `headPoint` at feet + 1.3 / 1.65, `applyDamage` no-op, `light` pinned), restored in `reset`. Test
  only: no bot partner (G2 / G48 / G50 hold). Blocks: 'four seen' (a calm guard's `seesIndex(1..3)` and target pick with
  4, `raysThisStep` <= 9 per guard); 'four fights' (4 guard pairs, 4 groups, no shared cover); 'alarm split' (3 known,
  a stage's reinforcements hunt >= 2 slots); 'two teams' (Sector Ops map, 4 refs, two teams with different hunts, no two
  leaders on one point for 60 s); 'reuse' (`intruderLeft(fake2)`, a new fake id takes his slot, his hunters drop).
- 3-4 browsers (Sector Ops / Test Runner own the harness): e2e-coop asserts the AI needs: (1) S24 with 3 clients: each
  guard pair hunts the player it saw, never another's LKP; (2) a client leaves and rejoins: `em.intruders.find(id)` is
  the same slot, its LKP kept; (3) a 3rd client's crouch-walk is silent, its sprint is heard and located (by = its id).
  e2e-sectorops with 4 players: (4) a stage brings `responseShape`'s teams (alive <= maxAlive); (5) the two teams hunt
  different slots and their leaders never dwell on one point; (6) S27 draw on alarm on every client's screen.
- Laptop measure (Test Runner, guard-cap compare): AI ms / guard with 4 fakes vs 2 on campus, 24 guards; pass at <= 2x.

## 2. Order, sizes, dependencies

| Slice | Size | Needs from the net layer | Can start now |
| --- | --- | --- | --- |
| AI1 | S | `removeRemote` -> `intruderLeft(id)` (coopHost.ts:510); stable player ids across rejoin (already `pid`, session.ts:215) | yes |
| AI2 | M | nothing | yes |
| AI3 | S | coopHost.ts:771 one line | yes (pure parts) |
| AI4 | S | nothing | yes |
| AI5 | L | nothing; Sector Ops wires sectorMode.ts:943-960 + `SectorDef` | yes (pure + manager) |
| AI6 | M | 3-4 browser harness for the e2e-coop / sectorops asserts | fakes block yes; the rest after net |

Order: AI1 -> AI2 + AI3 + AI4 in parallel (disjoint files except enemyManager: AI4 edits 748-870 / 1749, AI2 enemy.ts +
targetPick.ts, AI3 radioNet.ts + the coopHost line) -> AI5 (needs AI4's `nextAlarmHunt`) -> AI6. One branch
`feature/guard-ai-coop4`, one PR, one Opus checker pair (AI + `src/net` line). ~1-1.5 days builder time.

From the net layer (coop4 PLAN): player ids 0-3 stable for a run and across a rejoin; up to 3 remote `PlayerRef`s in
`g.remotePlayers()` (no allocation per call, as `remoteRefs`); per-client `MoveState` / sent speed and stance (already
per remote, `r.state`); `removeRemote` calling `intruderLeft`; later the per-client ghost / arcs fields.

## 3. Risks
1. Live cap vs 4 players (AI5): 24 placed + bigger stages pass `MAX_ENEMIES` 32; reinforcements are silently refused
   at the cap. Sector Ops must budget placed guards per section for 4 (or a wire change for 40).
2. Gate drift: a gated rule leaking into 2 players changes Marlow Yard; tests/twoIntruders and e2e-coop must pass
   unedited (the checker diffs their files).
3. Perf: four chase fields rebuild round robin (one per update): with 4 moving intruders each field lags <= 4 updates
   (~67 ms): accepted, measured in the AI6 laptop run.
4. Slot reuse with live hunters (AI1): only when 5+ distinct ids join one run; hunters drop to a local search.

## 4. Assumed decisions (last used A164, S27)
- A170 New rules only at >= 3 live players (`COOP4.from` 3); undo `Infinity`.
- A171 A gone player's slot is kept for his rejoin until a new id needs one: free, then gone and idle, then gone and
  longest unseen (its hunters drop to hunt -1); undo `INTRUDERS.reuse = false` (today: a 5th id is never reported).
- A172 A client's noisy hold is attributed to him (`by`), as the host's; doors / drops / lures stay unattributed;
  undo: drop the argument.
- A173 `RADIO.queue` 128; undo 64.
- A174 Reinforcements hunt the alarm's intruder first, then each other known intruder by freshest sighting, round
  robin; a team shares one; undo `ALARM_HUNT.split = false`.
- A175 Response default: +1 guard per player past 2, two teams at size >= 4 and 3+ players, capped by headroom; Sector
  Ops overrides per section; undo `extraPerPlayer 0`, `splitAt Infinity`.
- A176 A team sweeps from its own intruder's LKP (fallback the freshest, A150); undo `SWEEP_OWN = false`.
- A177 Team sweep starts spread over the section's max teams; a team skips a point another team holds; undo
  `spread 3`, `SWEEP.dedupe = false`.
- A178 Fights take cover first in rotation; the flank trigger reads the slot's own player; undo `TACTICS.rotate = false`.
- A179 `spotted` clears per player when no guard fights his slot; undo `SPOTTED_PER_SLOT = false`.
- A180 e2e fakes are test-only stand-ins in the page, never a game feature (G2 / G48 / G50).
- A181 `PERCEIVE.maxRays` 9 per guard per think, `cur` and `hunt` first, the rest rotated; never reached at 1-2
  players; undo `Infinity`.

## 5. Build log

### AI1 built (Opus builder, 2026-10-24)
- Files: `src/ai/intruders.ts` (`ids` / `gone` by `MAX_INTRUDERS`, `find`, `leave`, `slotFor(id, hunted?, reuse =
  false)` + `reused`, `INTRUDERS.reuse`, `COOP4 { from: 3 }`, the seam `slotOf`), `src/ai/enemyManager.ts` (`coop4()`,
  `slotForId` (every report: `reportSighting`, `noise`, `hearFight`, drone spot), `releaseSlot`, `intruderLeft`,
  `ghostOf`, `huntedFn` bound once; `lkpSlot` / `slotFlow` by `MAX_INTRUDERS`), `src/ai/enemy.ts` (perceive's sight bit
  through `slotOf`), `docs/systems/ai.md`, `changes/feature-guard-ai-coop4.md`. N0's `src/game/playerSlots.ts` +
  `tests/playerSlots.test.ts` cherry-picked from origin/feature/coop4 08267f27 (unchanged).
- Host hook (for Sector Ops N1, coopHost.ts:510 `removeRemote`): `EnemyManager.intruderLeft(id: string): void`, call as
  `this.g.enemyMgr?.intruderLeft(id)`. Marks the slot gone; the same id rejoining takes it back with its LKP.
- Ghost read (per player, for the wire): `EnemyManager.ghostOf(id: string, out: Vector3): number` (0 none, 1 known,
  2 show: `seenT > 0.6` and hunted); `find`, never assigns.
- Slot seam: `slotOf(ref: PlayerRef, index: number): number` in `src/ai/intruders.ts`: `(ref as
  Partial<TeamFields>).slot` when set (N1), else the `players()` index (`import type` from `src/game/playerSlots`).
  The only reader: `Enemy.perceive`'s `seenMask` bit, so `seesIndex(s)` means team slot `s` (host 0 either way). The
  intruder board stays keyed by player id. `AiContext.players()` stays `readonly PlayerRef[]`.
- Gate (A170): reuse only while `players().length >= 3` (`slotForId` passes `reuse`); the board's default is off, so
  a read-side `slotFor` never takes a slot without the manager's release. 1-2 players: a 5th distinct id still gets -1.
- Not done here (named): gameState.ts:2690 still calls `slotFor(localRef.id)` (N1 owns gameState). Switching it to
  `ghostOf` / `find` stops the host's slot being taken on the first frame, so the first player seen would get slot 0
  (slot order changes at 2 players); keep one `em.intruders.slotFor(localRef.id)` at stealth start when switching.
- Tests: `tests/intruders.test.ts` (4 fill; `find` never assigns; leave + rejoin same slot, LKP kept; leave + new id ->
  the gone slot, never a live one; idle first then unseen longest; all present -> -1; reuse off -> -1; `slotOf`),
  new `tests/fourIntruders.test.ts` (FakeGuard harness: 4 slots; rejoin keeps slot and hunters; reuse releases plan,
  caller, chase field, heard throttle, alarm / contact hunt and hunters; reuse via a located shot; 2 players no reuse;
  `ghostOf` 0 / 1 / 2). `tests/twoIntruders.test.ts` unedited and green.

### AI2 built (Opus builder, 2026-10-24)
- `PERCEIVE = { maxRays: 9 }` and pure `perceiveOrder(n, cur, hunt, dist, rr, out)` (targetPick.ts); `Enemy.perceive`
  at 3+ players starts players in that order within 9 sight rays a think (3 calm, 2 alerted, 0 out of view), `perRR`
  rotating the tail; 1-2 players index order, uncapped. Counters `Enemy.raysThink`, `EnemyManager.raysThisStep`.
  Tests: targetPick (+10), new perceive4 (11, 168-case 2-player identity). Log: `docs/coop4/briefs/AI2-BUILT.md`.

### AI3 built (Opus builder, 2026-10-24)
- A173 `RADIO.queue` 128 (radioNet.ts); hearing over 4 noise makers proven (no code change); A172 coopHost line
  (`em.hear(it.pos, it.holdNoise, 'noise', null, r.ref.id)`) handed to Sector Ops (done on feature/coop4). Tests:
  radioNet (4 contacts x 31 receivers, dropped 0), combatHearing (4 bys, `switchAfter`, 2-player identity). Log:
  `docs/coop4/briefs/AI3-BUILT.md`.

### AI4 built (Opus builder, 2026-10-24)
- `ALARM_HUNT = { split: true }` and pure `alarmHunts(alarm, valid, seenT, out, gone)` (intruders.ts);
  `EnemyManager.nextAlarmHunt()`: from 3 players round robin over the alarm's intruder, then the freshest sightings,
  leavers skipped (`alarmK`, reset on the alarm, `resetAlarm`, `clear`); `joinReinforcement` and `sendIn` take it; 1-2
  players `alarmHunt` / `commandHunt` (today). Tests: intruders (`alarmHunts`), fourIntruders (order, forgotten,
  leaver, `sendIn`, cap refusal, 2 players). Log: `docs/coop4/briefs/AI4-BUILT.md`.

### AI5 built (Opus builder, 2026-10-24)
- Response size hook `responseShape` / `responseTeamSize` / `RESPONSE_N` (gear.ts) with manager wrappers
  `EnemyManager.setResponseShape(over: ResponseShapeOverride | null): void` (section load) and
  `shapeResponse(stage: number, perStage: number, out: ResponseShape): ResponseShape` (alarm), `newTeam(.., spread = 3)`;
  team hunt shared per team (closes AI4's split-team risk: `joinTeam` keeps the first member's draw, retells the rest and
  gives their draws back); own-LKP sweep, `sweepStart` spread + `pointBusy` dedupe (#302 kept); roles rotation,
  `targetCoverT(slot)`, `spotted` per slot. Flags `SWEEP4`, `FIGHTS4`. All gated at 3+ players; 2-player identity test.
  Sector Ops wiring of sectorMode.ts:943-960 and `SectorDef.responseShape` pending. Log: `docs/coop4/briefs/AI5-BUILT.md`.
- Fix round (checks A FAIL / B PASS, `AI-CHECK-A.md`, `AI-CHECK-B.md`): a slot reuse now drops every tell of the old
  player (`Enemy.dropHunt`: `hunt` and the pending tell; `RadioNet.cancelInc('contact', s)`: open and queued contact
  calls), A171 / G139; `RESPONSE_N.extraPerPlayer` held equal to Sector Ops' `SECTOR.reinforcePerExtra` (test); the
  wiring sketch corrected (unscaled base, one cap); docs (AI2-AI4 entries, A177 text, `ghostOf` type).

### AI6 built (Opus builder, 2026-10-24)
- e2e-stealth-ai scenario 'four intruders (coop4)' (`scripts/e2e-stealth-ai.mjs`, the last block), one browser: test
  helper `t.fakes([[x, z], ...])` / `t.fake(id, x, z)` / `t.fakeList` in the script's own `window.__t` (no src edit):
  up to 3 stand-in `PlayerRef`s as `g.remotePlayers()` (ids `fake1..3`, feet set each step, alive, aim / head at feet +
  1.3 / 1.65, damage no-op, light pinned), `reset` restores the game's remotes (A180). Runs, each seeded, sim-time steps:
  'rays' (one calm guard, 4 crouched players in the dark in his focus: `raysThink` <= 9 and >= 8, at most 3 started a
  think, all 4 seen in turn; 2 players: 6, `perRR` 0); 'four' (4 guards, 4 lit players: 4 distinct valid slots, LKP at
  each player, `ghostOf` >= 1, no guard over 9 rays; alarm raised by a hunting guard with the mode's `onAlarm` muted: 5
  lone reinforcements hunt the `alarmHunts` order in turn, the raiser's first, 4 different; two teams of 2 share one
  hunt each, the next two in the order, the members' draws given back; each team ticked on its own LKP, not both on the
  freshest; `intruderLeft(fake2)` keeps his slot gone with its LKP, his first shot after the rejoin takes it back; fake3
  leaves and a new id `fake4` takes his slot, hunters and team drop it at once); 'two' (2-player control: coop4 off,
  every reinforcement and team member on `alarmHunt`, team hunt -1, ticked on the freshest, no peers). The board's ids,
  `maxAlive` and the remotes are restored at the end. `node --check` clean; not run (laptop queue).
- 3-4 browser asserts for Sector Ops / Test Runner: `docs/coop4/briefs/AI6-E2E-SPEC.md` ((1)-(6) of section 1 "AI6",
  what to stage, read and pass, the 2-player control and the laptop measure).
- Docs: `docs/systems/testing-tools.md` (e2e-stealth-ai line), `TESTING.md` (the S24 co-op line). Unit tests unchanged.
