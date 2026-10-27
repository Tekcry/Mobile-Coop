# guard-ai-j16 PR 1: check B
Owner: Guard AI Build. Status: current.

Checker B: Opus 5.5 (fresh, independent of check A), 2026-10-27. Head checked: 9edc30365. Scope: all of PR 1 (G1 + G2
+ G3 + G3's fix round), `git diff ef5889a44 9edc30365 -- src tests`.

## Verdict: FIX
Two FIX items, both in `Enemy.shadowLook` / `onLevel` and both cheap. Everything else holds: flag off / cues null is
today's on every path, co-op is host and solo only with no wire or save change, the hot paths allocate nothing, the G1
shapes write the contract exactly as `CharOccluders.add`, and the cue never reaches investigate alone.

Read: origin/master CLAUDE.md; BRIEF (A1-A11); PLAN (claims, G1-G3, sections 1-2); G1-G2-REPORT; G3-REPORT with its
fix round; the diff in full; `src/world/charOccluders.ts`, `src/world/shadowCues.ts`, `src/game/charOccluderFill.ts`,
`gameState.ts` `fillChars` / `updateLight` / `playerRefsInto` and the step order (:2250-2257); `Enemy.update` head,
`perceive`, `hear`, `hearTurn`, `ack`, `sendTo`, `onLevel`, `updateAwareness`, `calmDecide` (unaware / cooldown,
suspicious, investigating), `knownSpot`; `AlertMachine.set` / `step`; `stepMeter`; `EnemyManager.hear`, `witnessKill`,
`update` tail; `Body.present`, `bodyLie.ts`; `BARK_EVENTS` / the 'clear' lines. Only then the earlier checks.

## FIX
1. **A cue-only episode on a cooldown guard ends with a bark** (enemy.ts:2389; the hush is only the rise, :2379).
   A5 says the cue causes no bark. A guard in cooldown (every guard after combat stays there, and every guard for 45 s
   after an investigation) who sees only a moving shadow rises to suspicious silently, then calms back to
   `this.calm` = cooldown, and `onLevel(suspicious, cooldown)` barks 'clear' ("Must have been nothing." / "Back to
   it." / "All quiet."), which also goes to co-op clients as a bark event. From unaware there is no line on the way
   down, so the gap is cooldown only.
   - Shown with a throwaway copy of the builder's harness (real `perceive`, `updateAwareness`, `AlertMachine`; deleted,
     not committed): `aware.set('cooldown')`, A's moving footprint at (0, 4-6) for 3 s, then still for 10 s. Levels
     `suspicious > cooldown`, bark calls `[["clear"]]`.
   - Fix: keep the hush for the whole episode. For example a `cueQuiet` flag set where the hushed rise happens
     (`onLevel`, the `cueRise && RISE_NONE` branch), cleared by any later sight, `heard`, escalation or level change
     other than the calm-down, and `onLevel` skips 'clear' on suspicious -> cooldown while it is set. Or, if the lead
     wants the line, record in A5 that the calm-down from cooldown barks as for `hearTurn`. Done looks like: a
     `shadowNoticePerceive` case from cooldown asserting no bark over the episode (or A5 changed to match).
2. **The cue takes a sound's place: it re-aims a heard noise's walk-over and steals a hearing turn's look**
   (enemy.ts:2905-2908 gates, :2944-2947 stimulus and `turnT`; investigating reads "the latest stimulus is the spot",
   `calmDecide`). Nothing in the gate list stops the cue when his calm moment rests on a sound, so the shadow point
   overwrites the noise's stimulus:
   - `hear()` (the path for melee non-dog guards in the live modes, and every guard in the parked Mission / Hunter
     modes): `heard`, `aware.sound`, and after `hearLook` he investigates the stimulus. Harness run: `e.hear(6, 2, 10)`
     on an unaware guard, A's moving footprint at (0, 4-6). Cues null: investigating with stimulus (6, 2). Cues on:
     investigating with stimulus (0, 4). The walk-over goes to the shadow, not the noise.
   - `hearTurn()` (every coordinated guard in reach of a noise or a distraction who is not sent): `e.hearTurn(6, 2, 20)`
     then one think: stimulus (0, 4), `turnT` 2.4. He faces the player's shadow instead of the distraction. The same
     holds for `ack`'s look.
   - Off-intent: G2's own reason for `meter` 0.35 is "a heard sound outranks a shadow" (shadowNotice.ts `SHADOW_NOTICE`
     doc), and A6's "a shadow may add suspicion, never remove it": here it removes the reaction he would have had with
     cues off (look at, or walk to, the sound) and picks where he walks. A noisemaker thrown to pull a guard away is
     beaten by the thrower's shadow.
   - Fix (the "sight first" rule, for sound): gate out a calm moment that rests on a sound (`this.heard ||
     this.heardMoment`; `heard` because a `hear()` earlier the same step sets `heardMoment` only in `updateAwareness`),
     and do not take over a hearing or ack turn in progress: when `turnT > 0` and the turn is not the cue's own (a flag
     the cue sets and `hearTurn` / `ack` / `sendTo` clear), either skip the cue or lift only the meter. A6 says which.
     Done looks like: two cases, `hear()` then cues investigates the noise's point, and `hearTurn()` then cues keeps
     the sound's stimulus for the look.

