status: done feature/sector-redesign-bake4 ad69c83e

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

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
- `feature/sector-redesign-bake4` @ ad69c83e (base 820480c3), one commit (steps 1 and 4 edit the same lines of sectionJobs.ts). 5 files: sectionJobs.ts, workerPool.ts, sectionBakeRobust.test.ts, changes fragment, the "bake4" section of `docs/sector-redesign/checks/section-bake-robust.md` (full report there).
- 1. checkStalled (sectionJobs.ts:236): retry cap = Math.min(cap0, JOB_RETRY_CAP_MS); test: capMs 5 s, retry past 5 s -> inline.
- 2. Test: inline queue [a, b, L, c], setLive(L's section) -> L bakes while a pool job runs; pool idle -> a, b, c in order (a swap fails it).
- 3. Worst case ~90 s (65 + 25: the 5 s strict check on both tries), agreeing with the checker; fixed in this fragment and the "~85 s" comment at sectionJobs.ts:31 (in the file list); bake3's fragment untouched.
- 4. Robust polish 3 built: past its cap a job is cancelled via new `WorkerPool.cancel` (workerPool.ts:105): queued -> dropped; running -> worker terminated and replaced, pool keeps its size; done() ignores terminated workers. BEHAVIOUR CHANGE for the lead to confirm: a first try over 60 s is now killed, not left running beside its retry (a really slow lamp > 60 s loses that try, goes retry, then inline).
- Tests: tsc clean; eslint clean; the brief's grep set (sectionBake, sectionBakeRobust, sectionBakeCampus) 30 passed + 1 skipped (heavy campus case); robust 16/16 (12 old + 4 new); changesFragments 1/1. Rerun by the builder session: 30 + 1 skipped. Mutations (no Math.min, swap instead of copyWithin, no cancel call, no `done` guard) each fail exactly their new test.
- Open: lighting.md "Failures" not edited (no number changed) but does not mention stalled-worker replacement (one-line follow-up); the real Worker terminate / respawn is tested with a stub Worker only (no e2e reaches a hung worker).
