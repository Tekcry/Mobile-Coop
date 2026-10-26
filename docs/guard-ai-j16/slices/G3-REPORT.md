# guard-ai-j16 G3: report
Owner: Guard AI Build. Status: current.

Builder: Opus 5.5, 2026-10-27. Branch `feature/guard-ai-j16` on a6f54fa04 (base ef5889a44, master 1b20393c7).
Commits: 5d9840d8a (src/ai wiring), 119fb2d9e (tests), 7e27ec39a (BRIEF A5 / A6). Still dark: `EnemyManager.chars`
and `.cues` are null until G4a / G4b set them, and with both null every path is today's (below).

## What changed
- `src/ai/body.ts:77` `Body.num` (the counter `id` already used; `id` is still `b${num}`), `:81-82` `occR` /
  `occReach`, set once in the constructor from the rig's proportions (`:123-124`, `bodyOccR` / `bodyOccReach`).
- `src/ai/enemy.ts`:
  - `:200`, `:203` `AiContext.chars?()` / `cues?()`: optional getters.
  - `:264` `fieldLight(ctx, x, y, z, skip = -1)`: no contract, the same 4-argument `totalAt` call as today; a contract,
    `totalAt(..., chars, skip)`. Callers `:2794` (the player loop) and `:2856` (the tail) pass
    `occKey(OCC_KIND.player, i)`. `i` is the `players()` index, the same order and key as `fillPlayers`.
  - `:567` `Enemy.occR` (assigned at `:806`, `guardOccR(def.build, def.scale)`, once per spawn). `:570-580` the cue
    record `cueT` / `cueX` / `cueZ` / `cueSlot` (A11), two `Float64Array(NOTICE_OUT)` buffers, the ray's `Vector3` and
    `cueRise`. `:2676` `cueT += dt` each step.
  - `:2884` `perceive` ends with `this.shadowLook(eye, capped)`, after `lookForBodies`. `:2898` `shadowLook`:
    - Gates, in order: cues non-null and `enabled`; not alerted, passive or a dog; `incident < 0`; level unaware,
      cooldown or suspicious; at 3+ players `raysThink + 1 <= PERCEIVE.maxRays`; no player above `leak` this think.
    - Over the live players with a cue slot (`slotOf`), it takes the nearest `noticeInto` point by `NO_DIST`. The
      best is copied into `cueBest`.
    - One ray, counted in `raysThink` / `raysStep`, through `losTo` with `SHADOW_NOTICE.slack`.
    - If the ray is clear, it applies `hearTurn`'s reaction inline (meter floor 0.35, stimulus, `turnT = hearLook`) and
      fills the record. From calm it also sets `cueRise`.
  - `:2376` `onLevel`: a rise into suspicious with `cueRise` and cause `RISE_NONE` does not bark. `:3038` clears
    `cueRise` at the end of each `updateAwareness`.
- `src/ai/enemyManager.ts`:
  - `:184`, `:188` the fields `chars` / `cues` (null). `:715-716` the ctx getters `chars: () => this.chars`,
    `cues: () => this.cues`.
  - `:848` `fillOccluders(occ, pin, n)`: living guards and dogs in list order (`putDog` when `dog`, else `putGuard`),
    then `present` bodies (`putBody`). It counts only `=== -1` as overflow (`OCC_FAR` is a skip) and returns that
    count. It does not clear the contract (`fillPlayers` does).
  - `:1965` `witnessKill`: with a contract, skips `occKey(dog ? dog : guard, v.num)`. The victim is still in this
    step's fill.
  - `:4149` / `:4161` the body loop moved verbatim into `stepBodies(dt)`, so a test can reach it. With a contract it
    skips `occKey(OCC_KIND.body, b.num)`.
- `docs/guard-ai-j16/BRIEF.md` A5 / A6: the decisions below.

## Fold-ins
1. AiContext getters (item 1): `chars` and `cues` are getters in the literal (`enemyManager.ts:715-716`), like
   `stealth`. Test "AiContext reads chars and cues through getters" builds a real `EnemyManager` and gives a stand-in
   guard the manager's own ctx. A perceive with null cues does nothing; after `em.cues = ...` and `em.chars = ...`, the
   next perceive fires the cue (one ray, meter 0.35).
