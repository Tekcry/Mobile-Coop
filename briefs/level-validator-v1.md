status: open

# level-validator V1: scripts/level-validate.mjs + tests/levelValidate.test.ts (Marlow Build, job level-validator)

Lead: Night Shift | Marlow Build (desktop). Node + Vitest only: no src change, no e2e, no GPU, no npm run check.

## Base and branch
- Base: `origin/feature/level-validator` (head at claim time; the plan is 96d03285 or later).
- New branch: `feature/level-validator-v1`. Edit ONLY `scripts/level-validate.mjs` (new) and
  `tests/levelValidate.test.ts` (new). Other agents own every other file of the job (PLAN "File ownership").

## The brief
`docs/level-validator/PLAN.md` on the base, in this order of authority:
1. "## Michael's changes M1-M4" (OVERRIDES everything below it). For V1 that means:
   - M2: NO size or time constants in the validator. Every number (corridor / door / ceiling / step / grid / speeds /
     90 s / 15 s / 2.0 m / room table / shadow / vantage / LOS targets) comes from a metrics object. CLI flag
     `--metrics <file>` (default `docs/design/metrics.json`, generated later by slice V1a). Until V1a lands, the tests
     pass an inline metrics object, and the CLI without the file prints one WARN and skips the size checks.
     PLAN's "Constants at the top" list and `parseRoomTable` / `--rooms` are SUPERSEDED: read sizes from metrics.
   - M3: every space has `section`; `checkRedundancy` = 2+ edge-disjoint routes from each section's entry to its exit.
   - M4: shadow %, vantage 70%, LOS 5 s, revive 15 s are declared targets: a missing target is an ERROR, a declared
     value outside the metrics target is an ERROR. Split parity = summed link traversal TIME (link length / the link's
     movement-mode speed from metrics), not room length.
   - Guard counts (3-6 early / 6-10 late) print as `INFO:` lines only, never ERR / WARN.
2. "## Core schema" (fixed; V0 documents it in parallel).
3. "## V1 - validator port" (functions, CLI shape, exit codes, the failing-fixture list for the tests), minus what M1-M4 supersede.
Reference only: `docs/level-validator/source/validate_level.py` (Michael's skill; our rules win, port the algorithms
such as edge-disjoint paths). Michael widened the first run to ALL FIVE campus sections; nothing in V1 changes for that.

## Checks you run
- `npx vitest run tests/levelValidate.test.ts` green; `npx tsc --noEmit` clean; `npx eslint tests/levelValidate.test.ts`
  (scripts/**/*.mjs is eslint-ignored); `node --check scripts/level-validate.mjs`.
- Report the counts (tests passed / total).

## Done
Push `feature/level-validator-v1` (one or more commits; trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>").
Then add a report at the end of this file (exports, checks, test count, deviations, any M1-M4 point you could not
follow) and set `status: done feature/level-validator-v1 <sha>`. Marlow Build runs one Opus checker and merges it.
