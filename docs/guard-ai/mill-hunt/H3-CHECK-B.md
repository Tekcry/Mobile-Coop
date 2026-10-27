# guard-ai mill-hunt: H3 check B (PARTIAL)
Checker: Opus 5.5 (checker B of two, independent of A), 2026-10-27. Scope: `git diff 03a82e58d...97a26b0c6` on
`flags.ts`, `enemy.ts`, `enemyManager.ts`, `e2e-piano.mjs`, `e2e-affected.mjs`, `tests/millHuntGlue*.test.ts`.

Status: PARTIAL (save point). Verdict pending; no FIX found so far.

## Checked so far
- Flag off: every new branch gated on `mhOn` (false) or `millHunt` (null); same truth values as master.
- mhTick before boardStep: `incidents.ts:544` `free()` = unaware / suspicious / cooldown only, so the put-back first
  keeps the incident board off calm hunt guards. Nothing else in the 0.2 s block reads what mhTick writes.
- mhIdx / member(i): reuse after free (dead / taken) and the woken-guard slot take-over are both caught by
  `member(i) !== e`.

## Commands and results
- `npm run typecheck:fast`: exit 0.
- `npx vitest run` on the 79 test files importing `ai/enemy` / `ai/enemyManager` / `sceneSweep` / `pianoGuards`
  (incl. millHunt, millHuntGlue, millHuntGlueAlloc) + `tests/millHuntThornbeck.test.ts`: 80 files passed, 1206 passed,
  1 skipped.
- `node --check scripts/e2e-piano.mjs`: ok.
