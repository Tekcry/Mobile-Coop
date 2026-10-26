/**
 * (mixamo-retarget I9 fix round, BATCH2-PLAN I8) The Mixamo captures no game code names, loaded as ONE lazy chunk off
 * the entry chunk: batch 2's 24 game-slot modules in `clips/mixamo/` (I10 / I13 wire them; until then only the Anim
 * Studio plays them) and every Anim Studio only module in `clips/mixamo/studio/`. `studio.ts` reaches this module only
 * through one dynamic `import()` (`loadStudioCaptures`), when the Anim Studio opens; its own eager glob leaves out the
 * same file names (the patterns there are this list negated; `tests/studioCapturesLazy.test.ts` pins that the two sets
 * split the folder). Batch 1, I4 and I6 (imported by path from `mixamo.ts`) stay eager.
 */
const MODS = import.meta.glob(
  [
    './clips/mixamo/pistol_*.ts',
    './clips/mixamo/rifle_*.ts',
    './clips/mixamo/aa_*.ts',
    './clips/mixamo/cover_idle.ts',
    './clips/mixamo/stand_cover_to_look.ts',
    './clips/mixamo/crouch_look_around_corner.ts',
    './clips/mixamo/studio/*.ts',
  ],
  { eager: true },
);

/** The lazy modules' paths (relative to `src/anim`, as the glob gives them). */
export const LAZY_CAPTURE_FILES: readonly string[] = Object.keys(MODS);

/** Every lazy module's exports (the keyed clips among them are picked out by `studio.ts`). */
export const LAZY_CAPTURE_MODULES: readonly Record<string, unknown>[] = Object.values(MODS) as Record<string, unknown>[];