2. Bark (item 2): hushed, to match A5. `cueRise` is a one-step flag read in `onLevel` next to the existing `quietRise`
   hush, so no hack was needed. It hushes only a rise whose cause is `RISE_NONE`: a rise with sight (`sawMoment`) or a
   sound behind it barks as today, and so does a later escalation. A5 now says so. Test: "he goes suspicious silently",
   plus a control case where a non-cue rise barks.
3. Mission orders (item 3): guard-ai-mission-hooks is not on master (`git grep orderSlot origin/master -- src/ai` finds
   nothing), so there is no `orderSlot` to gate on. Decision: gate them out. A guard that goes suspicious and keeps
   walking contradicts the walk item ("he stops and looks"), and a mission order is a scripted beat a shadow should not
   touch. A6 records it. Whichever branch lands second adds `this.orderSlot >= 0` to `shadowLook`'s gate line, with a
   test case.
4. Placement and the ray budget (item 6): the cue runs at the very end of `perceive`. A sub-leak glimpse of another
   player writes the stimulus in the tail, and the cue then overwrites it, so `cueX` / `cueZ` equal the stimulus he
   turns to (test "a sub-leak glimpse ... does not take his look off the shadow"). At 3+ players the cue is skipped
   when `raysThink + 1 > PERCEIVE.maxRays`; when it runs, its ray counts (test "3+ players": 9 used, no cue ray; 6
   used, the cue ray makes 7).
   - Added beyond the PLAN: no cue when any player's rate this think is above `leak`. A guard who sees someone keeps
     his look on him instead of turning to a shadow (test "a player he sees"). This follows A6 ("he does not see him")
     and G2's "a heard sound outranks a shadow".
5. 16-bit owner keys (polish 4): noted in `fillOccluders`' doc comment (`enemyManager.ts:839-846`). Not widened:
   `occKey`'s `kind << 16 | index & 0xffff` is the Sector Ops contract (`world/charOccluders.ts:25`), outside this job's
   claims.
6. Purity tests (polish 6): `guardOccluders.ts` and `shadowNotice.ts` gained no imports, so their pinned import lists
   are unchanged and pass.

## Flag off / cues null: today's paths
- `fieldLight`, the body light and `witnessKill` call `totalAt` with exactly today's four arguments when `chars` is
  null. Tests assert the call arity: 4 with no contract; with one, the contract and the owner key at positions 4-5.
