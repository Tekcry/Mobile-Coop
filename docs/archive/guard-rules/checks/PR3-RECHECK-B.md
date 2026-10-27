# guard-rules PR3 re-check B
Owner: Guard AI Build. Status: current.
Verdict: PASS

Re-checker B (Opus 5.5, fresh, independent of A), 2026-10-25. Head e3df84001 (feature/guard-rules-f0), base 452e23035;
the S4 fix round `84a6c82c4..479b938d2`; PR3's fragment e3df84001. Focus: the wire, co-op, line text, tests and docs.
Read: S4-BRIEF, S4-CHECK-A / B, PLAN "Tests and e2e per PR" PR3 and "Wire paths", origin/master CLAUDE.md "Hard rules
(code)", RULES.md "Definition of done", changes/README.md, session-method.md (blocks only on broken, unplayable or
off-intent), `scripts/merge-train.mjs` `wirePaths` / `planWire` (origin/master).

## Checks run
- `npx vitest run tests/coopGuardAi.test.ts tests/barkCause.test.ts tests/guardPolishA.test.ts tests/guardPolish2.test.ts
  tests/changesFragments.test.ts`: 5 files, 65 pass, 1 skipped (`guardPolish2`'s existing `it.skip`).
- Also `tests/combatHearing.test.ts tests/archetypes.test.ts tests/pairs.test.ts tests/pairsWiring.test.ts`: 4 files, 79 pass.
- `npm run typecheck:fast`: clean.

## Wire and co-op: clean
- `src/ai/barks.ts:127-139`: `BARK_EVENTS` = the 37 base entries unchanged, then `heard` 37, `spotCall` 38, `saw` 39
  (append only, 40 entries, far under `BARK_CAM` 254). `src/net` is untouched by PR3 (`git diff 452e23035 HEAD -- src/net`
  empty); `PROTOCOL_VERSION` 62 as at base.
- Host `coopHost.ts:315` sends `barkIndex(ev)`; `protocol.ts:504-512` accepts the index; client `coopClient.ts:942-945`
  rebuilds index 39 with `barkLine` and takes radio from `RADIO_BARKS`, which does not hold `saw` (`barks.ts:161`), so it
  plays spoken, no chirp, on both sides. No `src/net` change needed.
- No test asserts the protocol number (`coopCarry.test.ts:22` checks only an integer; the rest read the constant;
  `mergeTrain.test.ts` uses synthetic text).
- `tests/` and `scripts/e2e-*.mjs`: no reliance on the old `investigate` lines, on "I heard something." under
  `investigate`, or on "Thought I saw something." (only `barkCause.test.ts:315`, now under `saw`). `archetypes.test.ts:91-94`
  reads `BARKS.investigate` generically (still 4 lines).

## Lines
- "Better take a look.", "Thought I saw something.", "Something moved over there.", "Saw movement. Checking it.":
  original, plain, voiceable (G82), no reference-game names (G6), all under 30 characters. The `investigate` table is now
  neutral only (no sight, no sound claim).

## Tests
- `tests/coopGuardAi.test.ts:91-103`: the literal first 37 compared with `toEqual`, and `heard` 37, `spotCall` 38, `saw` 39
  pinned. The round-trip test (105+) covers `saw`'s three lines.
- `tests/barkCause.test.ts:382-388` (case 8): every `investigate` line fails `/saw|heard|noise/i`, `saw` lines <= 90,
  `saw` not radio. The fix cases a-d and the `hearTurn` case cover both stale flags and the neutral path.

## Docs
- `docs/systems/ai.md:118-125` (Rise cause): matches the code (`enemy.ts:2088-2093` cause and bark, `2119-2121` calm
  transition clear, `2663-2666` calm-with-empty-meter clear; `calmNow` = unaware / cooldown). "Sight wins" appears once
  (121); the Barks line (744-748) points to Rise cause and maps `heard` / `saw` / `investigate` to the three causes. Co-op
  (450-452) names 37 / 38 / 39. S6's Talking pairs fold (210-222) reads cleanly in its own bullet and agrees with S4's
  leak / `hearTurn` wording in `Enemy.disturbed`.

## Fragment
- `changes/feature-guard-rules-f0.md`: parses; name matches the branch; `kind: minor` right (S4 ships on). Bullet 1 is
  accurate (a light / body check's own report line plays first, and it is neutral too); bullet 3 matches `PAIRS`
  (`notice` 3, `togetherR` 4, `postedPeriod` 40, `meetMax` 6) and the `?guardpairs=1` flag.

## Blocking
None.

## Polish
1. `changes/feature-guard-rules-f0.md:5`: "A guard who stays calm forgets an old glimpse or noise, so a later noise is never
   reported as a sighting." describes the fix to S4's own unreleased latch; against the last release nothing changed
   (master's `investigate` held no sight line and no cause). Drop it, or fold "only what he just noticed counts" into
   bullet 1. Bullet 1's quoted `"heard"` / `"saw"` read as code names; plainer: "a sound gives a line about hearing
   something, a sight a line about seeing something".
2. Train bump: `merge-train.mjs` `wirePaths` is `src/net/` plus protocol.ts's imports, and `src/ai/barks.ts` is not one.
   PR3 gets the bump today only because the stacked branch also carries PR1's `src/net/coopHost.ts`. If PR1 reaches
   master in an earlier train, PR3 alone would not bump `PROTOCOL_VERSION`. Harmless (an old client's `barkLine` returns
   null for 37-39 and drops the line; index 1 line 2 shows the old text), but the ai.md "the train's protocol bump covers
   it" claim would then be false. Lead: ship PR3 in the same train as PR1, or note it at the train.
3. `TESTING.md`: no line for barks by cause (RULES "Definition of done" lists it for a player-facing change). Walk item
   8 is Michael's; a one-line desktop check ("seen, he says a sight line; only heard, a hearing line") would carry it.
4. `docs/systems/ai.md:452`: the rewrapped line runs past the file's ~120-character wrap.
5. `tests/barkCause.test.ts:385`: the neutral check misses other sight words ("movement", "spotted", "seen"); widen the
   regex if the table grows.
