# VG7 phase 1 check (Opus)

Checked `feature/visual-gate-vg7` @ 05e95921 (tools 4bafe5da + report). The four phase 1 files on
`origin/feature/visual-gate` are byte-identical to this head (`git diff origin/feature/visual-gate` on them: empty), so
the merged copy the laptop steps archive is what was checked. Inputs read: `briefs/VG7.md` (phase 1),
`cloud-queue:briefs/visual-gate-vg7-p1.md`, `checks/vg7-build.md`, BRIEF A24-A30, `briefs/P1-P7.md` (request and
proof usage), `scripts/laptop-queue/service.mjs` (how alone steps run).

## Verdict: PASS

No must-fix. Polish held below.

## push-results.mjs on the laptop: works

How steps run: `service.mjs:770` runs each step with `spawn(line, { shell: true, cwd: <slot dir>, stdin ignore })`
(cmd.exe), and keeps going after a failed step, so step 4 (push) runs even when a gate step exits 1. Checked:
- Windows paths with forward slashes: ran the CLI under `cmd.exe /c` with `--dir C:/Users/.../data` (and the proofs
  arg order `--branch ... --dir ... --prefix v4.60.1`): pushed, tree paths `abcd1234/run1/result.json`,
  `abcd1234/run1/png/x.png` (`/` separators), binary blob equal to the source (`cmp`).
- Orphan on first push: the commit has no parent when the branch is absent (soft fetch fails, `read-tree --empty`).
  A second push with another prefix makes a child holding both (unit test).
- Rejected push: a pre-receive hook rejecting try 1 -> pushed on try 2 (refetch + rebuild). All 5 rejected -> exit 1,
  `push failed after 5 tries`. Missing dir -> exit 1; missing `--prefix` -> exit 2.
- Working tree / HEAD / index: temp index in `os.tmpdir()` via `GIT_INDEX_FILE`, removed in `finally`; after all runs
  the work repo HEAD, `git status --porcelain` and `.git/index` were unchanged.
- Author env: with no git identity (`GIT_CONFIG_GLOBAL=NUL`) the commit is `visual-gate (laptop)
  <visual-gate@localhost>` as author and committer (brief). It also falls back when only user.email is empty (stricter
  than the brief, harmless).
- Exit codes: `main` returns 0 / 1 / 2 into `process.exitCode`; the direct-run guard is the same as `baseline.mjs`
  and worked when started by relative path under cmd.exe.
- Push credentials: the slot runs as the same service user that already pushes `laptop-queue` by the same plumbing
  (`service.mjs:238`), so no new auth path.
- Scratch overlap: the gate's own scratch is `C:/NightShift/scratch/visual-gate/<sha40>`; `vg7/` and `proofs/<tag>/`
  are siblings, so `--dir` never sweeps thumbs in.

## Noise math (A13, A24, A30): matches the brief

- `sd` sample (n - 1), shifted by x0 (equal values exactly 0). `spreadOf`: key only when metrics in every run, regions
  only when n >= 1500 in every run, leak on rig keys, parity card luma / meter - field, skipped rows to `missing`;
  emd = RMS pairwise / sqrt 2.
- `tolerancesFrom`: 4 x max sd over regions per field, ratio fields from sd / run mean with the guards (0.05 / 0.05 /
  0.01 / 0.002), contrastDrop capped 0.9, ceil to 4 decimals, written only strictly above the floor, leak never.
  For n = 3 the range is <= 2 sd, and the emd tolerance is >= 1.63 x the largest pair emd, so the same-build
  self-compare is 0 for abs fields by construction (test asserts `sc.tol` empty).
- Proof rows (A30): `sep = |delta| / max(sd, 1e-4)`, `dirOk` by side, `separates = dirOk && sep >= 4`,
  `mid` = geometric mean when both > 0.001 else arithmetic, `drift` = `compare(fixed -> bad)` with VG7 tolerances
  flags that region and metric (flag metric names match the target metrics), rule colours from the item's rule for
  the preset. Targets equal PLAN section 2 / the brief; F6 expands `m-*` from `viewpoints.mjs` at call time.
- CLI: `spread` refuses < 2 runs and mixed sha / renderer (exit 1); `proof` exit 0, usage exit 2
  (`--fn F9` -> 2), WARN and sd null without `tolerances.mjs`.

## Tests

Meaningful: hand-set fixtures check each formula value (sd 0.02 -> meanAbs 0.08, meanRel guard, cap, ceil 0.0801,
emd 1/31), the self-compare guarantee, noisy lines, the rendered module re-imported equal to its inputs, every target
key / region real in `viewpoints.mjs`, proof separation / direction / sd floor / drift / rules / skips, and pushFolder
on temp bare repos (orphan, child, replace, refusals, work repo untouched).

## Runs (this check)

- `npx vitest run tests/visualGateNoise.test.ts --maxWorkers=2`: 12/12 passed (12.3 s).
- `node --check` noiseLib.mjs, noise.mjs, push-results.mjs: ok.
- `node scripts/visual-gate/noise.mjs proof --fn F9 --bad x`: exit 2. `spread a.json`: exit 1.
- push-results under cmd.exe on temp repos: as listed above. `git ls-remote origin 'refs/heads/shots/*'`: no
  `shots/visual-gate-*` other than the existing `-m0` (nothing left by the build's dry run).
- `git diff --stat origin/feature/visual-gate -- src`: empty. No e2e, no GPU.

## Held polish (not blocking)

1. `push-results.mjs:115` (and `store.mjs:117`, same code): the failure text is the first stderr line, which on a
   rejected push is `To <url>`, not the reason. Done looks like: report the `!` line or the last non-empty stderr line.
2. `push-results.mjs:27`: every git call has the 120 s timeout, push included. A proofs folder with PNGs (v4.82.0: two
   Marlow runs + rigs, maybe 50-80 MB) on a slow uplink could time out and re-upload up to 5 times, then fail. The
   brief fixes 120 s, so held; done looks like: push gets 600 s, the rest keep 120 s. Only the proof requests carry
   PNGs; VG7's push is three result.json files.
3. `noiseLib.mjs` contrastDrop: the compare is relative to the base run's contrast, the tolerance to the run mean. With
   sd / mean over ~0.35 a low base could still flag a same-build pair. Phase 2 lists any such flag already (brief step
   3); no change needed unless one shows up.