- With `cues` null (or no getter on a stand-in's ctx), `shadowLook` returns on its first line: no ray, no field
  written (test "no cues").
- `cueT += dt` and the `cueRise` clear are the only per-step additions with the flag off.
- Every existing test importing enemy / enemyManager / perception / alertState / body passes unchanged.

## Tests and results
- `npm run typecheck:fast`: clean. `npx eslint` on the four touched files: clean.
- `tests/shadowNoticePerceive.test.ts`, 21 tests. A stand-in guard on Enemy's prototype runs the real `perceive`,
  `shadowLook`, `updateAwareness` and `AlertMachine` against a real `ShadowCues` whose arrays are written directly, and
  a real `EnemyManager` with stubs. Cases:
  - The reaction: meter 0.35, stimulus, `hearLook`, one ray to (x, 0.05, z), the record; no `sawOnce`, `heard` or
    `lastKnown`.
  - The silent rise, and a non-cue rise that still barks.
  - Null cues and a missing getter.
  - The gates: alert, passive, dog, incident, investigating and searching are blocked; cooldown and suspicious react.
  - A blocked ray, a still or faint shadow, a seen player, a sub-leak glimpse, the nearest over two players, and the
    3+ player budget.
  - The PLAN's 30 s `alertState`-stepped run: suspicious, never investigating or alert, meter at most 0.35. After the
    cues stop he returns to unaware within 15 s, with no bark the whole time.
  - Cues that come and go for 15 cycles: never investigating.
  - A cue right after a real glimpse (plan check item 4): never alert; if he investigates, the cause is `RISE_SIGHT`.
  - fieldLight's owner key.
  - `fillOccluders`: order, keys, kinds, skips (dead, absent, far), overflow counted only for -1, and no player slots.
  - The getter wiring, and the body / `witnessKill` keys.
  - Allocation (below).
- Allocation (`bytesPerCall`, the method of tests/guardAiAllocManager.test.ts):
  - `fillOccluders` reads 0.0 B per fill (13 guards and dogs, 4 bodies, 14 written).
  - `shadowLook` reads 0.0 B per call on each path: hit, blocked ray, no footprint, gated.
  - A whole think with cues, alternating hit and blocked, reads no more than the same think without cues (80 / 80 B in
    file order).
  - Today's stand-in `perceive` reads 16-80 B depending on what ran before it in the file: it is megamorphic, and the
    cost is outside the cue. So that case asserts the cue adds nothing; it does not assert an absolute 0.
  - The stand-in is built by a constructor of named stores (`standIn`). With `Object.assign` it was in dictionary mode,
    and every double store boxed 16 B (the cue's `turnT` write read 16 B).
- `npx vitest run` on 106 files (every test importing enemy.ts, enemyManager.ts, perception, alertState or body.ts,
  plus the new and touched tests, torchOcclusion, coopPerception, barkCause and the G1 / G2 / Sector Ops neighbours):
  103 test files, 1764 passed, 1 skipped, 2 todo, 0 failed (65 s). The 3 listed paths that are not test files are
  helpers.
- Not run, as instructed: npm run dev, e2e, a full npm run check.

## PR 1 size (G1 + G2 + G3) against the ~1.5k cap
`git diff --shortstat ef5889a44..HEAD`: 12 files, +2083 / -20. Of that:
- src: +505 (guardOccluders 182, shadowNotice 129, enemy 106, manager 77, body 11).
- tests: +1374 (guardOccluders 281, shadowNotice 407, shadowNoticePerceive 686).
- docs: +221.

**Over the cap by ~0.6k, almost all tests**: the PLAN's ~1.0k assumed ~620 test lines. Options for the orchestrator:
take PR 1 as is (code 505 lines), or split it into PR 1a = G1 + G2 (pure modules, ~1.0k) and PR 1b = G3 (~0.9k).

## For the two checkers
- The extra gate (no cue while any player is seen above `leak`) is mine, not the PLAN's. It is stricter than A6's
  per-player wording; please confirm or reject.
- The reaction is written inline, not through `hearTurn(x, z)`: two double arguments to a call V8 may not inline would
  box, and the gates already exclude `hearTurn`'s own early returns (investigating, searching, an incident). If
  `hearTurn`'s reaction changes, `shadowLook` must follow (its doc names `hearTurn`).
- The hush keys on `riseCause === RISE_NONE`. A `hearTurn` (also cause none, no `heard`) on the same step as a cue
  would rise silently too. That needs a same-step coincidence, and the next real sound or sight still barks.
- `fillOccluders` keeps a taken (grabbed) guard: alive and standing in the player's arms. A dead dog leaves no `Body`
  and is not written (A9 lists lying bodies only).
- `stepBodies` is the old loop moved verbatim plus the key; nothing else in `update` changed.
- The cue reads `P_RATE`, the module scratch the same `perceive` call just wrote for this guard (guards perceive one
  at a time).
- Polish 1-3 and 5 from the G1-G2 check (capsule top, dog and body fit, the FILL import, the hitboxes path comment) are
  untouched: they are G1 module changes and walk calls, outside G3.
- G4a / G4b next: `enemyMgr.chars = this.charOccluders` after construction (now safe: the getters), the `fillChars`
  switch to `fillOccluders`, and `enemyMgr.cues = this.shadowCues` after S3b-2.

## Fix round
Builder: Opus 5.5, 2026-10-27, on bf23ec3f6 (check A: FIX). Commits 53695c4ee (src/ai), 38af513b1 (tests), a38756938
(BRIEF A5 / A6, PLAN section 1). Flag off / cues null: still today's (every new line is inside `shadowLook` after its
first-line return, plus one module constant).

- **FIX 1, sight keeps its look** (`src/ai/enemy.ts:2908`): `if (this.sawMoment || this.lure.active) return;` in the
  gate list. A guard whose calm moment rests on a real glimpse gets no cue, so nothing re-stamps `turnT` and the linger
  rule (suspicious 3.2 s, then investigate) fires as with cues off; `sawMoment` clears when he calms or drains to 0,
  and the cue comes back then. A6 records it. Test `tests/shadowNoticePerceive.test.ts:511` (replaces the conditional
  "a cue right after a real glimpse"): the checker's three scenarios (B seen 0.75 s at light 0.6 and 1.0, 2 s at 0.4,
  then behind a wall with A's moving shadow at (0, 4-6)) investigate with cues off and on, cause `RISE_SIGHT` both
  times; a 33-case sweep (0.25-3 s x light 0.2-1.0, brighter glimpses past 1 s left out: they go alert, which the
  stand-in has no combat for) asserts cues on investigates whenever cues off does, always by sight. It fails on
  bf23ec3f6 (0.75 s @ 0.6: no investigation with cues on).
  - Found on the way, allowed by Q14 and written into PLAN section 1: the other direction. A cue's suspicion raises
    `aware.sensitivity`, so a sub-leak glimpse of B becomes a real one; 3 cases (1.5, 2, 3 s at light 0.3) investigate
    only with cues on, each by sight (`RISE_SIGHT`). The cue adds, never removes.
- **Polish 1 + 6, the bark hush** (`enemy.ts:2942`): `cueRise` only when `this.meter < PERCEPTION.suspicious` before the
  cue, so a `hearTurn` earlier the same step that already lifted him barks 'suspicious'. A5 reworded (sight, `hear` and
  an earlier `hearTurn` all bark). Test `:317` (`hearTurn(0, 4, 20)`, then the cue think: barks); fails on bf23ec3f6.
- **Polish 2 + 3, wording**: PLAN section 1 restated as A6 (nobody seen above `leak` this think, not lured, `sawMoment`
  false), plus a "Sight first" paragraph (PLAN.md:124). A6's redundant per-player clause removed.
- **Polish 5, lured posts** (`enemy.ts:2908`, same line as FIX 1): a guard with `lure.active` is gated out, the
  mission-order reason (he would go suspicious and keep walking his lure). A6 records it. Test: the gates case `:351`
  (sawMoment and lure rows added).
- **Polish 4, the grabbed guard's capsule**: left as is; for the walk (does the hostage's capsule darken the holder's
  chest sample from lamps on the hostage's side?).
- **Allocation on the cue's ray path** (new, found by the tests): with one stand-in map the whole-think case read 32 B
  more with cues (80 vs 48 B, deterministic in file order). Two causes, each 16 B, both when `perceive`'s code calls out
  of line: `SHADOW_NOTICE.slack` loaded from the object's double field and passed to `losTo` (now the module constant
  `CUE_SLACK`, `enemy.ts:100`, `:2939`), and `cueV.set(x, y, z)` (now three component stores, `:2936`). After: 48 / 48
  B (the 48 is today's `perceive`, outside the cue), and `shadowLook` alone 0 B on all four paths.
  - Test harness (`:140`): `standIn` now caches one constructor per field list, so every stand-in shares one map as a
    class's instances do. A new constructor per guard gave each its own map; after the sweep's ~70 guards the stores in
    `shadowLook` went megamorphic and the per-path case read 48 B (the stand-in, not the code), and before this round
    it hid the 32 B above (80 / 80).

Commands:
- `npm run typecheck:fast`: clean. `npx eslint src/ai/enemy.ts tests/shadowNoticePerceive.test.ts`: clean.
- `npx vitest run` on 100 files (the 99 test files under tests/ importing src/ai/enemy, enemyManager, perception,
  alertState or body, shadowNoticePerceive and shadowNotice among them, plus guardOccluders): 100 passed, 1727 tests passed, 1
  skipped, 2 todo (45 s). `shadowNoticePerceive`: 22 passed; against bf23ec3f6's enemy.ts, 4 fail (fix 1, the gates,
  the hush, the whole-think allocation), as they should.
