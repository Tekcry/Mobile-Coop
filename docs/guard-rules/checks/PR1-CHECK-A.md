# guard-rules PR1 check A
Owner: Guard AI Build. Status: history.

VERDICT: PASS

Checker A (Opus 5.5: code correctness, performance, hard rules), PR #450, head a78d7093 (slices S1 + S2), against
BRIEF A1-A5, A14, A15 and PLAN "PR1", "Flags", "Risks".

## Checks run
- `npx tsc --noEmit -p .`: exit 0.
- `npx vitest run`: the new and changed files (helmetRule, killScore, dogTakedown, gear, campusGear, sectors,
  responseWiring, difficulty, gearWiring) plus every test touching gear, sectors, score, takedown, coopHost, campus
  S1-S5, section rating and warehouse co-op: 39 files / 661 tests pass; a wider sweep (69 files importing coopHost,
  `GEAR_BY_STAGE`, `responseTeam`, `killScore`, `enforcer`, `stealthSystems` or `DIFFICULTY`): 1107 pass, 1 skipped.
- e2e not run here (laptop queue).

## Findings (no blocking issue)
- Undo constants all present: `GEAR.lockHelmets` (`src/ai/gear.ts`), `GEAR_BY_STAGE[2].helmet`, `SectorDef.shieldTeams`,
  `KILL_BASE.dog`, `DifficultyDef.helmets`, Marlow's `false` at `src/game/stealthSystems.ts:595`.
- Helmet lock / soak: `placeSlot` resets the soak and applies the rule; `revive` keeps lock and soak (`inherit` ->
  `setGear(o)` reads the old `Enemy`'s fields) then re-applies the lock; `joinTeam` locks the shield lead's helmet; stage
  gear (`mergeGear` into `gearB`) never touches lock or soak. Dogs return early everywhere. Mode stop resets the rule.
- Damage path: soak = mult 0, stagger, `deflect`, no `knockHelmetOff`; the soaked second headshot falls through to the
  one-round headshot kill with the helmet on. No allocation added (`GEAR_OUT` scratch, plain fields).
- Shields: only `sectorMode.ts:955` (`s.shieldTeams === true`) and `stealthSystems.ts:595` (`false`) call
  `responseTeam`; only campus S4 / S5 set `shieldTeams`; warehouseOps data untouched. The campaign branch
  (`feature/mission-engine:sectorMode.ts:973`) calls the same line unchanged, so it merges to the `shieldTeams` call and
  its data sets none (M2 holds).
- `checkSectorGuards`: placed `enforcer` and slot / section `helmet` / `both` rejected; the legacy maps' enforcers are
  not `SectorDef`s; campus and warehouse sections pass; mission-engine's own data has no helmet tag.
- Score: killed dog -132 at tier 2, no headshot bonus, counts in `kills` (No kills / Perfect lost); `knockOut` sets
  `e.ko` before `onKilled`, so a gassed dog keeps +120 and counts as a knock-out. `validate.ts:144` unaffected.
- S2: every takedown kind (behind, side, drop, ledge, hang-down, window, assist) is offered only through
  `TakedownController.find`, which now skips quadrupeds; the menu reads only that offer; the host denies a client's
  `td` start on a dog (`coopHost.ts:893`), and the assist path needs a seized hostage, which a dog can never be. Gas and
  elbow-strike paths unchanged.
- Co-op: the helmet rides the existing `AL_HELMET` bit; a locked helmet's bit never clears, so the client shows it on
  and never drops it. No wire field is needed for play.

## Polish
1. `src/ai/gear.ts:178`: `responseTeam`'s `shield` defaults to `RESPONSE.shieldLead` (true), so a future caller that
   omits it (a campaign or new mode) gets a shield lead against M2. A default of `false` (or a required argument) is
   the safer default.
2. `src/net/enemyPuppet.ts:276` / `src/net/puppetGear.ts:34`: the client predicts a deflect marker on the killing
   second headshot of a locked helmet (PLAN "Risks", cosmetic; needs a wire bit, the train's).
3. `src/game/modes/score.ts:17`: the documented undo (`KILL_BASE.dog` back to 120) leaves the headshot bonus off for a
   killed dog (`!(dog && killed)`), so it does not fully restore the old score; say so in the undo note or gate the
   exclusion on a negative base.
4. `src/world/maps/campusS4Data.ts:28`, `campusS5Data.ts:26`: `GearGuard = SectorGuard & { gear?: GearTag }` is now
   redundant (`SectorGuard.gear` exists); drop it when J17 next edits the campus data.
