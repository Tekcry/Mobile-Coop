# batch-23 recheck (since b23-CHECK.md PASS at 92ba8c94)

Verdict: **PASS**

Scope: ee8a0af9 (Anim Studio out of the pause menu), 7f8f1286 (merge origin/master 4.74.0), ccb36132 + 3010ecc0
(interrogation patrol timing via `Enemy.patrolRoute`, PATROL-TIMING.md). Head reviewed: 3010ecc0.

## Findings
- ee8a0af9 correct: `src/ui/screens/pauseScreen.ts:152` the studio row and `PauseOpts.inStudio` are gone; the
  `anim-tuner` row stays; `src/game/gameState.ts:1194` no longer passes `inStudio`; no other reader of `inStudio`
  remains. Main menu keeps `anim-studio` (`scripts/e2e-menus.mjs:383`, `scripts/e2e-park.mjs:45` unchanged).
- e2e asserts tightened, not loosened: `scripts/e2e-menus.mjs:467` exact key list now without `anim-studio`, plus an
  explicit has-tuner / no-studio assert; `scripts/e2e-studio.mjs:1335` adds `includes('anim-tuner')`;
  `scripts/e2e-pad.mjs:480` drops only the removed row's focus step (Tuner -> Quit order still asserted).
- 7f8f1286: clean merge (`git show --remerge-diff` empty: no conflict hunks). `git diff b1e1809b 7f8f1286` equals the
  branch's own diff from the merge base line for line: nothing of master lost or altered.
- ccb36132: `src/game/intel.ts:23-30` `PatrolSource` now required `patrolRoute: PatrolRoute | null` (matches
  `src/ai/enemy.ts:664` getter); `intelGuard` (`intel.ts:75-77`) keeps the same up / speed rule as the old inline code
  (`intelReveal.ts:14`, `PACE.patrol` = `PATROL_PACE` used by the walker, `enemy.ts:179,1805`). `tests/intel.test.ts:59`
  `(e: Enemy): PatrolSource => e` makes tsc catch a getter rename. Not a hot path (once per interrogation reveal), so
  the per-guard object is fine.
- e2e-takedown (`scripts/e2e-takedown.mjs:277-296`): new asserts only (getter identity, feed "Patrols near: 1, loop N s");
  N computed from the same formula as `patrolPeriod` ping-pong (12 m / (walkSpeed x 1.1) + 2 x 5 s). Existing asserts unchanged.
- No src/ai / src/net edit by the branch's own commits (those paths change only via the master merge). No wire or save
  change (PROTOCOL_VERSION untouched). Strict TS: `npx tsc --noEmit -p .` clean.
- Tests run here: `vitest tests/intel.test.ts` 16/16 pass; tsc clean. e2e not run (read-only role); builder reports
  e2e-menus / e2e-studio / e2e-takedown pass on lane 2.

## Polish (non-blocking)
1. `docs/interrogation-intel/PATROL-TIMING.md:5` cites the getter at `enemy.ts` ~651; it is at 664.
2. `PATROL-TIMING.md` says the feed reads "loop 22 s" as a fixed number; the e2e computes it from `def.walkSpeed`,
   so the doc could say "loop N s (computed)".
3. `tests/intel.test.ts:59` exports a value from a test file only to type-check; a `const _x: (e: Enemy) => PatrolSource = (e) => e; void _x;` would avoid the export.
4. e2e-pad drop: it did not list e2e-pad as run in PATROL-TIMING.md / the ee8a0af9 notes; worth one laptop or lane run
   since its focus walk changed.
