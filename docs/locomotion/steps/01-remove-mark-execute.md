# Step 01 - remove Mark & Execute

Block A. Deps: none. Bible 6 ("Removed in Phase 3"), 1.13; audit c 2b.

## Model
Implementer: sonnet. Checker: opus (touches src/net).

## Read
- docs/locomotion/RULES.md; docs/locomotion/audit/c-removals.md 2b (lines 42-48).
- src/game/marks.ts (all, 83), src/game/executeController.ts (all, 169), src/ui/hud/markers.ts (all, 55).
- src/game/gameState.ts:83-84, 276-281, 400-416, 488-496, 745-748, 908-916, 1108-1130, 1166-1180, 1750-1766, 1858-1862.
- src/game/takedownController.ts:425-435; src/game/gadgetSystem.ts:200-206, 630-636, 690-712.
- src/game/gameEvents.ts:18-26; src/game/damage.ts:20-30; src/game/training.ts:1-70; src/game/modes/trainingMode.ts (grep -n 'mark\|execute').
- src/ui/hud/hud.ts:1-10, 75-80, 170-176, 370-381; src/ui/screens/controlsScreen.ts:60-75; src/ui/screens/playScreen.ts (grep -n 'execute\|mark').
- src/input/actions.ts:25-35; gamepadMapping.ts:58-75; gamepadSource.ts:115-122; keyBindings.ts:20-35, 58-66; touchControls.ts:26-40.
- src/core/settings.ts:15-35, 180-210; src/ai/archetypes.ts:150-172; src/progression/suit.ts:105-150, 186-220.
- src/net/protocol.ts:150-155, 520-528; coopHost.ts:45-52, 225-240, 720-740; coopClient.ts:305-312; remotePlayer.ts:38-46.
- tests/takedown.test.ts:1-10, 55-100; scripts/e2e-coop.mjs:318-352; scripts/e2e-training.mjs, scripts/e2e-takedown.mjs (grep -n 'execute\|mark').

## Task
1. Delete src/game/marks.ts, src/game/executeController.ts, src/ui/hud/markers.ts.
2. gameState.ts: drop imports :83-84, fields `marks` / `execute` (:276-281), construction :402, `marks.max += hq.extraMarks` :414, the
   `this.execute.running ? 'execute'` branch :492 (event becomes ko / kill), `stats.executes` :747, the execute parts of the interact
   gate :910-914 and `busy` / `offer` :1113, :1128, the execute block :1168-1177 (keep the takedown path below it), chevrons :1752-1765.
3. takedownController.ts:431 `g.marks.earn()` deleted. gadgetSystem.ts: `markFrom` (:703-712) and its calls :634, :695 deleted; `busy` :204 loses `execute`.
4. gameEvents.ts: remove `execute` and `mark` events and every listener (grep `'mark'`, `'execute'` in src/audio, src/game).
5. damage.ts:26 `execute?: boolean` removed and every reader.
6. Input: remove actions `mark`, `execute` (actions.ts:31-32), pad RB `mark` (gamepadMapping.ts:65; RB stays unbound, step 17 assigns it),
   gamepadSource.ts:120 entry, keyBindings.ts:28-29 / :63-64, touchControls.ts:34-35 (keep `ping` but give it its own icon id 'ping').
7. settings.ts: drop `mark` / `execute` from the touch control list (:23-24) and layout (:186); bump `TOUCH_LAYOUT_VERSION` 5 -> 6 (settings.ts:31) so
   saved layouts re-sanitize. `sanitizeBinds` drops unknown ids already; verify with a unit test.
8. hud.ts: `markers` field, import, construction and `setCharge` (:374-380) removed; CSS for chevrons / charge pips removed from src/styles.css.
9. controlsScreen.ts:69 row removed; playScreen.ts mark / execute buttons removed.
10. archetypes.ts: remove `DifficultyDef.execute` (:163) and the four `execute:` values. Leave `sonar` (step 02).
11. Parked suit / HQ: remove `hqStats.extraMarks` (:137, :147). KEEP `HqId 'marks'`, `HQ.marks`, `defaultHq` and challenge `executes`
    (save shape; step 04 drops them with the v8 migration). Change HQ.marks desc to 'Retired'. `ChallengeSession.executes` stays, always 0.
12. Training: remove steps `mark` and `execute` (training.ts:6, 24-25, 41, 45, 64-67) and their trainingMode handling. Step 33 rewrites Training.
13. Net: shot field `ex` (protocol.ts:153, :525; coopClient.ts:310), `execCharges` / `execUntil` / `execLeft` (remotePlayer.ts:41-44),
    coopHost.ts:49-51 constants, :231-233, :725-740 removed. No PROTOCOL_VERSION bump here (one bump in step 06).
14. Tests: delete the 'mark & execute' describe in tests/takedown.test.ts:58+ and the marks import; fix tests/net.test.ts / pvp.test.ts
    shot literals (`ex`); add a settings test that an old touch layout with `execute` sanitizes cleanly.
15. e2e: remove the Mark & Execute section of e2e-coop.mjs (:321-349) and the mark / execute checks of e2e-training and e2e-takedown.
16. Docs: delete Mark & Execute text in docs/systems/takedowns.md (:6 and sections), coop.md:37-40, ai.md:98, input-and-loop.md bindings,
    testing-tools.md suite notes. One line in docs/systems/takedowns.md: "Mark & Execute removed (locomotion 01)".
17. Parked `?legacy=1` content must still compile (resultsScreen, loadoutScreen, profile).

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/e2e-coop.mjs`, `node scripts/e2e-netmove.mjs` (net touched);
  `npm run e2e:legacy` report only.
- Co-op check (PLAN): e2e-coop takedown still passes.
- Grep proofs (each must print nothing): `git grep -n "MarkSet\|ExecuteController\|execCharges\|setCharge" -- src tests scripts`;
  `git grep -n "'mark'\|'execute'" -- src/input src/core src/game`; `git grep -n "\bex:" -- src/net`.
- `git grep -n "marks" -- src/save src/progression` shows only the parked HqId / HQ entry (removed in 04).

## Commit
`locomotion 01: remove Mark & Execute (marks, execute, chevrons, input, ex, execCharges)`

## Numbers
- Files deleted: 307 lines (marks 83, executeController 169, markers 55; `wc -l`).
- coopHost EXEC_WINDOW 5 s, EXEC_SHOTS 5 (coopHost.ts:50-51) go. HQ marks price 2500 (suit.ts:123) stays parked until 04.
