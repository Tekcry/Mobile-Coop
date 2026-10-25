import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Heavy tests (NullEngine, map builds, voxel fits) pass Vitest's 5 s default alone, but under load (an e2e run
    // alongside, the laptop at BelowNormal) the whole run is about 10x slower: a 120 s hang guard (docs/archive/unit-timeouts).
    testTimeout: 120_000,
    // Persist transformed modules across runs (cache dir node_modules/.vitest-cache, gitignored with node_modules):
    // transform was 75-88% of tracked time on every run (agent CPU cost, 2026-10-23).
    fsModuleCache: true,
  },
});
