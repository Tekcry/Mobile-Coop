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
