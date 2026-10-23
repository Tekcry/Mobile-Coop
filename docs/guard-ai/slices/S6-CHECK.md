# S6 - Alarm and reinforcements (fresh checker, 2026-10-23)

Commit 88ce08dd on `feature/guard-ai-s6` (base ae1f1895, the chain S3 + S4 + S5 + S7). Reviewed
`git diff ae1f1895 88ce08dd` in full (`src/ai/alarm.ts`, `alertState.ts`, `barks.ts`, `enemy.ts`, `enemyManager.ts`,
`src/game/stealthSystems.ts`, `src/game/modes/sectorMode.ts`, `tests/alarmCall.test.ts`, `tests/radioWiring.test.ts`,
`scripts/e2e-stealth-ai.mjs`, `scripts/e2e-sectorops.mjs`, docs) against CLAUDE.md "Current goal" and hard rules, BRIEF
M1 ("any reinforcements must be aggressive"), M4 ("After a raised alarm (alarm panel hit or a radio report that gets
through; killing the caller first stops it)"), goal 6 and A29-A31, PLAN row S6, design 7.

## Verdict: PASS

Nothing is broken or unplayable.
- The alarm goes off only after a panel or a completed command call. Cutting the caller during his contact call means
  no alarm.
- When the commander is cut, the next guard in the fight takes the call 3 s later. There is one call at a time.
- Reinforcements are aggressive, come in at entries and never calm. Every walk has a bound.
- The parked modes (Hunter, Mission) behave exactly as before.

The retuned e2e scenarios still test what they say. Merging with S8 needs three edits that git will not show (below).

