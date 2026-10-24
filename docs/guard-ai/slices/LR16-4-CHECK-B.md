# LR16-4 guards relight - check B (player outcome and scope)

Verdict: PASS

Checked: `feature/guard-ai-relight` head fbf32636 against master 41204e30 (`git diff 41204e30..HEAD`), spec
`origin/feature/sector-redesign-polish:docs/sector-redesign/checks/lr16-0-ct-audit.md` (gap row 10, "LR16-4 guards
relight"), CLAUDE.md "Hard rules" / "Current goal", `origin/feature/guard-ai:docs/guard-ai/PLAN.md` S15,
`docs/guard-ai/research/stealth-over-shooting.md` item 8, `docs/sector-redesign/SPEC.md` A37 / A38 and "Lighting rules".

## Blocking findings

None.

## Coverage: every player-switchable light

| Light kind | Where | Guard who notices it relights after his look? |
|---|---|---|
| Wall switch (`MapLayout.switches`): bunker, bunkerPlant, campusOps S1-S5, courselab, embassy, mansion, port, refinery, warehouse | `stealthSystems.ts:76-84` | Yes, already S15 (pre-existing): `toggle` -> `lightsOut(.., group)` `stealthSystems.ts:484` -> `enemyManager.ts:983` `circuitOut` -> `Enemy.resetBreaker` `enemy.ts:1059` -> `breakerReset` `enemyManager.ts:542` -> `breakerHost.reset` `stealthSystems.ts:535-542` -> `resetCircuit` `:554`. The diff keeps this path and its `isOff` result for every switch-only circuit (the `groupBaseOn` test moved up, same truth table). |
| Breaker board (`MapLayout.boards`, no `window`) | `isolators.ts:78-96` | Yes, new: cut -> `lightsOut(.., liveGroup)` `stealthSystems.ts:106-110` -> same S15 walk; `switchOf` points at the board `:493-500`; `reset` -> `switchBack` `:540-541`, `isolators.ts:104-108`. **No current map defines one** (only `campusS4.ts:164`, `campusS5.ts:221`, both timed). |
| Timed isolator board (S4 yard group 75, S5 garden group 84) | `campusS4.ts:164`, `campusS5.ts:221` | No guard relights during the window; the S2 look at the board, then the timer relights (`isolators.ts:147-164`). Unchanged from master (see below). |
| Course mains-gate circuit (A63) | `stealthSystems.ts:86-95`, `:522`, `:536` | Never, by design (relighting would shut the gate on the players). |
| Shot lamp | `stealthSystems.ts:624-635` | Never, by design (`setGroup` skips destroyed lamps; test `guardRelight.test.ts:165-175`). |
| EMP, jammer hold-off | `gadgetSystem.ts:382`, `ctDevices.ts:942-951` | Self-restoring; not a switch. |
| Sector stage `groupOn`, security desks / consoles | `sectorMode.ts:406`, `:443`; S22 `consoleFault.ts` | Stage forces lights on; desks / consoles are cameras (S22 relights consoles). |

Switchable lights still left dark forever by guards (pre-existing S15 behaviour, not introduced here; see Polish 1-2):
- A second cut of the same circuit inside `BREAKER.repeatT` 60 s: the S2 check at the switch / board
  (`enemyManager.ts:1013`), `boardStep` marks the circuit known (`enemyManager.ts:2062` -> `breaker.ts:120`), so neither
  the checker nor late discovery ever turns it back on.
- A reset walk that ends without the flip (the walker knocked out at the switch, i.e. a successful lure ambush; alerted;
  or the 30 s give-up, `enemy.ts:1107-1117`): the circuit was marked known at dispatch, nobody re-finds it.

## Timed isolator decision

Consistent. PLAN S15 ("a timed isolator relighting ends the walk") and the SoS research item 8 ("Timed isolators: the
guard aborts when it relights itself") both leave the relight to the timer; A38 makes the window the player's. The lure
still works: the cut draws the S2 look to the board (`stealthSystems.ts:110`, test `guardRelight.test.ts:214-221`).
Difference from S15's wording: S15 implies a timed cut gets the calm one-guard walk; the build keeps master's S2 check
(1-2 guards, ring). Not a regression (master already did this); noted as Polish 4.

S4 yard 75 / S5 garden 84 play exactly as before: both are timed (sink path unchanged, `lightsOut(x, z)`), neither group
has a wall switch, so master's `isOff` was false for them and the new one is false too (`holding` in the window,
`groupBaseOn` after); `DarkList` never lists them (as before); `switchBack` had no caller on master.

## Light parity, co-op

- The relight goes `IsolatorBoards.restore` -> `LightRegistry.setGroup` (`isolators.ts:205`), the same call a player's
  switch-back makes; the meter, perception (`DarkList` / `lightsOut` read the registry) and the light field read it.
- Host only (`StealthSystems` / `IsolatorBoards` are host / solo); client sees lamps through slice L's `lamps`
  (registry base state, `net/coopHost.ts:1419`) and the board label through the mirrored item. No `src/net` or `src/save`
  file in the diff, no wire or save change, no new import of `src/net` (`isolators.ts` adds only `core/mathx`).
- No allocation added: `holding` / `cutBoard` / `liveGroup` are index loops with `includes` and `hyp2`.

## Tests

`tests/guardRelight.test.ts` builds the real `StealthSystems` (stub interactables / events only) and the real
`EnemyManager` (stand-in guards as `breaker.test.ts`), so `breakerHost`, `IsolatorBoards`, `lightsOut`, `circuitOut`,
the board dispatch and `lateStep` run for real. Against master's code its key asserts fail (master reported the board cut
without a group, `reset(4)` returned false, `isOff(7)` was true with switch 7 off in the window), so it is not a stub
pass. Only the walk itself (`Enemy.resetBreaker` / `breakerStep`) is a mock; that is S15's tested path.

## Polish

1. Spec row 10 remainder: the tamper path (second cut inside 60 s) is "comes to look, never relights", the spec's exact
   gap; S22 already solved it for consoles ("once that check is over, the next guard who sees it still off turns it back
   on"). Same rule for circuits would close row 10 fully. Follow-up slice or a Michael decision, not a regression.
2. A dropped / failed reset walk leaves the circuit dark for good (known mark set at dispatch). After a lure ambush that
   is arguably right; after a 30 s give-up it is not. Same follow-up as 1.
3. No player-visible change on any current map: no breaker board exists, so the new path is dormant content-wise.
   `TESTING.md` asks to test "a breaker board" in Sector Ops, which a tester cannot find; reword to the wall switch (and
   timed isolator) or name a test map.
4. Timed isolator cut still draws the S2 check (1-2 guards, ring) where S15's wording suggests the calm one-guard walk;
   worth a line in `docs/systems/ai.md` saying it is deliberate.
5. A multi-circuit breaker board reports its cut on one circuit (`liveGroup`); a guard who late-finds a lamp of another
   of its circuits before the reset starts a second walk to the same board (harmless: it ends when the first resets).
   Also the 60 s tamper clock is per circuit, so a board whose first circuit is shot out between cuts is never tamper.
6. `docs/systems/ai.md` new paragraph runs a line past the 120-column wrap.

## Ran

- `timeout 600 npx vitest run tests/guardRelight.test.ts tests/sectorIsolator.test.ts tests/consoleFault.test.ts tests/responseWiring.test.ts`: 4 files, 46 tests passed.
- `timeout 600 npx vitest run tests/breaker.test.ts`: 27 passed.
- `timeout 600 npx vitest run tests/enemyLightsOut.test.ts`: 4 passed.
- Not run: `tsc` / full `npm run check`, e2e (per brief).
