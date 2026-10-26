status: claimed Night Shift | Cloud Builder 3 2026-10-26T01:32Z
# J12 validator-port, slice I-C (chore, Sonnet/Haiku): close PR C - Marlow set in the manifest, counts rewritten, fragments folded

Lead: Night Shift | Marlow Build. PLAN: `docs/validator-port/PLAN.md` row I-C ("add the Marlow Yard set (S9's graph and
`run.txt`) to the manifest, rerun every set with `--write`, commit the pinned counts"), on the base.

- Base: `feature/validator-port-c2` @ b2d2a2554 (PR C so far: C + B2 + S9 + D-C + S10 + S11, all Opus PASS).
- New branch: `feature/validator-port-ic`. Commit and push every step (path-limited `git add`, never `-A`).
- Read first: `docs/systems/agent-preamble.md` (origin/master), then on the base: `scripts/validate-levels.mjs` (or the
  `validate:levels` npm script's target), `docs/level-validator/graph-sets.json`, `tests/levelGraphs.test.ts` in full,
  `changes/README.md`, and the S9 / S10 / S11 briefs on cloud-queue (`briefs/validator-port-s9.md`, `-s10.md`, `-s11.md`).

## Only these files
- `docs/level-validator/graph-sets.json`
- the saved run files the manifest names (`run` fields; the new Marlow set's run file is the one S9 committed)
- `tests/levelGraphs.test.ts`
- `changes/feature-validator-port-train.md`; delete `changes/feature-validator-port-s9.md`, `-s10.md`, `-s11.md`
- `docs/validator-port/BRIEF.md` (one new assumed decision, step 4)

## Steps
1. Manifest: add the Marlow Yard set after `campus`: the graph file(s) and `run` path S9 added (find them with
   `git show --stat` on S9's merge into the base, 21962e2c3's history), `flags` as S9's brief / run.txt header says.
2. `npm run validate:levels -- --write`: rewrites every set's pinned counts and saved run. Expected campus 139 errors /
   200 warnings (S10's re-measure; was 127 / 174); Marlow per S9's run (lead's last note: 34 / 83, 37 / 83 with
   `--require-measured`). Then `npm run validate:levels` must exit 0. Commit.
3. `tests/levelGraphs.test.ts:93` (test "exits 1 on a count that differs, and --write fixes the manifest and writes the
   run"): the expected run text lacks the example graph's 2 "pending V6" INFO lines. Make the expectation match the
   CLI's real output for that temp root (read it from a run, do not hand-type guesses). No other test edit. Commit.
4. Fold the S9, S10 and S11 fragments into `changes/feature-validator-port-train.md` the way it already folds the
   earlier slices (one bullet each, plain words), delete the three files. `docs/validator-port/BRIEF.md`: add
   **A28** after A27, copied in substance from the S11 brief's "A28" section (a split leg may start with a co-op link
   from the fork; Campaign's Tallow `tgc-leads` ruled yes; undo: drop the fork exception in the checkCoop split block).
   Commit.

## Checks (cloud: tsc + named vitest files only)
`npx tsc --noEmit -p tsconfig.json`; `npx vitest run tests/levelGraphs.test.ts tests/changesFragments.test.ts
tests/levelValidate.test.ts` - all green (the base's 2 known levelGraphs failures and S10's 2 count failures must all be
gone). `npm run validate:levels` exits 0 (a plain node script, no browser; if the cloud cannot run it, say so and mark
it pending PC run).

## Done
Manifest has example, campus, Marlow; counts pinned; levelGraphs green; fragments folded; A28 in BRIEF. Append a short
report below (commits, counts, test counts), set `status: done feature/validator-port-ic <sha>`.

## Report (append below)
