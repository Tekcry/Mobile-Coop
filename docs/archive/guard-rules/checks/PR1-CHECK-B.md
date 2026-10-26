# guard-rules PR1 check B
Owner: Guard AI Build. Status: history.

VERDICT: FIX

Checker B: Opus 5.5 (fresh), 2026-10-25. Head a78d7093f (PR #450, feature/guard-rules). Scope: intent against
Michael's words, the player-visible result, docs, tests. Read: agent-preamble "Checkers", VISION, DECISIONS G297 G307
G338 G341 G348 G350 G355, ROADMAP Decided Q9 Q12 Q26 and the ~11:20 answers (2) and (4) (origin/feature/menu), bible
5.6 / 5.7, BRIEF, PLAN "PR1" / "Tests" / "Walk items", the PR body and the full `src`, tests, e2e and docs diff.

Ran: `npx vitest run tests/helmetRule.test.ts tests/killScore.test.ts tests/dogTakedown.test.ts
tests/campusGear.test.ts tests/gear.test.ts`: 5 files, 56 tests pass. `node scripts/doc-lint.mjs`: 0 errors; none of
the 22 warnings is in a file this PR touches.

## Intent (all match)
- Helmets (G350, bible 5.6, VISION 2): `DIFFICULTY` rookie / normal `stage`, realistic `always`, perfectionist `locked`
  (`src/ai/archetypes.ts:199-202`); Rookie / Normal bare-headed until alarm stage 2 (`GEAR_BY_STAGE[2]`, A3 follows
  bible 5.7 "Level 2: more guards wear helmets and armour"); Perfectionist never shot off, the second headshot still
  kills (`gearHit`, A2, keeps G307 (2)); dogs never geared. On in `SectorMode` only (Sector Ops and the campaign that
  runs on it); Marlow Yard out by A1, which matches VISION's helmet line ("campaign and Sector Ops").
- Shields (G307 (3), Q12 "No, armed only"): `shieldTeams` default false, set only on campus S4 / S5 (A4); campaign
  and Marlow Yard armed only (A13, A14); a placed `enforcer` now fails `checkSectorGuards`. warehouseOps (Q26 frozen)
  gets only the code default, no data edit.
- Dogs (G348, Q9 "Kill + lose score"): a killed dog counts in `kills` (No kills and Perfect go) and scores
  -120 x tier; a gas knock-out (`GadgetSystem` -> `knockOut`, `e.ko`) keeps +120 and No kills; no takedown of any kind
  (the candidate scan skips `def.quadruped`, so every attacker state and the team takedown) and the co-op host denies
  a client's `td` start on a dog. Palm strike was already excluded (`strikeTargetable`).
- Nothing loosens a Michael-only rule: every change tightens or applies a recorded rule. A1-A15 are logged in BRIEF,
  each with its undo (A6: none needed).
- Tests would fail if a rule broke: the difficulty table, placement per tier, stage 2, the Perfectionist soak / kill /
  revive, `shieldTeams` on S4 / S5 only, the validator cases, the dog score through `SectorMode.onEnemyKilled` with
  `rateSection`, and a dog offered nothing in 13 attacker states while a guard in the same spot is.
- e2e: e2e-sectorops S13 upkeep (stage 1 bare, stage 2 helmet + armour, armed-only teams) plus the Realistic
  helmets-at-load check; e2e-enemies (no offer, the dog stays up, then a knock-out); e2e-takedown "dog: no takedown"
  (no offer, prompt or menu row; the press starts nothing).
- Walk items 1-4 (PLAN "Walk items") cover each PR1 rule for Michael.

## Fix list (blocking)
1. `TESTING.md` (the desktop checklist, RULES "Definition of done": "Docs updated: the changelog fragment,
   `TESTING.md`") still describes the old rules, so a desktop pass would flag correct play as a bug.
   - `TESTING.md:264-267` "raise the alarm twice: every guard now wears armour; a third time: helmets too. Each alarm's
     team comes in behind a shield guard": now armour and helmets at the second alarm, and a shield guard leads only in
     Saltmarsh Park S4 / S5 (S1-S3 and the warehouse: armed guards only).
   - `TESTING.md:245` "raise the alarm to the helmet stage (three alarms in Sector Ops ...)": two alarms on Rookie /
     Normal; on Realistic / Perfectionist the helmet shows from the start.
   - Add one item (Sector Ops): on Realistic every guard starts helmeted; on Perfectionist the first headshot staggers
     and the helmet stays, the second kills; a dog offers no takedown from any side; a killed dog lowers the score and
     loses No kills, a gassed one does not.
   Done looks like: those lines match PR1's rules. Docs only: no rerun of tests or e2e needed.

## Polish
- `changes/feature-guard-rules.md:11-12`: the "Sector Ops data checks reject ..." bullet is a dev check, not something a
  player sees; drop it or fold "Saltmarsh Park sections 4 and 5 keep their body armour" into the shields bullet.
- `changes/feature-guard-rules.md:9-10`: "Knocking one out with gas costs nothing" reads as no reward; it still scores
  as a knock-out ("still scores as a knock-out" is plainer).
- Co-op joiner on Perfectionist: the client's deflect marker also shows on the killing second headshot (noted in
  `docs/systems/ai.md` Gear, cosmetic, the host decides). Worth a line in walk item 1 if Michael walks it in co-op.
- `tests/helmetRule.test.ts` `revived` rebuilds `revive`'s gear steps by hand (`giveStageGear` + `ruleHelmet`), so it
  would not catch the `ruleHelmet` call being dropped from `EnemyManager.revive`; the e2e does not cover a woken
  Perfectionist guard either.
- `scripts/e2e-enemies.mjs:223-224` knocks the dog out with a direct `knockOut` call, not the gas gadget; the name "gas
  knocks the dog out" claims a little more than it drives.
- No e2e on a Perfectionist page (unit tests cover the lock); a one-line check beside the Realistic one would pin
  `helmetLocked` at load.
