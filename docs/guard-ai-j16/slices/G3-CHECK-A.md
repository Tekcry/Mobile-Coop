# guard-ai-j16 G3: check A
Owner: Guard AI Build. Status: current.

Checker A: Opus 5.5 (fresh), 2026-10-27. Head checked: 0883c34d0, diff `a6f54fa04..0883c34d0` (5d9840d8a src/ai,
119fb2d9e tests, 7e27ec39a BRIEF, 0883c34d0 report).

## Verdict: FIX
One FIX: the cue makes a guard who glimpsed a player less likely to investigate. The rest of the slice is sound: flag
off is today's, the gates, the ray budget, the placement and the allocation are right. Nothing else blocks.

Read: origin/master CLAUDE.md; BRIEF (A1-A11, the A5 / A6 diff), PLAN (G3, sections 1-2), PLAN-CHECK (items 1-7),
G1-G2-CHECK, G3-REPORT; the diff in full; `Enemy.perceive` / `hearTurn` / `onLevel` / `updateAwareness` /
`calmDecide`, `AlertMachine.step` (alertState.ts:143-200), `stepMeter`, `EnemyManager.hear` / `hearFight`, the
`addBody` path, `guardOccluders.ts` writers.

## FIX
1. **The cue holds back an investigation that sight started** (enemy.ts:2902-2904 gates, :2936 `turnT`;
   alertState.ts:170). A guard who glimpsed a player is suspicious with cause RISE_SIGHT. Today he investigates by
   the linger rule (suspicious 3.2 s with meter >= 0.15, only while not `turning`). If that player (or another) then
   moves out of sight and his moving shadow is in the guard's cone, every think re-stamps `turnT = hearLook`. That
   holds `turning` true, the linger rule never fires, and once the shadow stops he calms. The player's own shadow
   saves him from an investigation. That is off-intent: Q14's "A faint cue" ("raises suspicion only") may add
   suspicion, never take it away.
   - Shown with a throwaway copy of the builder's harness (real `perceive`, `updateAwareness` and `AlertMachine`;
     deleted, not committed). B at (2, 9) is seen for a while, then goes behind a wall. A's moving footprint is at
     (0, 4-6) the whole time. Each run is 20 s, cues null vs cues on:
     - B seen 0.75 s, light 0.6 (meter 0.55). Off: suspicious, then investigating ('saw'). On: suspicious only.
     - B seen 0.75 s, light 1.0. Same as above.
     - B seen 2 s, light 0.4 (meter 0.49). Off: suspicious, then investigating ('saw'). On: suspicious only.
   - Fix (recommended): add `this.sawMoment` to the gate line, so a calm moment that rests on sight keeps its own
     look and linger rule. This matches the builder's own "sight keeps his look". `sawMoment` clears when he calms or
     the meter drains to 0, so the cue comes back after.
   - Alternative: keep the meter floor and the stimulus but skip the `turnT` stamp while `sawMoment`. This is more
     aggressive: a drained glimpse plus a shadow then lingers into an investigation, with cause sight.
   - Either way, A6 says which. Done looks like: a `shadowNoticePerceive` case that runs the scenario above and
     asserts that with cues on he reaches investigating whenever he does with cues null (cause RISE_SIGHT both
     times). The existing "a cue right after a real glimpse" case is conditional (`if (levels.has('investigating'))`)
     and passes either way; this case replaces or tightens it.

## Checked and confirmed
- **Flag off / cues null is today's code.**
  - `fieldLight` (enemy.ts:264-268) with `chars` null or absent makes the same 4-argument `totalAt` call.
  - `shadowLook` returns on its first line.
  - `onLevel`'s new condition is false while `cueRise` is false.
  - `witnessKill` (enemyManager.ts:1960-1965) makes the identical 4-argument call.
  - The body loop moved into `stepBodies` (:4161-4177) line for line: same `field` and `bodies` locals, `b.update(dt)`,
    `lightT`, the `present` test and `lightT = 1`. Only the `chars` ternary is new. It is called at the old spot,
    before the dead-entry sweep, which is unchanged.
  - `Body.num` / `id` give the same `b${n}` values from the same counter.
  - The only per-step additions are `cueT += dt` and the `cueRise` clear. The arity tests (4 vs 6 arguments) prove
    the calls.
