# MERGE4 check: cd93bd3f0 (origin/master 4.114.0 into feature/guard-rules-f0, PR #558)

Fresh Opus merge checker, read-only, 2026-10-26. Parents: ae3d37a74 (branch, passed its own merge check) and
ee1abab6b (origin/master 4.114.0).

## Verdict: PASS

No fixes.

## 1. Conflict resolution (src/core/flags.ts, tests/previewFlags.test.ts)
- vs master: the only additions are the three guard flags (interface docs + `darkFlag(params.get(...), PREVIEW_ON)`
  reads) and the test's off-default and source-line asserts. Every master line kept (`marlowReplan`, `anim`,
  `PREVIEW_ON`, `darkFlag`, `CAMPUS_V2_ALL`, `readCampusV2(v, preview)`, the darkFlag reads of guardModels /
  charShadowLight / mapReady, campusV2).
- vs branch: guardPairs / lookouts / dogRelease kept with their docs (now noting the /preview/ default); `=1` still
  turns each on, no URL means off outside /preview/.
- No duplicate keys: each of guardPairs, lookouts, dogRelease, marlowReplan appears once in `Flags` and once in `flags`.

## 2. Auto-merged overlap (branch files also changed by master)
- `src/ai/enemy.ts`: master's seed-random (`senseRng` for the think cadence) and runner-armed (weave, press-in,
  `known.y` storey) edits sit outside the branch's barks-by-cause / pair code. No clash.
- `src/ai/enemyManager.ts`: master seeded the radio / shout jitter (`seeded01`, `SEED_RADIO`); the branch's pair code
  (`buildPair`, `postedWhyNot`, `pairStep`, `pairMissing`) is untouched by it. The branch adds no `Math.random` in src.
- `scripts/e2e-sectorops.mjs`: master split the campus parts into `--part=6..9`; the branch's pair-check blocks
  ((c), (d)) live under `want(1)` (warehouse), so the renumbering does not move them.
- `TESTING.md`: separate sections, no clash.

## 3. Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run` previewFlags, barkCause, combatHearing, coopGuardAi, pairs, pairsWiring: 6 files, 108 tests pass.

## 4. /preview/ with the flags on
- Only `flags.guardPairs` is read in src (`EnemyManager.buildPair`, load time). `lookouts` and `dogRelease` are declared
  but not read yet (S7 / S8), so turning them on in /preview/ changes nothing.
- guardPairs on: timed-loop pairs get `watch: true`; two standing pair-tagged guards within `PAIRS.meetMax` become a
  posted pair. Inputs are null-safe: a pair needs a placed partner (`guardAtSlot` / `slotGuard` bounds-checked, null
  returns early), `postPoint` is always the spawn post, `postDef` / `patrolRoute` null checked, dogs refused,
  `pairMissing` returns when the goer is gone. Maps with no `pair` tags build no pairs. Pair-tagged slots exist in
  campus S1-S3 (live and campusV2, which /preview/ now loads for every section); master changed only objective labels
  there. Nothing found that breaks /preview/ play.
- e2e builds do not set `VITE_PREVIEW`, so `PREVIEW_ON` is false there and the flag-off proofs still hold.

## Polish (non-blocking)
1. The flag-off talking-pairs e2e block relies on no URL flag; adding `&guardpairs=0` would keep it a flag-off proof
   even if e2e is ever pointed at a preview build.