## Checked and confirmed
- **Intent.** Meter floor 0.35, `turnT` = `hearLook` 2.4 s, stimulus at the point; `shadowLook` writes only the meter,
  stimulus, `turnT`, the cue record, `cueRise` and the ray counters: no `heard`, `lastKnown`, `sawOnce`, target,
  report, incident, `reportIntruder` or LKP. It never reaches investigate alone: after the last cue 0.35 drains below
  `lingerMeter` in 1.11 s (rate 0) or 2.22 s (sub-leak half drain), inside the 2.4 s look, and repeated cues keep
  `turning` true (alertState.ts:170). `riseCause` stays `RISE_NONE`, so the glimpse follow and the lookout radio
  (enemyManager.ts:2431, :2823, gated on `RISE_SIGHT`) never fire from a cue.
- **`sawMoment` gate.** With it, the cue never re-stamps `turnT` after a real glimpse, so the linger rule fires as with
  cues off. The other order (a cue first, then a glimpse) never delays a reaction either: he is suspicious from
  earlier (`t` larger), the cue's last `turnT` ends at most 2.4 s after a think before the glimpse, and the meter is
  at least the cues-off meter at every step, so every timer (linger 3.2 s, investigate 0.6, detect 1) fires no later
  than with cues off.
- **"Sight first" (cue raises `aware.sensitivity`, a sub-leak glimpse becomes a real one): acceptable under Q14.** A
  suspicious guard looking harder is the suspicion the picked option grants; the detection that follows is sight's
  (`RISE_SIGHT`), not the shadow's, and the 33-case sweep shows he never investigates less with cues on.
- **Flag off / cues null is today's, path by path.** `fieldLight`: `chars` null or absent gives the same 4-argument
  `totalAt` call; `occKey(...)` in the callers is an int computed and dropped. Body light: `stepBodies` is the old loop
  line for line, called where it was (after `spottedStep`, before the dead sweep), only the `chars` ternary new.
  `witnessKill`: same. `perceive`: `shadowLook` returns on its first line. The bark: `cueRise` is never set, so the
  `onLevel` condition is today's. `Body.id` keeps `b${n}` from the same counter. Per-step additions: `cueT += dt` and
  the `cueRise` clear. The arity tests (4 vs 6 arguments) pin the calls.
- **Co-op.** `EnemyManager` exists only in solo and on the host; `cues` / `chars` are null until G4a / G4b; the client
  keeps `fillVictims` for puppets. No file under src/net or src/save changed; the bark hush removes an event, it adds
  none.
- **Player keys.** `fieldLight`'s `occKey(OCC_KIND.player, i)` uses the `players()` index; `players()` and `fillChars`
  both read `playerRefsInto` in the same order, which is `fillPlayers`' slot order. A full contract gives key -1
  (skip nothing), which is right because that player then has no capsule.
- **Allocation.** `fillOccluders` 0 B per fill (13 guards and dogs, 4 bodies); `shadowLook` 0 B on hit, blocked, no
  footprint and gated. No closures, no iterators, no double crosses a call (`NOTICE_IN`, `cueOut` / `cueBest`, the
  three `cueV` stores, `CUE_SLACK`). The shared-constructor `standIn` is sound: one map per field list mirrors a
  class's instances, so the per-path reading measures `shadowLook`, not dictionary-mode or megamorphic stand-in
  stores. The whole-think case is relative (with cues <= without); the per-path case is the proof.
