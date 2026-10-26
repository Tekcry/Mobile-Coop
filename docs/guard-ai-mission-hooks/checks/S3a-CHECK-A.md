# S3a check A (per-area alarm module)
Owner: Guard AI Build. Status: current.

Checker: fresh Opus 5.5, checker A. Head `df0fb6028` on `feature/guard-ai-mission-hooks-s3a`, base `5db49d2ec`
(S1a-1 polish; J15 PR4 and `flags.areaAlarms` present). Spec: S3-BRIEF "Part 1", S3-a..S3-h, lead decisions.

## Verdict: PASS

No fixes.

## What was checked
- Scope: the diff is `src/ai/areaAlarms.ts` (145 lines) and `tests/areaAlarms.test.ts` (274 lines) only. Nothing from
  Part 2 (no `enemy.ts`, `enemyManager.ts`, e2e or flag change).
- Purity: the one import is `ALARM_REPEAT` from `./alarm`, which imports only `hyp2` from `src/core/mathx` (no imports).
  No Babylon, DOM, flag read or `src/game` import.
- `areaOf` (`areaAlarms.ts:40-54`): first area `i < AREAS.max` whose band (when set) holds y and whose box holds (x, z),
  edges included; `null` / `[]` / a box-less area / a third area -> -1. Box order `[minX, minZ, maxX, maxZ]` as the brief.
- `AreaStages` (`:61-145`): fields and types as the brief (`Int8Array` stage, `Uint8Array` raised / rearmed / count,
  `Float32Array` ago, `Int32Array` team0 / teamN, all sized `AREAS.max`). `stageFor` reads the site outside 0..max-1,
  else max. `open`, `any`, `raise`, `waiting`, `tick`, `rearm`, `resetLocks`, `clearStages` match the brief and mirror
  J15's site rule in `enemyManager.ts:860-866` (`n >= 1 && n < max`, `ago >= rearm`). `resetLocks` keeps the stages,
  `clearStages` keeps the locks (S3-e).
- Allocation: no method allocates (typed-array reads and writes, `fill`); `any()` is a two-step loop.
- Strict TS: `!` only on typed-array reads in range; `type AreaBox` import in the test.
- Tests: every brief case is one or more `it`s, plus edges (box edges, empty area, -1 / `AREAS.max` / 5 for `stageFor`).
  They would fail on a wrong implementation: band ignored (`:53`, `:57`), min instead of max (`:95`), `>` instead of
  `>=` on the clock (`:159`, exact 0.25 s steps), `<=` instead of `<` on the cap (`:203`), resets crossing over
  (`:230-232`, `:246-247`), a clock shared between areas (`:161`, `:174`), reallocation (`:266-272`). The 1/60 s run
  checks the Float32 clock fires within one dt of 60 s.
- Runs: `npm run typecheck:fast` clean; `npx vitest run tests/areaAlarms.test.ts` 24 / 24 passed.

## Polish (non-blocking)
1. `open` / `raise` / `waiting` / `tick` / `rearm` with an area outside 0..max-1 are not tested. They are harmless today
   (a negative or out-of-range typed-array index reads `undefined` and writes nothing, so `open(-1)` is false and
   `raise(-1)` is a no-op), and the doc (`areaAlarms.ts:58`) puts the range check on the manager; one test pinning
   `open(-1) === false` and `raise(-1)` changing nothing would stop a later refactor to plain arrays from silently
   writing a `-1` key.
2. `count` is a `Uint8Array`: it would wrap at 256 raises. Unreachable through the manager (the lock stays shut after
   `ALARM_REPEAT.max`), but `raise` itself has no cap; a one-line note in its doc would say so.
3. The area clock is Float32 (brief's choice) while J15's site clock (`alarmAgo`) is a float64 number: at 60 Hz the two
   can fire one frame apart. Fine for the rule; worth a word in the S3b ai.md lines if the e2e ever compares them.
4. `tick` does not check `waiting`; the doc says "per step while `waiting`", so S3b's `repeatStep` must keep that guard
   (brief step 15 does).