- Not run, as instructed: npm run dev, e2e, a full npm run check.

## Fix round 2
Builder: Opus 5.5, 2026-10-27, on 175358ad4 (PR 1 check B: FIX). Commits b59f05718 (src/ai), 21d1d1d76 (tests),
44f2a92a0 (BRIEF A5 / A6, PLAN section 1 and the G4a row). Flag off / cues null: still today's. `cueQuiet` is set only
by the cue's hushed rise and `cueTurn` only by a cue, so with no cues `onLevel`'s 'clear' condition, `hearTurn` and
`ack` behave as before; the new gates sit after `shadowLook`'s first-line return; the body skip is
`chars === null || ...`.

- **FIX 1, a cue-only episode is silent on the way down too.** `Enemy.cueQuiet` (`src/ai/enemy.ts:587`): set by the
  hushed rise (`onLevel`, `:2404`). Every other level change clears it (`:2398-2399`), and the calm-down
  suspicious -> cooldown skips 'clear' while it was set (`cueOnly`, the cooldown branch below `:2404`). A real sight or
  `hear` that leaves him suspicious clears it in `updateAwareness` and says the 'suspicious' line the rise skipped
  (`:3074`, check B polish 1). A `hearTurn` loud enough to lift him does the same (`:1420`), and an ack clears it
  silently (`:1726`). A mixed episode then barks as today.
  - Tests: `tests/shadowNoticePerceive.test.ts:609` (a cooldown guard, cue only, 3 s moving then 15 s still:
    suspicious and back to cooldown, no bark). `:624` (a noise at 1 s into the episode: barks
    `['suspicious', 'heard', 'clear']` and the level sequence are the same as with cues off; the stimulus is the
    noise). `:653` (a sight in the episode: the skipped line). `:673` (an ack: no 'suspicious', the calm-down barks
    'clear').
