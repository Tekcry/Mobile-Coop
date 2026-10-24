status: done feature/sector-redesign-bake3 3c2d7d19

# Sector Ops: section-bake inline polish (bake2 check polish P1 / P2 / P4)

Lead: Night Shift | Sector Ops Build (brief 2026-10-24 ~22:45; overnight, the no-refining rule is lifted).
Unit tests only: no e2e, no GPU, no npm run check.

Base: `feature/sector-redesign-bake2` @ 54cdb9e1 (PR #354, train-ready). New branch: `feature/sector-redesign-bake3`
cut from that sha. Read first on the base: `docs/sector-redesign/checks/section-bake-robust-check.md` ("Polish" 1, 2, 4),
`docs/sector-redesign/checks/section-bake-robust.md`, CLAUDE.md "Hard rules" (hot paths allocate nothing: no closures,
iterators or temp arrays per call in `drainInline` / `failed1` / `pump`).

Only files to edit: `src/voxel/sectionJobs.ts`, `tests/sectionBakeRobust.test.ts`, new
`changes/feature-sector-redesign-bake3.md` (format: `changes/README.md`, `kind: patch`), and a report section appended
to `docs/sector-redesign/checks/section-bake-robust.md` ("bake3"). Do not touch `src/world/bakedLamps.ts`,
`src/world/sectionBake.ts`, `workerPool.ts`, `gameState.ts`.

Build (assumed decisions, undoable by reverting the branch):
1. (P2) A lamp in the inline queue that is a live-section member (`this.plan.liveMember(i)`, `src/world/sectionBake.ts:215`)
   bakes at once even while pool jobs run during play (one lamp per task as now, `setTimeout` 0 between lamps). Lamps
   that are not live members keep the "pool idle" rule. Simplest shape: `drainInline` scans from `inlineHead` for the
   first live member when `playing && poolJobs > 0`, without allocating (swap it to `inlineHead`, or keep a second
   Int32Array queue for live members; your call, explain it in the report).
2. (P1) During play a non-live inline lamp waits until it becomes live (`setLive` re-runs `drainInline`) or until the
   pool is idle, as now; it never runs while a pool job is in flight. Make sure `setLive` (`sectionJobs.ts:168`) calls
   `drainInline` so a waiting lamp of the newly live section bakes then.
3. (P4) The pool RETRY (second try, `tries[i] === 1`) uses a shorter cap `JOB_RETRY_CAP_MS = 20_000` (export it);
   the first try keeps `JOB_CAP_MS` 60 s. `checkStalled` picks the cap per lamp from `tries[i]`.
4. Tests in `tests/sectionBakeRobust.test.ts` (use the existing fakes / fake timers there): (a) during play, a live-
   member lamp that failed twice bakes inline while another pool job is still in flight; (b) a non-live one does not,
   and bakes after `setLive` makes it live; (c) a retry job past 20 s counts as failed while a first try at 30 s does
   not; (d) existing tests still pass unchanged.

Run: `npx tsc --noEmit -p .` and `npx vitest run tests/sectionBakeRobust.test.ts tests/sectionBake*.test.ts --maxWorkers=2`
(list every test file under tests/ that imports sectionJobs or sectionBake: `grep -rl -E "sectionJobs|sectionBake" tests`).

Done: branch pushed, tsc clean, those test files green with counts in the report, status line set to done.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
Branch `feature/sector-redesign-bake3` @ 3c2d7d19 (one commit on 54cdb9e1).
- P2: `drainInline` (sectionJobs.ts ~:314), while playing with pool jobs in flight, scans from `inlineHead` for the first
  not-landed `plan.liveMember` lamp; none -> hold as before; found -> `copyWithin` shifts it to the head in place (stable,
  held lamps keep their order; no allocation) and it bakes, one lamp per task. One queue, not two: live membership
  changes with `setLive`, so a second queue would need moves on every live change; the queue only holds twice-failed lamps.
- P1: `setLive` calls `drainInline` after the live listeners; non-live lamps keep the idle-pool rule.
- P4: exported `JOB_RETRY_CAP_MS = 20_000`; `checkStalled` uses it when `tries[i] === 1`, else `capMs ?? JOB_CAP_MS`.
- Tests: `npx tsc --noEmit -p .` clean; vitest sectionBakeRobust 12/12 (9 old unchanged + 3 new a/b/c),
  sectionBake 11/11, sectionBakeCampus 3 passed 1 skipped (heavy case, as before): 26 passed, 1 skipped.
  Mutation check by the builder: reverting each change fails its new test.
- Also: changelog fragment `changes/feature-sector-redesign-bake3.md` (patch), "bake3" section in
  `docs/sector-redesign/checks/section-bake-robust.md`.
- Follow-up (outside the brief's files): `docs/systems/lighting.md` "Failures" (~:161-163) still says the inline bake
  always waits for an idle pool and names only the 60 s cap.
- Deviation: none. The check's polish-1 option (hold non-live lamps until setLive / match end) not taken; the brief keeps
  the idle-pool rule.
