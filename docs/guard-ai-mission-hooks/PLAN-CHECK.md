# guard-ai-mission-hooks: plan check (Opus)
Checked: PLAN / BRIEF at a6d8daec2; code at master b81c4945b, engine at origin/feature/mission-engine 8f40303f3, J15 PLAN
at origin/feature/guard-rules 1fe16b1e0. Verdict: **FIX** (10 items). Intent, dark flags, file-disjoint S1 / S2, no wire
or save change and the hot-path design hold; the porter's twist misses "Hears", and the Split Shift walk collides with the
built breaker walk.

## Fixes (ranked by impact)
1. **A4 drops "Hears" (lead decision 2; Michael picked "Hears and reacts").** A4 says "No hearing-range gate"; the
   lead's ruling is the normal hearing model. Done looks like: the bell is a sound at its own point (the lodge) with a
   reach, judged for the tagged guard by `EnemyManager.tierOf` (walls and masking; a named tier, e.g. >= 1, in `ORDER`);
   not heard = no order. State gate: dead / KO / held (`taken`) / passive / alerted / busy (an incident, breaker, lure or
   search in hand) = he does not come, and the bell does not stand for later. Say what other guards in reach do (turn
   only, no incident; G143: explainable). Where the bell point and reach live (an event or `MissionPost` field) is a C2
   line for Campaign Build. Data check: `checkMissionOrders` takes the map's `noisy` list and fails a bell the tagged
   guard would not hear at his spawn / post through one wall (`WALL_FACTOR`) plus masking; C6 (or the Tallow mission
   e2e) asserts the porter takes the order with real wall rays. A4's undo line is rewritten to match.
2. **Split Shift: the built breaker walk pre-empts the order.** The cut of 55 / 56 is seen by #7 in the dark office, so
   `circuitOut` -> `report('breaker')` sends him straight to the switch (`resetBreaker`, `enemyManager.ts:1195-1225`,
   `:2419`), not via reception; with "board task in hand: stays offered until free" he resets it first, then walks the
   order. Done looks like: the PLAN says how they compose either way round (order first or breaker incident first): a
   `reset` order on circuit c takes over a breaker walk on c and holds c's incident (`circuitBusy` counts order
   holders), so no second guard is sent and the tamper check does not fire; a unit test per order. The board is 2
   circuits (55 + 56): `circuit` becomes `circuits` (or the reset turns every group of that board) so the wing relights.
3. **Order semantics are not one rule.** "Stays offered until free" (Enemy) vs A6 "a member who drops out leaves the
   group" vs the lead's "busy = he does not come", and a KO'd guard woken later (`inherit`) or placed later would pick a
   standing order up. Done looks like: one table in the PLAN per order kind: offered when (raise only, or standing up to
   `giveUp`), to whom (never a woken guard; a replay after a restart is offered when the slot is placed), what drops
   it; #1 on his own board when the cut comes: joins late or never (pick one, it is the Split Shift walk item).
4. **J15 order is not stated (lead decision 4).** Done looks like: a section "Order with J15": J15's PRs go first; S1
   starts on the head after J15 PR3 (enemy.ts / enemyManager.ts / flags.ts / e2e-stealth-ai) merges, S2 after J15 PR4's
   S7 (`guardAiData.ts validatePosts`), S3 / S4 after J15 PR4; file:line facts re-pinned on that head. S3 builds on J15
   S5 (alarm lock and repeat at `raiseAlarm` / `contactThrough` / the caller / `radioAlarm`: say whether the lock and
   count are per area) and J15 S1's helmet rule (`stage` / `always` / `locked`: area gear only changes the `stage`
   tier). S1 treats J15 S7 lookouts (copied as high-security posts) as secure in `checkMissionOrders`. flags.ts overlaps
   with coop-kit, map-ready, player-batch-j19: additive lines, no blocker.
5. **A9 / Q1 wording (lead decision 1).** BRIEF A9 still says "back to the lead as a question" and Q1 is "asked by day".
   Done looks like: A9 reads "assumed and logged (G358), accepted by the lead 2026-10-25; loosens G125's shared tier",
   undo kept; Q1 becomes the walk-card question the orchestrator brings to Michael's prototype walk; the PLAN flag row
   for `areaAlarms` says "Michael's click at the prototype walk (walk card)".
