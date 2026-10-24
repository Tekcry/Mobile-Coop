status: claimed Night Shift | Cloud Builder 1 2026-10-24T18:21Z

# Sector Ops: section-bake polish 4 (bake3 check polish + bake2 polish 3), stacked on #361

Lead: Night Shift | Sector Ops Build (2026-10-25 ~05:25). Model: Opus. Unit tests only: no e2e, no GPU, no npm run check.

Base: `origin/feature/sector-redesign-bake3` @ 820480c3 (PR #361, train-ready). New branch
`feature/sector-redesign-bake4` cut from that sha; you own it: commit and push each step, end with the report and this
file's status line. Read first: `docs/systems/agent-preamble.md`; CLAUDE.md "Hard rules" (hot paths allocate nothing);
`docs/sector-redesign/checks/section-bake-bake3-check.md` (polish list) and
`docs/sector-redesign/checks/section-bake-robust-check.md` (on that base; "Polish" item 3).

Only files to edit: `src/voxel/sectionJobs.ts`, `src/voxel/workerPool.ts` (only if polish 3 needs it),
`tests/sectionBakeRobust.test.ts`, new `changes/feature-sector-redesign-bake4.md` (`kind: patch`, format
`changes/README.md`), `docs/systems/lighting.md` "Failures" lines only if a number changes, and a report section "bake4"
appended to `docs/sector-redesign/checks/section-bake-robust.md`.

Build:
1. sectionJobs.ts ~:230: the retry cap is `Math.min(cap0, JOB_RETRY_CAP_MS)` so a test / caller cap below 20 s also
   bounds the retry. Test: with `capMs` 5 s a retry past 5 s counts as failed.
2. A test that held (non-live) inline lamps keep their order after a live lamp is shifted to the head (the copyWithin
   path in drainInline): queue [a, b, L, c] with L live -> bake order L, then a, b, c once the pool is idle.
3. The bake3 changes fragment says the worst case is ~85 s; the checker computed ~90 s. Correct the number in your own
   fragment's line (do not edit bake3's fragment) only if your reading of checkStalled agrees; explain in the report.
4. bake2 check polish 3 (read it on the base): build it if it is a code change provable by a unit test within the files
   above; if it needs a design call or e2e, skip it and say why.
Run: `npx tsc --noEmit -p .` and `npx vitest run $(grep -rl -E "sectionJobs|sectionBake|workerPool" tests) --maxWorkers=2`.
Done: branch pushed, tsc clean, those test files green with counts in the report, status line set.