### Re-run here
- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint` on the 7 changed src files and 2 test files: exit 0.
- `npx vitest run tests/alarmCall.test.ts tests/radioWiring.test.ts tests/radioNet.test.ts`: 3 files, 51 / 51 pass.
- Not run, as ordered: full `npm run check`, full vitest, e2e. The new `e2e-stealth-ai` "alarm call" scenario and the
  `e2e-sectorops` S6 block have not run anywhere yet, so they still need their laptop run.

### Verified
- **Alarm only after a panel or a completed command call.**
  - `RADIO_ALARM` is true (`enemyManager.ts:43`).
  - `contactThrough` (`:456`) runs only from the sink's `completed` for a `contact` call, and only with `stealth &&
    coordinated` and no alarm yet.
  - `radioAlarm` raises with `p = null` only on the net's `alarm` for a completed `command` call. The old
    "nearest panel" stand-in is gone, so no panel indicator is lit.
  - `raiseAlarm` stays once per match, or once per Sector section load (`resetAlarm`), and sets `alarmBy`.
- **Cut the caller, no alarm.**
  - A contact call that is cut (down, grab, blind, despawn: the S3 paths) never reaches `completed`, so nothing is
    owed.
  - Voice hearers are "told" and never call (S3). An independent later sighting is a new contact, which is correct.
- **Hand-over after 3 s.**
  - `CommandCall.tick` (`:1174`, after the net's tick) sees the held call closed with the debt unpaid. It counts it as
    lost and waits `ALARM_CALL.retry` 3 s.
  - `nextCaller` (`:484`) then picks a guard still in the fight: out of the target's sight first, then an officer,
    then the lower key. No randomness (A7).
  - Nobody left means `lapse`. A refused `startCall` retries after 3 s too, so it never spins.
  - A panel alarm settles the debt (`command.raised()` in `raiseAlarm`).
- **One call per section.**
  - The net refuses a second `command`, and `owe()` starts nothing while one is held or a retry is pending.
  - `resetAlarm` and `clear` drop the debt, so a Sector load or restart starts clean.
- **`RadioNet.section` is set on a Sector load.** `setSection(i)` runs in `SectorMode.loadSection` before the guards are
  queued (`sectorMode.ts:281`).
- **Reinforcements.**
  - Sector `raised()` (`:477`) takes `SectorDef.entries` in turn, else `reinforce`.
  - `fill` spawns them calm, then runs `placeSlot`, then `joinReinforcement` (`:446`). That order matters: it must
    stay after `placeSlot` once S8 is in.
  - Other live maps: `StealthSystems.onAlarm` takes the alarm section's `guardAi.entries` furthest from the player,
    else the furthest `reinforce` point.
  - A live mode's `onAlarm` is now reached with no map reinforce points. This fixes campus, whose panel alarm never
    reached `SectorMode.onAlarm`.
  - `joinAsReinforcement` sets the profile to aggressive and calls `radio(0)`: in combat on the next step, with no
    contact call of his own.
  - The entry route is bounded (`ENTRY_MAX` 30 s, dropped on sight). An unreachable point is skipped (`!wp`).
- **Never calm, no endless loop.**
  - `AlertInput.hunting` (fought && `neverCautious`) only blocks `searching -> cooldown` (`alertState.ts:185`).
  - The search keeps sweeping `searchPoint` rings round the last known position at `PATROL.searchMax`. It is
    unbounded in time by design (A31), but each tick does bounded work.
  - Sector unload and restart despawn them.
- **Parked modes unchanged.**
  - Hunter and Mission set `coordinated = false`, so `contactThrough` returns at once and `joinReinforcement` uses
    `e.alert()`.
  - In `StealthSystems.onAlarm` the parked branch is the old code: no `at`, no alarm; otherwise `mode.onAlarm(at)`,
    then three `em.reinforce` guards.
- **The retuned `e2e-stealth-ai` scenarios still mean what they say.**
  - `radio` and `radio stagger` read the contact's completion from `radioNet.completed`, because the command call now
    keeps `radioLeft` above 0. The asserts are unchanged.
  - `alarm` part 1 now requires `alarmBy === 'panel'`. The panel run (6 m, 0.5 s assign cadence, 1.6 s hold) beats the
    radio (2.5 + 4 s x reaction 1) by about 2.5 s.
  - `alarm` part 2 asserts that he never runs to a disabled panel, and that no alarm comes by panel.
  - `lkp` still pins `alarmRaised = true`, so it gets no radio alarm.
- **Hard rules.**
  - Per tick: the command tick, `nextCaller` and the entry block allocate nothing (`entryP` is kept).
  - Per alarm (allowed): `new Vector3` and `clone()`. `entriesFor` uses a scratch array.
  - No `Math.hypot`. Strict TS is clean.
  - No wire change: host-only, `PROTOCOL_VERSION` untouched.

## Fixes

None blocking on this branch.

**Merge must-dos with S8** (`feature/guard-ai-s8` 54627243). `git merge-tree` shows conflicts in `enemy.ts` (the three
combat reads), `barks.ts`, the changes fragment and BRIEF. Two more problems compile wrong or silently undo M1 if only
the conflict hunks are resolved:
1. **`ADVANCE_HOLD` is gone.**
   - S6 deleted `const ADVANCE_HOLD = 2.5` (replaced at `enemy.ts:172`). S8's resolved advance-hold hunk still reads
     it (`roled ? profileOf(this.tacticsProfile).advanceHold : ADVANCE_HOLD`), so `tsc` fails.
   - Fix: restore the constant and use
     `(roled || this.tacticsProfile === P_AGGRESSIVE) ? profileOf(this.tacticsProfile).advanceHold : ADVANCE_HOLD`.
     A lone or unroled reinforcement still bounds at 0.8 s, and an unroled post keeps 2.5 s.
2. **Reinforcements would be standard in S8's eyes.**
   - S8 keys its tactics off the numeric `Enemy.tacticsProfile`: the jog, strafes, role weights and `profileOf`.
   - S6 only sets the string `profile = 'aggressive'` (`enemy.ts:945`).
   - Fix: in `joinAsReinforcement` also set `this.tacticsProfile = P_AGGRESSIVE` (keep the string for the e2e filter).
     `placeSlot` sets `tacticsProfile` first, so `joinReinforcement` must stay after it, as it is.
3. **One source for the profile numbers.**
   - `get behaviour()` (`enemy.ts:918`) returns `profileOf(this.tacticsProfile)`. Drop the second `squadRoles` import
     (`:45`).
   - `i.hunting = this.aware.fought && profileOf(this.tacticsProfile).neverCautious` (`:1462`).
   - Take S8's three combat lines: the seeded `this.rng.next()` cover roll, and `profileOf(...)` for the jog and the
     hold above.
   - In `tests/alarmCall.test.ts` "behaviour profiles" and "joinAsReinforcement", set or expect `tacticsProfile`
     (P_STANDARD / P_AGGRESSIVE) instead of the string.

## Polish list (later slices or the feel pass)
1. **The last known position and its ghost never clear after reinforcements fight.**
   - `em.hunting` stays true while any aggressive guard who has fought is searching, so the forget at
     `enemyManager.ts:1451` never runs. The LKP ghost stays on screen and the search music holds until the section
     unloads (Sector) or for the rest of the match (Infiltration).
   - M1 asks for this, but the marker should fade.
   - Done looks like: the forget skips `neverCautious` searchers after `ALERT.searchTime`, or the ghost hides after N
     s.
2. **The `e2e-sectorops` "a guard raises the live section's alarm panel" scenario no longer proves the panel path.**
   - It is at `scripts/e2e-sectorops.mjs:208-258`, and its comment says the stage rises "through the panel (not a
     direct onAlarm call)".
   - If the forced-alerted guard's run takes longer than about 6.5 s, the radio raises it first. The assert
     (`raised && stage + 1`) still passes, but no longer tests what it claims.
   - Done looks like: assert `alarmBy === 'panel'`, or stub `contactThrough` there.
3. **Design 7's "next guard with LOS-free cover" is approximated by "out of the target's sight".** The command caller
   does not take cover while calling. S8's reporter covers this only when the contact caller and the commander are
   the same guard (`pendingFor` counts any open call). An officer who takes the command call stands in the open.
4. **S5b's supervisor role (`ROLE_SUPERVISOR`) is not considered for the command call.** Done looks like: rank him like
   an officer in `contactThrough` / `nextCaller` once S5b is in.
5. **Sector Ops shows two banners on a radio alarm**: "ALARM / Reinforcements inbound" (StealthSystems), then "ALARM
   STAGE n" (the mode). This is old behaviour, now reached by every alarm.
6. **A searcher that never ends, with every search spot unreachable**, asks for a path and bumps `searchK` each tick
   (`enemy.ts` search branch). This is perf only, never a hang.
7. **Carried over from `S6.md`**: no radio chirp on the `joining` bark, no radio alarm in Course mode or Free Roam
   (A30), reinforcement keys are the lowest free (A15), and flanking by reinforcements comes with S8.

## E2E scenarios at risk
- **`e2e-stealth-ai`**
  - `alarm call` (new, not run).
  - `alarm` part 1: the panel must beat the radio, with about 2.5 s of margin at reaction 1.
  - `radio` / `radio stagger`: the radio alarm now fires at about 6.5 s, inside the 8.5 s window, and Hunter queues
    doubled hostiles. They spawn at the reinforce point furthest from the player, (18, -24.5), which is out of voice of
    the asserted guards, so the risk is low.
  - The others: no contact longer than 6.5 s, or the alarm is pinned (`lkp`).
- **`e2e-sectorops`**
  - The S6 block (new, not run).
  - The panel scenario: still passes, but weakened (polish 2).
  - "alarm and no ghost": reinforcements now spawn calm and are told. `hunting >= 2` after 1 s relies on `radio(0)`
    taking effect on the next step. Low risk.
  - Restart scenario: the restart lands about 4 s after the forced alerts, before any command call can complete
    (about 6.5 s).
  - Co-op parts with the AI on (`damageMul` 0): a guard who sees the players can now raise the stage by radio with no
    panel nearby. No assert reads the stage there, so the risk is low.
- **Not affected:** `e2e-takedown`, `e2e-ct-warehouse` and `e2e-enemies` (Clear mode, `coordinated` off),
  `e2e-tactics` (sandbox with stealth off, Mission parked), and `e2e-ctcourse` (Course has stealth off; revisit when
  marlow-final turns stealth on).

## Merge plan (S6 with S5b and S8)
Order: S5b (after its `Enemy.role` -> `job` rename, see S5b-CHECK.md) -> S8 -> S6. S6 then resolves against S8's
numeric profile.
- **S6 x S5b** (TESTING.md, BRIEF.md, ai.md, enemy.ts, enemyManager.ts, sectorMode.ts):
  - `enemy.ts` field block: keep both.
  - `enemyManager.ts` import: union (`squadId`, `GuardSlotTags`, `ReinforceEntry`), and keep the `sectorTags` import.
  - `sectorMode.fill`: S5b's `placeSlot(e, p.slot, index, gs, gs.indexOf(slot))`, then S6's `joinReinforcement`.
  - Docs: keep both.
  - Not a conflict: `assignAlarm` (only S5b changes it), `hear()` (only S5b adds `skip`) and `GuardView` (only S5b).
- **S6 x S8** (enemy.ts three reads, barks.ts, the changes fragment, BRIEF.md):
  - The must-dos 1-3 above.
  - `barks.ts`: the union `'command' | 'moving' | 'covering' | 'flanking'` and all four `BARKS` entries. Keep
    `'command'` in `RADIO_BARKS` and `URGENT`.
  - Fragment and BRIEF: keep both (A23-A25 S8, A26-A28 S5b, A29-A31 S6: no number clash).
- **After the three merges:**
  - `npx tsc --noEmit`
  - vitest: `alarmCall`, `radioWiring`, `radioNet`, `sectorGuardTags`, `postsWiring`, `incidents`, `squadWiring`
  - e2e: `e2e-stealth-ai` and `e2e-sectorops` part 1 on the laptop
