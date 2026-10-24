# AI4 built: alarm draw and radio, which intruders reinforcements hunt (Opus builder, 2026-10-24)

Branch `feature/guard-ai-coop4-ai4`, off AI1 d530ebe0. Brief: `docs/coop4/briefs/AI.md` section 1 "AI4", A174.

## Built
- `src/ai/intruders.ts`: `ALARM_HUNT = { split: true }` (undo A174: `split: false`); pure
  `alarmHunts(alarm, valid, seenT, out: Int8Array, gone: Uint8Array | null = null): number`: the alarm's slot first
  (when valid), then every other valid slot by smallest `seenT` (ties: lower slot; located-only slots, `seenT` 99,
  last); none valid: 0. Extra optional `gone` (the board's): a slot whose player left is skipped (the alarm's too).
  No allocation (insertion into `out`, at most 4).
- `src/ai/enemyManager.ts`:
  - **`nextAlarmHunt(): number`** (public; AI5 consumes it in `joinTeam`, once per team). Gated (A170):
    `ALARM_HUNT.split && coop4()`, else returns `alarmHunt` (today). Gated: round robin `alarmList[alarmK % n]`,
    `alarmK++`, over `alarmHunts(alarmHunt, valid, seenT, alarmList, gone)`; n = 0: `alarmHunt` (today: A148 / A102).
  - `alarmK` reset in `resetAlarm`, in `raiseAlarm` (the first reinforcement after the alarm hunts the alarm's
    intruder even if `sendIn` advanced it before) and in `clear` (beside `alarmHunt = -1`).
  - `joinReinforcement` (coordinated path): `joinAsReinforcement(route, this.nextAlarmHunt())`.
  - `sendIn`: `ALARM_HUNT.split && coop4() ? nextAlarmHunt() : commandHunt()` (1-2 players: `commandHunt`, today).
  - Unchanged on purpose: `joinReinforcement`'s parked-mode branch (`coordinated` off, `e.tell(alarmHunt)`) and
    `reinforce` (parked modes) - parked systems get no new work; the device-fresh responder path (no hunt).
- Fewer than asked (Sector Ops' cap): a spawn refused at `maxAlive` never reaches `joinReinforcement`, so it takes no
  hunt and the order continues with the next one that spawns (tested). Nothing else: log only.

## Shared-file line ranges touched (enemyManager.ts, after the change)
67 (import), 177-179 (`alarmK`, `alarmList`), 756 (`resetAlarm`), 772-773 (`raiseAlarm`), 874-875
(`joinReinforcement`), 1756-1757 (`sendIn`), 1768-1785 (`nextAlarmHunt`), 3534 (`clear`). intruders.ts: new block
before `SlotHunted`.

## Tests (all green)
- `tests/intruders.test.ts` `alarmHunts`: alarm first then freshest; ties lower slot, never-seen last; alarm forgotten
  / none / nobody known (0); gone skipped.
- `tests/fourIntruders.test.ts` "coop4 AI4": 3 known, alarm on slot 1 -> 4 lone reinforcements hunt 1, 2, 0, 1;
  alarm slot forgotten -> 2, 0, 2; a leaver skipped, `resetAlarm` restarts at the alarm slot; `sendIn` takes the next
  (1, 2, 0); a cap refusal keeps the order; **2 players: every reinforcement hunts `alarmHunt` (1, 1, 1, 1, and still 1
  once forgotten: today)**.
- `tests/twoIntruders.test.ts` unedited, green (incl. (f2) `joinReinforcement` and (i2) `sendIn` at 2 players).
- Run: `npx vitest run tests/intruders.test.ts tests/fourIntruders.test.ts tests/twoIntruders.test.ts`: 3 files,
  41 tests passed. `npx tsc --noEmit -p .`: clean. eslint on the 4 files: clean.

## For AI5 (the consumer)
- Name / signature: `EnemyManager.nextAlarmHunt(): number` (slot, -1 none). Each call advances the round robin.
- Sector Ops calls `joinReinforcement` for EVERY reinforcement, team members too, before `joinTeam`
  (sectorMode.ts:892-894; stealthSystems.ts:765-767 via `spawnReinforcement`). So with AI4 alone, at 3+ players the
  members of one team are told different intruders. AI5's `joinTeam` must make the team share one: on the first member
  set `t.hunt` from that member's hunt (already one `nextAlarmHunt()`), and for later members set `e.hunt = t.hunt`
  and give the round robin back (or have `joinReinforcement` skip `nextAlarmHunt` for members of a team that already
  has a hunt). At 1-2 players the question does not arise (all `alarmHunt`).

## Hooks / one-liners for Sector Ops
None needed: AI4 reads only the manager's own state and `players().length`.

## Changelog line (proposed, for `changes/feature-guard-ai-coop4.md`)
- Guard AI (coop4 AI4, A174): with 3-4 players the alarm's reinforcements split over the known intruders: the alarm
  raiser's intruder first, then each other by freshest sighting, round robin; 1-2 players unchanged.

## Docs (proposed, for `docs/systems/ai.md`, not edited here: shared file)
- Under the S24 alarm hunt: "(coop4 AI4, A174) From 3 players each reinforcement takes `nextAlarmHunt()`: round robin
  over `alarmHunts` (the alarm's intruder first, then the freshest sightings, leavers skipped); a team shares one
  (AI5). Undo `ALARM_HUNT.split = false`."

## Risks
- Until AI5 lands, a Sector Ops response team at 3+ players is split across intruders (see above).
- `seenT` order ignores located-only (heard) slots' freshness (`locT`): a slot only ever heard sorts last. Per brief.
- `sendIn` with no alarm raised at 3+ players now uses the `seenT` order instead of `freshest` (by report stamp):
  differs only when a newer report was a location, not a sighting.
