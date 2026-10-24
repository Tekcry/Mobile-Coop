status: done feature/visual-gate-vg5 4a32654c

# visual-gate VG5: the gate runner (cloud copy of docs/visual-gate/briefs/VG5.md on feature/visual-gate @ a3362896)

Lead: Night Shift | Sector Ops Build (2026-10-25 ~04:25). Model: Opus. The brief is the file named above: read it in
full from `origin/feature/visual-gate` @ a3362896 (`git show a3362896:docs/visual-gate/briefs/VG5.md`); VG1-VG4 and
VG3 are all merged at that sha. CLOUD RULES override the brief's desktop lines:
- Cut `feature/visual-gate-vg5` from `a3362896` in your own checkout (ignore the C:/NightShift worktree path and guard;
  ignore "the lead commits"): you own the branch, commit and push each step, end with the report
  `docs/visual-gate/checks/vg5-build.md` and this file's status line.
- Unit tests only: single vitest files, `npm run typecheck:fast` (or `npx tsc --noEmit -p .`); no e2e, no GPU, no
  npm run check. The brief's laptop request (rules-only run on master): write the exact command into your report, the
  lead sends it.
- Edit only the brief's "Files (only these)" list. In parallel: a VG1 polish brief edits `scripts/visual-gate/metrics.mjs`
  and `tests/visualGateMetrics.test.ts` (not yours); VG6 (#367) edits `scripts/laptop-queue/*` (not yours).
- Zero src/ diff. No new dependency.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
- `feature/visual-gate-vg5` @ 4a32654c (on a3362896: 351440dd gate.mjs + tests, bcf756a3 runner + harness, 4a32654c report). No `src/` diff, no new dependency. Full report: `docs/visual-gate/checks/vg5-build.md`.
- New `scripts/visual-gate/gate.mjs` (pure scoring, verdict, summary JSON, block, RunRecord) + `tests/visualGateGate.test.ts` 29/29. `e2e-visual.mjs` runs the gate by default, with `--rescore` and the new flags; `--time` unchanged. `harness.mjs` adds settle `flickering` / `alarm`, `thumb`, `cardSpot`, `card`; harness tests 22 (was 20). e2e-visual on the run-e2e GPU list (`--gpu --list` refused without E2E_GPU=1; with it, lists e2e-visual, starts no server); testing-tools.md entry.
- Tests: visualGateGate 29, visualGateHarness 22 (rerun by the builder session: 51/51), visualGateMetrics 38, visualGateStore 20; typecheck:fast 0; eslint clean; node --check on gate / harness / e2e-visual / run-e2e ok. `--rescore --rules-only` on runRecord fixtures: clean exits 0, flagged (so-door leak.mean 0.01) exits 1 with the flag row. `thumb` / `cardSpot` / `card` run only in a page: the laptop run is their first test.
- Deviation 1 (lead / VG8 call): the brief's `cardCheck(0.27, 0.12) -> miss` example contradicts its rule (a parityRange skip -> `edge`): VG1's `parityRange(0.27).skip` is true (within 0.03 of the 0.28 edge; still true after vg1p), so 0.27 is skipped and the row miss is tested at 0.12. A card at the bible's 0.27 target is never checked; if wrong, fix `parityRange` (VG1), not the gate.
- Other deviations: optional extra args / returns (`skippedRules` skips, `scoreShot` skips + `evaluated`, `knownLines` evaluated, `scoreRun` + errors / parity / notRun / shots / measured); "N flags" verdict counts flags + parity misses (JSON keeps them apart); one harness test for the settle fields; soft `git fetch origin master` (60 s cap) before the ancestor check; `WARN not recorded: <why>`; a crash in gate / rescore prints an error block and exits 3 (`--time` still 1); deadline-stopped shots on an `ERROR not run (N): ...` line; `testing-tools.md:63` GPU one-liner not updated (one entry allowed).
- Open: VG6 reads line 2 of the block only, the train step sets `VG_RECORD=1` and `VG_TRAIN=<n>`. VG7: `TOLERANCES` keyed by shot key, max(floor, override); the gate calls `recordRun` without `replace`, so a same-sha re-record only WARNs (use `recordRun(rec, thumbs, { replace: true })` from the scratch result.json, or add `--replace`). VG8: `--rescore <scratch>/<sha>/result.json`.
- Laptop request for the lead (built against origin/master 798fe53d): `node scripts/laptop-queue/request.mjs --sha <origin/master sha> --alone --set visual-vg5 --requester "Night Shift | Sector Ops Build" --note "visual-gate VG5 gate run" --step "git fetch -q origin feature/visual-gate-vg5 && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --rules-only --no-record --json C:/NightShift/scratch/visual-gate/vg5/vg5.json --png C:/NightShift/scratch/visual-gate/vg5/png"`. Pass: exit 0, or exit 1 with every parity / meter miss explained; wall <= 180 s, else rerun with `--cards 1` first.
