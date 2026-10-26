# Piano escape GA1 + GA3 + GA7: check B

**Verdict: FIX** (one item, GA7 data validation; GA1 and GA3 pass)

Checked: head e53ee98e3 on feature/guard-ai-piano (PR #603: 81a43f950 GA1 + GA3, cdd11c540 GA7), against
"Guard AI Build asks" and the EMP beat in docs/piano-escape/PLAN.md on origin/feature/piano-escape, with SO1's
`mainsOff` read from origin/feature/piano-lights-so1 (PR #602). Formed before reading check A.
`npm run typecheck:fast` clean. vitest: pianoGuards 6/6; bodySearch, postsWiring, urgency 36/36.

## FIX

1. **src/ai/guardAiData.ts:287 rejects `mapWideNoise`.** Scenario: Sector Ops does what the plan says (the mill's
   SectorDef gets `noisy: [mapWideNoise('rain', 6)]`). Then tests/postsWiring.test.ts:281 ("every live map's Sector
   Ops guard-ai data validates") fails with `noisy rain: radius Infinity outside 1..20` (`NOISY_LIMITS.radiusMax` 20,
   guardAiData.ts:116). The same applies to the DEV warning if it is ever put in `MapLayout.guardAi.noisy`
   (enemyManager.ts:591). As built, GA7 cannot be used the way the ask says without breaking CI.
   Minimal fix: in `validateGuardAi`, accept `n.radius === Number.POSITIVE_INFINITY` as a map-wide source. Skip the
   radius range and the bounds check for it, and keep the db range and the finite x / z checks. Add a case to
   tests/guardAiData.test.ts (`validateGuardAi({ noisy: [mapWideNoise('rain', 6)] }, [], { bounds })` is `[]`).

## 1. Off the scene
- `sceneDark` defaults to false (enemyManager.ts:330). The only off-scene costs are one optional call in
  `torchWanted` (enemy.ts:2118, no allocation) and one flag test in `lightsOut` (:1278).
- `SEARCH` keeps indices 0-2 and appends index 3. `searchSpec` falls back to plain. Nobody iterates the table or
  asserts its length outside the new test.
- `mapWideNoise` has no callers until the scene's data uses it. Nothing changes off the scene.

## 2. GA1 torches
- While dark, the rule is `carriesTorch && !taken`:
  - Killed or knocked out: `knockOut` and the kill zero health, so the guard is not `alive` and the release loop
    (enemyManager.ts:1707) frees the slot.
  - Seized, hostage or interrogated: `taken` is true, so the torch is released. An interrupted takedown
    (`releaseTakedown`) clears `taken`, so he takes a torch again when a slot is free.
  - A knocked-out guard who is woken is `alive` again and takes a torch again.
  - Dogs: none.
- More guards than slots (`FLASHLIGHTS` 4): the first 4 in list order hold the slots until they are down. No flicker,
  because the rule ignores the field. The other guards walk dark, and they are dark consistently everywhere: picture,
  meter and perception all read the same registry slots. So parity holds; only the "every guard lit" intent waits on
  SO3's slot count.
- Co-op client: the snapshot's torch bit is the host's `hasTorch` (slot ownership). `TorchMirror` places the client's
  own slots from it, and the client never runs `torchWanted`, so it needs no `sceneDark`. The client's meter reads its
  mirrored slots: parity holds.
- Dependency (scene side): `addTorchSlots` (torches.ts:35) builds slots only on a dark map (`ambient` or a zone below
  0.5) at World build. `mainsOff` does not change `ambient`, so the mill must be a dark map in its data, else there are
  no torches at all after the EMP.

## 3. GA3 blackout search
- Path: `searchAt(x, z, null, 3)` sets `searchReq`, `searchOwn` and the stimulus. On the next think, `AlertState` goes
  unaware to searching (alertState.ts:155), and `searchReq` is cleared only after that think. `searchOwn` keeps the
  plan and lkp branches off. The first point is the centre, then `ringPoint` at 2, 4, then 6 m (capped), with a 3 s
  look at each point. After 60 s he goes to cooldown with the 'clear' bark (a voice line); `walker.rejoin` puts him
  back on his route, and after `cooldownTime` he is unaware.
- Side effects: no radio (`task` -1, so no `radioCall`), no bark on entering the search (that bark is only from
  alert), no incident, no alarm or stage change. `huntingOf` (the ghost) is unaffected because `hunt` is -1.
  `searchSlot` spreads the four searchers.
- The `lightsOut` skip: SO1's `mainsOff` never calls `lightsOut`, and SO1 maps mains-dark lamps to `DARK_NONE` in
  `darkState`, so late discovery ignores them as well. The only remaining case is in the Polish list (item 2).

## 4. GA7 rain
- `ambientDb`: `d / Infinity` is 0, so it returns `db` everywhere, and `d >= Infinity` is never true. The y-less
  source falls back to 2D. The only `.radius` readers of a NoisySource are `ambientDb` (tierOf :2914, hearsShout :2652)
  and `validateGuardAi` (the FIX). No debug draw, bark or editor code reads it. Combat hearing goes through `tierOf`,
  so loud gunfire is masked the same way.
- Deterministic (a constant), and explainable: the player hears the rain everywhere (S6's rain bed). It masks
  guards' shouts too (6 m voice reach becomes about 3 m); see Polish 3.

## 5. Tests
- Sound for what they claim. Gaps: GA3 mocks `searchAt` (the real path is the shared one bodySearch covers for kind
  1), and nothing validates a map-wide source (the FIX).

## Polish
1. Plan wording (PLAN.md lines 53, 83, 386): `blackoutSearch(ids, ...)` with `'mill:0'` strings, but the code takes
   `readonly Enemy[]` (enemyManager.ts:1251). Either the plan says "the spawned Enemy objects (`slotEnemy`)", or
   add a small id overload.
2. enemyManager.ts:1430 `lateStep` still runs while `sceneDark`. A lamp destroyed during the blackout (a stray guard
   round) is `DARK_SHOT`, so a calm guard who later sees it gets a `light` incident: a light going out does send
   someone, contrary to GA1's wording. Minimal fix: `if (this.sceneDark) return;` at the top of `lateStep`, or mark the
   light known in the skipped `lightsOut`.
3. Rain halves the voice model too (`hearsShout` :2652): a pair more than about 3 m apart will not hear "man down".
   This is consistent with the model; GA6 should space pairs inside that range, or note it in the scene's walk card.
4. Scene side, not GA: `SectorMode.fill` (sectorMode.ts:921) holds back any non-alerted slot within
   `SPAWN_MIN_DIST` 7 m of a player. G1-G4 on the actors' stop spots (4-6 m from the players) will not spawn at the
   EMP, so `blackoutSearch` gets nothing. S2 needs a scene exception.
5. tests/pianoGuards.test.ts: add one real-prototype case (after `searchAt(..., SEARCH_BLACKOUT)`, the spec's `max` is
   6), and one case with more carriers than slots.