- **G1 shapes vs the contract.** `put` writes `cap[0..7]` and `owner` exactly as `CharOccluders.add`; owner keys
  `occKey(kind, num)`; cull is `fillVictims`' (horizontal `hyp2 <= FILL.reach` from any pin slot, before the full
  check); -1 only when full, `OCC_FAR` a skip. `simHead` is refreshed by `syncHitboxes` on the taken and blinded paths
  too, so a grabbed guard's capsule follows his placed body. Light parity holds by construction: the meter,
  `ShadowCues` and `pictureInto` read the one contract.
- **Edge cases.** Dead / KO guards: `update` returns before `perceive`, `fillOccluders` skips `!alive`. Grabbed
  (`taken`) and flashbanged: `update` returns before `perceive`. Carried or hidden bodies: `present` false, skipped. A
  dead dog leaves no `Body`. Dogs: gated. OUT players: `p.target.alive` skipped; no live player: `perceive` returns
  before the cue. 4 players: `capped` budget checked before the ray and counted after. Lure: gated. Board task:
  `incident >= 0` gated (`sendTo` / `checkLight` set it). Mission orders: not on master; A6 records the line to add.
  No sleeping-guard state exists in src/ai. `hearTurn` in the same step: the cue sets `cueRise` only below 0.3, so a
  `hearTurn` that already lifted him barks (the fix round's test); the look-steal is FIX 2.

## Agreements and differences with the earlier checks
- G1-G2-CHECK (PASS): agree on every point, including the shape notes as walk polish and the `FILL` import.
- G3-CHECK-A (FIX 1, sight): agree with the FIX and with the builder's fix (`sawMoment` gate); verified above that the
  reverse order cannot delay either. Agree with polish 1 / 6 (hush only when the cue lifts him) and polish 5 (lure).
- Differ: check A's "Checked and confirmed" lists the gates and the hush as complete. It missed that a sound's moment
  is not gated (FIX 2: the same shape as its FIX 1, for hearing) and that the hush covers only the rise, so cooldown
  guards bark on the way down (FIX 1 here).

## Polish list (not blocking)
1. A noise heard while he is in a hushed cue-suspicious episode changes no level, so it barks nothing: a footstep that
   would have drawn today's 'suspicious' line from an unaware guard is silent if his shadow came first. FIX 1's flag
   can cover it (bark 'suspicious' on the first `heard` or sight while the flag is set).
2. A guard on the breaker walk (`brkGroup >= 0`) is not gated. A cue makes him suspicious, but `calmDecide` runs
   `breakerStep` while `rate <= 0`, so he keeps walking: the lure and mission-order reason in A6. Gate it there too,
   or say in A6 why not.
3. The cue ignores difficulty (`perceptionMul`, `diff.perception`): an easy guard notices a shadow as a hard one does.
   Fine for a fixed rule; say so in A5 or scale `range` at the walk.
4. A new body's first light sample (`lightT` 0, stepBodies) runs in the same step as the death when he dies inside
   `enemyMgr.update` (after `fillChars`, gameState.ts:2250-2257). The contract then still holds his standing capsule
   (key `occKey(guard, num)`), which the body's skip (`occKey(body, num)`) does not cover, so his ghost may shade his
   own body for its first 1 s sample. Live once G4a. Fix: first sample a step later, or skip the guard key too.
5. G4a must set `enemyMgr.chars` and switch the fill to `fillOccluders` in one commit: `witnessKill` and
   `stepBodies` skip by `num`, `fillVictims` keys guards by list index.
6. A cue on a cooldown guard restarts his `cooldownTime` (45 s) clock (`AlertMachine.set` resets `t`), as a
   `hearTurn` does. More caution, never less; worth one look on the walk.

## Commands and results
- `git rev-parse --abbrev-ref HEAD`: feature/guard-ai-j16, head 9edc30365.
- `npm run typecheck:fast`: clean.
- `npx vitest run` on 100 files (the 99 test files under tests/ importing src/ai/enemy, enemyManager, perception,
  alertState or body, shadowNotice and shadowNoticePerceive among them, plus guardOccluders): 100 passed, 1727 tests
  passed, 1 skipped, 2 todo (131 s).
- A throwaway `tests/zzProbeB.test.ts` (the builder's harness plus three cases: the cooldown episode, `hear()` then
  cues vs null, `hearTurn()` then a cue think; deleted, not committed) gave the FIX readings above.
- Not run, as instructed: npm run dev, e2e, a full npm run check.

## Re-check 54cc1b8f8
PASS. Checker: Opus 5.5 (fresh), 2026-10-27. Scope: `git diff 175358ad4 54cc1b8f8` against the FIX list above and
G3-REPORT "## Fix round 2".

- FIX 1 (cue-only episode barks 'clear' on the way down): closed. `cueQuiet` is set only by the hushed rise
  (`onLevel`, `cueHush`), cleared by every `onLevel` call (all six `aware.set` sites in enemy.ts pair with `onLevel`;
  `AlertMachine` has no other level mutator), by `ack`, by `hearTurn` (the 'suspicious' line only when loud) and by a
  sight or `heard` after `aware.step` (the skipped line). KO / death: no think, the instance is dropped; a revive is a
  new `Enemy` (`inherit` copies neither flag). Leaving the flag on (cues null): never set, so `onLevel`'s 'clear'
  condition, `hearTurn` and `ack` are today's.
- FIX 2 (the cue takes a sound's look / walk): closed. Gate `heard || heardMoment || (turnT > 0 && !cueTurn)` sits
  after the cues-null return. `turnT` is set > 0 only by `hearTurn`, `ack` (both clear `cueTurn`) and the cue (sets
  it); every other write is 0, so a stale `cueTurn` after a look ends is harmless. Same-step order is safe both ways:
  a `hearTurn` before the think gates the cue; one after it overwrites the stimulus / look and clears the flag, and
  `cueRise` is already cleared at the end of `updateAwareness`.

Confirmed: check A's `sawMoment` / `lure.active` gate unchanged; never investigate alone unchanged (the cue still
re-stamps only its own look). Breaker walk gate (`brkGroup >= 0`) right: `onLevel` keeps the walk on a rise to
suspicious and `calmDecide` runs `breakerStep` while `rate <= 0`. Body skip `chars === null || b.age > dt`: `Body.age`
starts 0 and `b.update(dt)` runs first, so with a contract the first sample is the second step; cues / chars null is
the old condition. No allocation added (two booleans, one local).

New finding (polish, not blocking):
1. A faint `hearTurn` (or an ack) in a cue-only episode on a cooldown guard clears `cueQuiet`, so the calm-down says
   'clear' where cues off says nothing. Probe (throwaway copy of the harness, deleted): cooldown, 1 s of A's moving
   footprint, `hearTurn(6, 2, 7)`: cues off barks `[]`, levels `cooldown`; cues on barks `['clear']`, levels
   `suspicious > cooldown`. A faint `hear()` matches cues off (both `['suspicious', 'heard', 'clear']`). BRIEF A5
   records this choice, and a sound did happen, so it stays; if the lead wants the cue strictly line-free, keep
   `cueQuiet` on a non-loud `hearTurn` and on `ack` (flips the ack case at `tests/shadowNoticePerceive.test.ts:673`).

Commands and results:
- `git rev-parse --abbrev-ref HEAD`: feature/guard-ai-j16, head 54cc1b8f8.
- `npm run typecheck:fast`: clean.
- `npx vitest run` on the 77 test files under tests/ importing src/ai/enemy, enemyManager or alertState (with
  shadowNoticePerceive and guardAiAllocManager) plus shadowNotice: first run 76 passed, 1 failed (a `beforeEach`
  asset-load timeout in one of guardBody / guardFigureWarm / guardHelmetDrop / guardLampCasters under load); second
  run no failures; those four plus shadowNoticePerceive and guardAiAllocManager alone: 6 files, 67 passed.
- `src/ai/enemy.ts` and `src/ai/enemyManager.ts` at 175358ad4 in the working tree: `shadowNoticePerceive` 10 failed,
  20 passed (the 8 new cases, the rewritten hearTurn case, the gates case); restored with `git checkout HEAD`, tree
  clean.
- Not run, as instructed: npm run dev, e2e, a full npm run check.
