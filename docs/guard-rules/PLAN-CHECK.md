# guard-rules: plan check
Owner: Guard AI Build. Status: current.

Checker: Opus 5.5 (fresh), 2026-10-25. Checked: BRIEF + PLAN at 39cafae73 against VISION, RULES (Intake, Walk pacing,
A job), ROADMAP Decided (feature/menu), FOLDED-PLAN J15, G44 G143 G146 G155 G297 G307 G335 G338 G341 G348 G350 G355,
bible 5.6 / 5.7 / 5.8, conformance rows A3-A5 B2-B8 B13 B16 C4 D5, and the cited code at master 2148ec969 (no `src`
change on master since).

## Verdict: FIX

Intent is mostly right: Q9, Q12, Q13, G348, G350 and G335 are honoured, the three new behaviours ship dark with owner
and date, the waves are file-disjoint except as below, every PR is under ~1.5k lines, wire / save paths are claimed,
and the hard rules hold (fixed clocks, no randomness, no graphics reads, allocation-free steps named). Three items
change gameplay the wrong way or in another lead's area, and must be fixed before S1 / S2 / S5 start.

## Fixes (ranked by impact)

1. **A dog knocked out with gas would cost score (S2, A5).** `onEnemyKilled` runs for knock-outs too and adds
   `killScore` before its `e.ko` check (`src/game/modes/sectorMode.ts:1311-1319`; `Enemy.knockOut` -> `die` -> the dog
   path's `ctx.onKilled`, `src/ai/enemy.ts:2241-2245,2265-2270`). With `KILL_BASE.dog` = -120 the gas knock-out that
   G348 allows is penalised like a kill. Done looks like: the negative score applies only to a killed dog (`!e.ko`); a
   gassed dog keeps today's knock-out score and does not break No kills; `tests/killScore.test.ts` drives both through
   `onEnemyKilled`; the `sectorMode.ts:1312` edit is given to one slice without breaking wave 1 (S1 makes it, or S2
   runs after S1) and the claims say so.

2. **Repeat alarms (S5) change Marlow Yard, another lead's area at its cap, unclaimed.** In courseMode each guard alarm
   spawns a live team (`src/game/stealthSystems.ts:563-600`, `responseTeam(1, RESPONSE.liveTeam)`); A7 allows up to 3
   per load there, so a training set can get 9 extra guards (Q11: Marlow guards "only the logical amount required").
   Requesting e2e-ctcourse does not settle intent. Done looks like: A7 scopes the repeat to `SectorMode` (campaign and
   Sector Ops, where bible 5.7's levels apply) and Marlow keeps one alarm per load until J26, with a unit test that
   courseMode still raises once; or Marlow Build's OK is recorded under Coordination with its own walk item.

3. **Q1's default ships the reading that drops a recorded rule.** Michael's words fix the helmet on ("you can't shoot
   the helmet off"); G307 (2) and bible 5.6 (`docs/design-bible.md:506-507`) still say "the second kills". A2 makes
   every head hit deflect, so with A3 (stage-2 armour to all) and late armour no Perfectionist guard can be shot dead
   after stage 2, shipping ON at the cap. Done looks like: Q1 goes to Michael now (it is day; S1 has not started) and
   BRIEF's "Blocks" names S1's locked-helmet branch; or, until answered, the default is the reading that keeps G307 (2)
   (helmet stays, the second headshot kills) and A2 says it changes G307 (2), with "(Recommended)" moved or justified.

4. **S7's sighting radio has no hook outside `enemy.ts`, which S8 owns in the same wave.** `onLevel`
   (`src/ai/enemy.ts:2036-2048`) calls no manager callback on a level rise, and a rise to suspicious carries no cause.
   Done looks like: S4 stores the rise cause on `Enemy` (the bit J13 reuses), and S7 names, with file:line, how
   `enemyManager.ts` reads it for a lookout with no `enemy.ts` edit; or S7 claims `enemy.ts` and S8 moves after S7.

5. **Campus data coordination with J17 is left open, and nothing stops new helmet tags.** "Order with Sector Ops or
   hand S3 / S9 to them" is an either / or; J17 adds S4 / S5 guards to the same files. Done looks like: the PLAN picks
   one (for example, S3 lands before J17's first data edit, and S9 rides after S7 or goes to J17 by name); S1's
   `checkSectorGuards` also fails a slot or section `gear` of `'helmet'` / `'both'` (helmets come only from difficulty
   and stage, G350), with a `tests/sectors.test.ts` case, so J17's guards cannot bring them back.

6. **Marlow Yard's shield-led team is kept without saying so.** Q12 says campaign teams are armed only; Marlow Yard is
   the campaign's training prologue (Q6) with "Normal, armed" guards (VISION 2), yet `stealthSystems.ts:594` keeps
   the shield lead through `RESPONSE.shieldLead`. Done looks like: a BRIEF A entry states Marlow's live team keeps (or
   drops) the shield lead, with its undo, and names Marlow Build / the orchestrator to confirm.

7. **Claims gaps.** `tests/archetypes.test.ts` (S4, "if its line set changes") and the `sectorMode.ts` edit of fix 1
   are not in the slice lists or wave table. Done looks like: both claimed by their slice; the wave table stays
   file-disjoint.

## Polish (not blocking)
- Name the one `docs/systems/ai.md` editor per PR in the wave table (PR3: S4, PR4: S7); S6 and S8 hand their lines over.
- A9: name the "existing noise kind" a lookout's radio reports and note in ai.md that it is a radioed sighting, so the
  guard sheet and J13's cause log do not read it as a sound.
- A1: cite Q6 (Marlow Yard = campaign prologue) and VISION 2 ("Difficulty: As campaign") as the reason the helmet rule
  stops at `SectorMode`, so the next reader sees the choice was weighed.
- S1 at ~450 lines is tight for place / revive / team join plus six test files and two e2e checks; re-estimate if over.
- warehouseOps is frozen (Q26): say in PR1's body that its e2e edits are test upkeep for a code default, not map work.
