# lips-join report
Built: one campus co-op lip list in `src/world/maps/campusLips.ts` (`[...S1, ...S2, ...S3]`), no load-time mutation.
campusS1.ts: `CAMPUS_COOP_LIPS` renamed `S1_COOP_LIPS` (same contents).
campusS2.ts / campusS3.ts: push lines and comment removed, unused imports dropped; S3 doc comment points at campusLips.ts.
Tests: campusS1/S2/S3 test imports moved to `../src/world/maps/campusLips`; CAMPUS_COOP_LIPS[0] (CR1) uses unchanged.
No import cycle: campusLips imports S1/S2/S3; none of them import campusLips. `grep "as CoopLip\[\]" src` prints nothing.
Checks: tsc clean; vitest campusS1/S2/S3/sectors 4 files, 147 tests passed; eslint clean on changed files.
Files: src/world/maps/{campusLips(new),campusS1,campusS2,campusS3}.ts, tests/campusS{1,2,3}.test.ts.
Skipped: build, e2e (per brief).