6. **C2 cannot be built as written.** `s2-foyer` is no room id in code (S2 rooms are `foyer`, `hall`, `plant`:
   `campusS2.ts:143-159`), so the via drops (A2). Done looks like: C2 lists every post with coordinates and storey
   (`s2-foyer` or room `foyer`, `s2-plant-board` circuits 55 + 56, `s4-cage-front` (18, 33)) and exact tags `s2:6` (#7),
   `s2:0` (#1), `s4:19` (#20) (index = number - 1, `campusSectors.ts:81`), plus the bell point / reach (item 1).
7. **No order outcome for the mission's world leads.** The signed-off lines and the lodge lamp ("Lodge lamp's on ...
   Porter's coming", "Two of them coming", "Supervisor's off the west aisle") must follow what the guard did, not the
   event (a KO'd porter must not light his lamp). Done looks like: a supported read (`em.orderPhase(name)` or a
   callback, not only the debug `orderOf`) and a C7 for Campaign Build to drive the lamp and lines from it.
8. **Code Relay walk item is wrong.** A Relay restart takes 3A back (`runner.restore(si, now, team)`), so nothing
   replays. Done looks like: "accept when a Vault restart (3A still done) replays the walk, and a Relay restart does
   not".
9. **S1 at ~1,140 lines plus items 1-3 goes past the cap: split it.** Done looks like: S1a single-guard orders (pure
   `missionOrders.ts`, flags, walk / reset, hearing gate, breaker compose, porter and supervisor e2e) and S1b groups
   (A6: via wait, join, follow; the Split Shift e2e), each with its own size, tests and e2e.
10. **Noise and board details.** `ctx.breakerOff` returns true (off) when there is no breaker host
    (`enemyManager.ts:676`), so "no breakers system: live" needs its own branch; the `noiseZones` gate also covers the
    constructor's `mapNoisy` (`:559-560`), not only `setNoisy` (`:2356`). The `OrderBoard` `members` bitmask over guard
    ids breaks past id 31: use a fixed small member list. Done looks like: these three in S4 / S1 text and unit tests.

## Polish (non-blocking)
- Paths: `tallowWharfMissions.ts` / `tallowWharfSectors.ts` are in `src/world/maps`; the post field is
  `PostDef.highSecurity` (getter `Enemy.secure`), not `postDef.secure`; engine lines moved (`restarted` :349,
  `stepEvents` :573, `syncWalked` :588).
- Reset at the post: take the switch point from `BreakerHost.switchOf(group)`, so a post cannot drift off the board.
- S3's area cases in their own test file, not `missionOrdersManager.test.ts`.
- C1: subscribe only where the manager simulates guards (host / solo).
- Code Relay "code re-askable": if the release step is undone and done again, the supervisor walks again; say if meant.
- D9: on a co-op client `ambientAt` needs the live mask refreshed (the client does not tick the AI).
- The order's bark: use J15 S4's bark-by-cause once it lands; J15 S6 posted pairs: say what an ordered guard's partner
  does.

## Re-check (fix round)
Checked: BRIEF / PLAN at 5244584c6. Verdict: **FIX (1 item, a one-line edit; no further check round needed once it
lands)**. Items 2, 3, 5, 6, 7, 8 and 10 are done. Item 1 is done (polish below). Item 9 is done: S1a ~1,220 and S1b
~590 are both under the cap. Item 4 is done apart from R1. Nothing else broke: the claims list the new test files,
S2's files (`hearing.ts`, `guardAiData.ts` and their tests) do not overlap S1b's, S1a only reads `hearing.ts`, and
`e2e-stealth-ai.mjs` and `enemyManager.ts` stay serial (S1a -> S1b -> S3 -> S4).
- **R1. S1a's start gate is one J15 PR too early.** S1a starts "after J15 PR3", but J15 PR4 (S7 `placeSlot` in
  `enemyManager.ts`, S8 `enemy.ts` and `e2e-stealth-ai.mjs`) edits the same files, and S1a reads PR4's `post.lookout`
  (A7, `checkMissionOrders`), which does not exist before PR4. Done looks like: "S1a starts on the head after J15 PR4
  merges" in "Order with J15" and the Slices order line, so every J26 slice follows all of J15 (lead decision 4).

Polish (re-check):
- C2 says the bell is "1.6 m" from the porter's post. (118.5, 50) to (117, 48) is 2.5 m.
- The watchman's dog (W3 slot 1, a melee guard) is in the bell's reach (~7 m). `hear()` runs a melee guard's own rule
  (`e.hear`, which can send a dog charging). S1a should give every bystander, the dog included, only `hearTurn`.
- `noiseZones` reads `breakers.isOff` in its own branch. Console groups (`isConsoleGroup`, `enemyManager.ts:676`) need
  the same routing there, or `validateNoisy` should reject a console group.
