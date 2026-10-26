# Piano escape GA1 + GA3: check A

**Verdict: PASS**

Checked: commit 81a43f950 on feature/guard-ai-piano (PR #603), against the "Guard AI Build asks" in
docs/piano-escape/PLAN.md on origin/feature/piano-escape (lines ~299-310, the cut at 76-82 and S2 at 198-235).
`npm run typecheck:fast` is clean. vitest: pianoGuards (6/6), bodySearch (8/8) and coopTorches (12/12) pass.
GA7 (cdd11c540) landed on the branch during this check. It is out of scope; its test passes.

## 1. Off the scene
- `EnemyManager.sceneDark` defaults to false (enemyManager.ts:330). `clear()` does not reset it, so a section restart
  keeps the blackout, as the PLAN wants. A new map builds a new manager (gameState.ts:746), so the flag cannot leak.
- With the flag false, `torchWanted` (enemy.ts:2118) falls through to the old rule. The only cost is one optional call
  per guard per step, with no allocation. `torchOverride` still wins first.
- `SEARCH` indices 0-2 are unchanged and index 3 is appended (response.ts:70-92). `searchSpec` falls back to plain for
  unknown kinds. `searchKind` is a plain number field: it is set only by `searchAt` and reset to plain on alert to
  searching, and it is never sent over the net. `urgentKind` takes an `IncidentKind`, not a search kind, so the new
  kind does not touch it. `SearchKind` widens without breaking any user, and the typecheck is clean.
- `lightsOut` returns at once only while `sceneDark` is true (enemyManager.ts:1278).

## 2. GA1 torches
- The rule while dark is `carriesTorch && !taken`. The release loop (`alive && torchWanted(field, true)`) handles each
  case:
  - Killed or knocked out: `knockOut` zeroes health, so the guard is not `alive`. The torch is released, and also in
    the despawn path (:1997).
  - Seized, held as a hostage or interrogated: `taken` is true, so the torch is released.
  - Dogs: they carry none.
  - Flashbanged: the torch stays on, which is right.
- Slots: `FLASHLIGHTS` = 4 (world/torches.ts:15). With 8 or more guards all wanting a torch, the first 4 in `enemies`
  order take the slots and keep them until they are down or seized. The rule while dark does not read the light field
  or the guard's state, so it never flips from step to step. GA1 causes less churn than the old rule: there is no
  release / acquire flicker. That 4 slots are too few is SO3's problem, as stated.
- Co-op: the host's snapshot sends `alertCode(e, em.hasTorch(e))` (coopHost.ts:1635). `hasTorch` reads `torchOwner`, so
  the client's `TorchMirror` follows the host's on/off with no change. Client puppets never run `torchWanted`. The
  client needs as many slots as the host, which is SO3's concern if it moves to 8.

## 3. GA3 blackout search
- `searchAt(x, z, null, SEARCH_BLACKOUT)` does the following:
  - It sets `searchReq`, `searchOwn`, the stimulus and `rush = false`.
  - The guard's next think passes `i.search`, so `AlertState` moves unaware to searching (alertState.ts:155).
  - `searchReq` is cleared only at the end of that think, so a guard that is frozen or thinking at a lower rate still
    takes it.
  - Because `searchOwn` is true, the plan or lkp branches never run. The first point is the centre, then
    `ringPoint(..., searchSpec(3))`, at most 6 m out, with a 3 s look at each point.
  - After 60 s (`searchFor` = plain), searching moves to cooldown with the bark 'clear' (a voice line, no radio call:
    `task` is -1). After `cooldownTime` the guard is unaware again and back on his route or post.
- Nothing raises the alarm or uses the radio. No incident is posted, and `blackoutSearch` skips guards who are down,
  alerted or held.
- `lightsOut` skip: SO1's `mainsOff` (feature/piano-lights-so1) and S2's stub `disrupt` do not call `lightsOut`. After
  the EMP, every electric lamp is off and torches cannot be destroyed, so no later lights-out event exists for the
  scene to need. A shot at a dead lamp still makes its shot noise (stealthSystems.ts:506), which is correct.

## 4. Tests
- tests/pianoGuards.test.ts covers:
  - Off vs on with lit and dark fields, dog excluded.
  - Release when `taken` or down.
  - The old rule still working with the flag off.
  - The ring never going past 6 m for 16 points x 4 slots.
  - `blackoutSearch` skipping guards who are down, alerted or held.
  - `lightsOut` with the flag on and off.
- The GA3 test mocks `searchAt`. The real path from `searchAt` into `AlertState` is the same one bodySearch.test.ts
  already exercises for kind 1, so this is a gap in coverage, not a fault.

## Polish (no FIX)
1. enemyManager.ts:1715-1721 (torch acquire order): with 4 slots, the guards who keep torches are simply the first 4
   spawned. When a holder is seized, his torch moves to the next guard in list order, wherever that guard stands. A
   guard freed from an interrupted takedown stays dark until a slot frees. For S4 / SO3: spawn G1-G4 (the searchers)
   first, so that on the 4-slot fallback the guards nearest the players hold the light.
2. enemyManager.ts:328-330 doc: "set by the scene after its EMP". The `lightsOut` skip only matters if the scene's
   cut passes through `lightsOut`. SO1 and the stub do not, but the EMP gadget path does (gadgetSystem.ts:404). Suggest
   wording such as "set before the cut, if the cut goes through `lightsOut`".
3. tests/pianoGuards.test.ts:131: add one test on a real-prototype stand-in: after `searchAt(..., SEARCH_BLACKOUT)`,
   `searchKind` is 3, and `searchSpec(e.searchKind).time` is 60.
4. Scene note (S4, not GA): the first point of the GA3 search is the centre itself (`searchK` 0). With the centre at
   W1, the four torch-carrying guards walk straight to where the players stand, 5-7 m away, from the cut. This matches
   GA3 as written. S4 should check that the first seconds of play are survivable (level-design 4.8), for example by
   putting the centre a few metres off W1 or starting the spawn on a later step.
