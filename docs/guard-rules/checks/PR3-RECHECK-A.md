# guard-rules PR3 re-check A
Owner: Guard AI Build. Status: current.
Verdict: PASS

Re-checker A (Opus 5.5, fresh; AI behaviour and intent of the S4 fix round, merge integrity). Head e3df84001
(feature/guard-rules-f0), base 452e23035. Fix round `84a6c82c4..479b938d2` (e1c9a7dab, 479b938d2). Read: S4-BRIEF,
BRIEF A8, S4-CHECK-A / B, origin/master CLAUDE.md "Hard rules (code)", session-method.md, bible P5, the fix diff and the
code it touches (`updateAwareness`, `onLevel`, `hear`, `hearTurn`, `sendTo`, `checkLight`, `checkBody`, `hearSearch`,
`standDown`, `AlertMachine.step` / `calmNow`, `stepMeter`, `seenAt`).

## Checks run
- `npx vitest run tests/barkCause.test.ts tests/combatHearing.test.ts tests/archetypes.test.ts tests/pairs.test.ts
  tests/pairsWiring.test.ts tests/coopGuardAi.test.ts tests/guardPolish2.test.ts tests/guardPolishA.test.ts`: 8 files,
  143 pass, 1 skipped (the existing `guardPolish2` `it.skip`).
- `npm run typecheck:fast`: clean.
- Old-bug proof (a throwaway detached worktree in the scratchpad, removed after): head e3df84001 with only the 4-line
  clear deleted from `enemy.ts` -> `barkCause.test.ts` cases a, b, c, d fail (4 of 17); with it, all pass. The
  `hearTurn` case (line 328) passes either way (a fresh guard: it documents `RISE_NONE`, it does not test the stale
  path; polish 1).
- Scratch probes on the fixed code (same throwaway worktree, all pass): a drained glimpse then `hearTurn` -> suspicious,
  `RISE_NONE` (the S7 lookout case from check A); a sight at `PERCEPTION.leak + 1e-6` from meter 0 still latches
  `sawMoment` this step; a soft noise, suspicious, meter forced to 0 while suspicious: `heardMoment` kept, walks over
  with `heard`; `sendTo` on a calm guard at meter 0 -> `RISE_SOUND` (S4-c holds); a glimpse with the meter still up,
  then `hearTurn` -> `RISE_SIGHT` (real, undrained evidence).

## The blocker: fixed
`src/ai/enemy.ts:2663-2666` `if (this.aware.calmNow && this.meter <= 0) { sawMoment = false; heardMoment = false; }`:
- Placement: after `stepMeter` (2621) and before the sets (2667-2670) and `aware.step`. `calmNow` is unaware or cooldown
  (`alertState.ts:127`), so it covers the unaware guard and the fought / cautious guard parked in cooldown, the two
  cases both checks reproduced.
- Never drops this step's evidence: a seen step has `rate > leak`, so `stepMeter` has already lifted the meter above 0
  (`perception.ts:211`) and the clear is skipped; a noise or a board send sets `heard`, which is latched after the clear.
- Cannot clear mid-rise: suspicious / investigating / searching / alert are not `calmNow`, so a moment that is carrying
  a rise is never touched, even with the meter at 0 (probe 3).
- Other paths: `checkLight` / `checkBody` call `onLevel` from the board between steps and read the moment as left by
  the last step, which is now clean for a calm guard with nothing on his meter (case d). `hearTurn` sets no `heard`;
  a drained glimpse no longer turns his footstep rise into SIGHT (probe 1). Every calm transition (`standDown`, the
  machine's own) still goes through `onLevel`'s clear. A revived guard is a new `Enemy` (fields start false). No new
  stale-state path found.

## Beyond the brief: the `saw` event (on-intent)
`src/ai/barks.ts:104, 138`, `enemy.ts:2093`: a third appended event `saw` (index 39) holds the sight lines; `investigate`
becomes neutral only ("Better take a look." replaces "Thought I saw something."). Judged against A8 ("a rise to
investigating says a sight line or a sound line by what drove it") and P5 ("after any detection the players can say why
it happened"): on-intent and closer to both than the brief's design, where a sight rise said a sight line 1 time in 4
and a `RISE_NONE` rise (a light, a body) could claim a sighting 1 time in 4 (check A polish 5). It is the same kind of
wire change A8 already logs (append only, first 39 frozen, the train's protocol bump covers it; `coopGuardAi.test.ts`
pins index 39; the round-trip test covers its lines). Lines original, under 90 characters, not radio. No test or e2e
asserts the moved text. Not blocking; the decision log needs one line (polish 2).

## Merge integrity
- `git diff 452e23035 e3df84001 --stat`: 19 files = S4's 8 + S6's 8 (sharing `docs/systems/ai.md`) + the wave 4 briefs
  (S7 / S8 / S9, on F0 before the merges) + the changelog fragment.
- Source and test files are disjoint and byte-identical to their slice heads: `barks.ts`, `enemy.ts`, `barkCause`,
  `combatHearing`, `coopGuardAi` = 479b938d2; `enemyManager.ts`, `pairs.ts`, `e2e-sectorops.mjs`, `pairs`,
  `pairsWiring` = 8d3c91914; the four check files likewise.
- `docs/systems/ai.md`: the merged file is S4's version plus exactly S6's Talking pairs hunk (the only diff against
  479b938d2), and S4's three hunks are the only diff against 8d3c91914. Rise cause (118-125), pairs (210-222), Co-op
  (451-452), Barks (745-748) read coherently; nothing lost.
- `changes/feature-guard-rules-f0.md` (kind minor) covers barks by cause, the calm reset and pairs (dark).

## Hot path
The clear is two boolean writes behind a getter and a number compare; the bark pick is a nested ternary on numbers
choosing a string literal. No allocation, no closure, no `Math.hypot`.

## Blocking
None.

## Polish
1. `tests/barkCause.test.ts:328`: the `hearTurn` case uses a fresh guard, so it passes with or without the fix. Run it
   after `glimpseAndDrain(g, 'unaware')` to pin the exact S7 case (a lookout's drained glimpse must not make a footstep
   turn read `RISE_SIGHT` and radio `spotCall`).
2. `docs/guard-rules/BRIEF.md:88-90` (A8) still names two appended events. Lead: log `saw` (39) and widen the undo to
   "map `heard`, `saw` and `spotCall` back to `investigate` and restore its sight line".
3. Carried from check A, still open and harmless: `stimX` / `stimZ` are the last stimulus, not necessarily the cause's
   spot (a glimpse plus a later noise: `RISE_SIGHT` at the noise point); dogs' smell counts as sight (`rate`). One
   ai.md line each when S7 / J13 read them.
4. Untracked `.vitest/` in the worktree: keep it out of commits.