- **The extra gate (no cue while any player's rate is above `leak`) is confirmed.** Without it, a cue for B in the
  same think as a sighting of A would move the stimulus off the player he sees and stamp `turnT`. That blocks the
  linger rule for that sighting, the same-think form of FIX 1. It is stricter than the PLAN's per-player wording,
  never looser (Polish 2).
- **Gates.** Not alerted, passive or a dog; `incident < 0`; level unaware, cooldown or suspicious. These match A6, and
  investigating and searching are excluded as `hearTurn` excludes them. Not on mission orders: deferred, recorded in
  A6 (no `orderSlot` on master).
- **Nearest point over the players.** Live players only, by `slotOf`. The best is kept by a strict `<` on `NO_DIST`,
  so ties keep the first. `best.set(out)` copies into a member buffer.
- **One counted ray** (`raysThink` / `raysStep`), whether or not it is blocked. At 3+ players the cue is skipped when
  `raysThink + 1 > maxRays`. The body ray is outside this count, as it is today.
- **Placement.** The cue runs after the tail and `lookForBodies`, so a sub-leak glimpse's stimulus never overwrites
  the cue. With no live player (`!best`), `perceive` returns before the cue, which is right (no shadow to read).
- **The inlined reaction** matches `hearTurn`'s once the gates hold: meter `max(meter, 0.35)`, stimulus,
  `hasStimulus`, `turnT = 2.4`. No `heard`, `lastKnown`, `sawOnce`, `target`, board report, `reportIntruder` or
  incident: `shadowLook` writes only the meter, stimulus, `turnT`, the cue record, `cueRise` and the ray counters.
- **It never reaches investigate alone.** PLAN section 1's arithmetic (0.35 drains below 0.15 inside the 2.4 s look)
  holds against `AlertMachine.step`. The 30 s stepped run and the come-and-go run prove it with the real machine.
- **Host and solo only.** A co-op client has no `EnemyManager`, so no guard ctx carries `cues`.
- **The bark hush** (`onLevel`, :2375-2376). `cueRise` is set in the think and read in the same step's
  `updateAwareness`: `perceive` runs just before it in `update`, the rise happens that step (0.35 minus one step's
  drain is still above 0.3), and the flag is cleared at the end of `updateAwareness`. A rise with sight
  (`sawMoment`) or `heard` behind it gets RISE_SIGHT / RISE_SOUND and barks. The `hearTurn` coincidence the builder
  names is real but small, and it has a one-line fix (Polish 1). Acceptable; not a bug that blocks.
- **`fillOccluders`.**
  - Only -1 counts as overflow; `OCC_FAR` is a skip.
  - It runs living guards and dogs in list order, then `present` bodies (not carried, hidden or gone).
  - Keys are `occKey(kind, num)`, and the dog test is the same as `witnessKill`'s (`dog !== null` / truthy).
  - A grabbed guard is alive and written standing at his placed position. That is physical, with one consequence in
    Polish 4.
  - A dead dog has no `Body` (it goes to `dogCorpses`), so it casts nothing, as A9 says.
  - No closures and no doubles across a call: the writers take ints and refs.
- **`AiContext` getters (item 1).** `chars: () => this.chars` and `cues: () => this.cues` are in the ctx literal. The
  test builds a real `EnemyManager`, gives the stand-in its ctx, sets `em.cues` / `em.chars` after construction and
  sees the next perceive fire.
- **Allocation.** `shadowLook` reads 0 B on all four paths (hit, blocked, no footprint, gated), and `fillOccluders`
  reads 0 B, by the repo's `bytesPerCall` method. The stand-in is built with fast properties (`standIn`) so the reading
  measures the code, not dictionary-mode boxing. The whole-think case is relative (with cues <= without) and
  order-dependent, as the report says; the per-path `shadowLook` case is the real proof.
- **Tests test behaviour.** The stand-in runs the real `perceive`, `shadowLook`, `updateAwareness` and
  `AlertMachine`. The 30 s run steps think and awareness at real rates, and asserts the levels, the top of the meter,
  the calm after the cues stop, and no bark.
- **BRIEF A5 / A6.** Michael's words (G379 "A faint cue") and the picked option ("raises suspicion only, never
  detection") are untouched. The A5 hush is the plan check's item 2 choice, and the A6 gate and mission-order lines
  record item 3 and the extra gate faithfully. A6 needs FIX 1's line.

## Polish list (not blocking)
1. Hush coincidence (enemy.ts:2931). A footstep's `hearTurn` that lifts an unaware guard to 0.3-0.45 earlier in the
   same step as a cue think gets a silent rise, which drops today's 'suspicious' line. The player making the shadow
   is often the one making the footsteps. Fix:
   `if (lvl !== 'suspicious' && this.meter < PERCEPTION.suspicious) this.cueRise = true;` (the cue is then the one
   that lifts him), with a test calling `hearTurn` before the cue think.
2. PLAN section 1 still says "takes every live player whose sight rate this think is <= leak". Restate it as the
   BRIEF's A6 (nobody seen this think), plus FIX 1's gate.
3. A6's last clause ("only for a live player whose sight rate ... <= leak") is now implied by "sees nobody this
   think". Trim it.
4. A grabbed guard's capsule stands right in front of the holder, and the holder's light reads skip only his own
   player key. So the hostage shadows the holder's chest sample from lamps on the hostage's side, in both the meter
   and the guards' `fieldLight`. It is physical; worth one look on the walk.
5. A lured posted guard (`lure.active`) goes suspicious from a cue but keeps to his lure walk (calmDecide runs
   `lureStep` before the `turnT` look), as he does for `hearTurn`. This is the same "keeps walking" reason A6 gives
   for mission orders. Gate it there too, or say in A6 why it is fine.
6. A5's "a rise with ... a sound behind it barks as today" holds for `hear` (`heard`), not for a `hearTurn` sound
   (cause none) in the same step as a cue. Polish 1 makes it hold.

## Commands and results
- `git rev-parse --abbrev-ref HEAD`: feature/guard-ai-j16, head 0883c34d0 (fetched).
- `npm run typecheck:fast`: clean (exit 0).
- `npx vitest run` on 100 files:
  - Every test file under tests/ that imports src/ai/enemy, enemyManager, perception, alertState or body (grep, 99
    test files; the 3 helper hits left out).
  - Plus `shadowNoticePerceive`, `shadowNotice`, `guardOccluders`, `guardAiAllocManager` and `coopPerception`.
  - Result: 100 files passed, 1726 tests passed, 1 skipped, 2 todo (107 s).
- A throwaway `tests/zzScratchG3A.test.ts` (the harness above plus an 18-case sweep of glimpse length x light, cues
  null vs on; deleted, not committed) gave the FIX 1 readings.
- Not run, as instructed: npm run dev, e2e, a full npm run check.