- **FIX 2, the cue never takes a sound's place.** Gate `:2942`: `heard || heardMoment || (turnT > 0 && !cueTurn)`.
  `Enemy.cueTurn` (`:590`) is set with the cue's own look (`:2982`) and cleared by `hearTurn` (`:1430`) and `ack`
  (`:1725`), so repeated cues still re-stamp their own look but never a hearing or ack look. A6 records it, with the
  noisemaker path: `EnemyManager.hear` gives the unsent hearers `hearTurn` and the sent one `sendTo` (`heard`).
  - Tests: `:697` (after `hear(6, 2, 10)` the per-step level and stimulus with cues on equal cues off up to his
    calm-down; he investigates (6, 2)). `:712` (after `hearTurn` and after `ack`: the same per-step trace over the look,
    stimulus (6, 2) throughout, no cue). `:729` (the sweep: 5 noise spots x 3 radii x `hear` / `hearTurn`, every case
    that reacted (> 15) traces the same with cues on). The existing glimpse sweep (`:540`) now also asserts that the
    investigation goes to B's feet (2, 9) with cues on as with them off, never to the shadow. `:324` (rewritten: a
    `hearTurn` the same step keeps the sound's stimulus and look, no cue, and still barks). The gates case (`:361`)
    gains the `heard`, `heardMoment` and running-look rows, plus a positive row: the cue's own look does not gate the
    next cue.
- **Polish 2, the breaker walk** (`:2938`): `brkGroup >= 0` gated as `lure.active`. A6 records the reason
  (`calmDecide` runs `breakerStep` while `rate <= 0`: suspicious and still walking). Test: the gates case (`:361`).
- **Polish 3 / 6, difficulty and the 45 s restart**: left as they are, recorded in A5. The cue is a fixed rule (an
  easy guard notices a shadow as a hard one does, tuned at the walk). The cooldown restart is `hearTurn`'s too: a cue
  adding a little time on edge is adding suspicion, never removing it.
- **Polish 4, the new body's first sample**: fixed, one condition (`src/ai/enemyManager.ts:4171`,
  `chars === null || b.age > dt`). With the contract, a body's first light sample waits one step, so the standing
  capsule of the guard who died inside this `update` (still in this step's fill under the guard's key) never shades
  it. Without a contract, sampled on its first step as today. Test `:918`; the test body stand-in now ages in `update`.
- **Polish 5, G4a**: the PLAN's G4a row now says to set `enemyMgr.chars` and switch the fill to `fillOccluders` in one
  commit, with the reason.

Commands:
- `git rev-parse --abbrev-ref HEAD`: feature/guard-ai-j16.
- `npm run typecheck:fast`: clean. `npx eslint src/ai/enemy.ts src/ai/enemyManager.ts tests/shadowNoticePerceive.test.ts`:
  clean.
- `npx vitest run tests/shadowNoticePerceive.test.ts`: 30 passed. Against 175358ad4's enemy.ts and enemyManager.ts, 10
  fail (the 8 new cases, the rewritten hearTurn case and the gates case), as they should.
- `npx vitest run` on 100 files (every test file under tests/ importing src/ai/enemy, enemyManager, perception,
  alertState or body, plus shadowNotice, shadowNoticePerceive and guardOccluders): 100 passed, 1735 passed, 1 skipped,
  2 todo (66 s). The allocation cases (shadowLook 0 B per path, the whole think no more than without cues, fillOccluders
  0 B) stay green.
- Not run, as instructed: npm run dev, e2e, a full npm run check.
