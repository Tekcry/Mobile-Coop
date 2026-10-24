# VG5 build - the gate runner (Opus 5.5, cloud builder, 2026-10-24)

Branch `feature/visual-gate-vg5` cut from `a3362896` (feature/visual-gate with VG1-VG4 and VG3 merged). Zero `src/` diff.
No new dependency. Unit tests only (cloud rules): no e2e, no GPU, no build, no browser run of the gate.

## Built
- `scripts/visual-gate/gate.mjs` (new, pure: imports only `./metrics.mjs` and `./storeLib.mjs`; the Contract block
  verbatim at the top). Constants `MIN_REGION_PX` 1500, `MIN_BLOTCH_PX` 400, `BLOTCH_ERODE` 24, `METER_TOL` 0.02,
  `CARD_PATCH` 10, `DEADLINE_S` 285, `EXIT` {clean 0, flagged 1, usage 2, error 3}. Functions as the brief names them:
  `planMasks`, `cardLuma`, `tolFor`, `stripThin`, `nextPatch`, `baselineCutoff`, `skippedRules`, `lintRules`,
  `scoreShot`, `cardCheck`, `meterCheck`, `knownLines`, `decide`, `topFlags`, `scoreRun`, `summarize`, `renderBlock`,
  `runRecord`, `shouldRecord`, `thumbsToPush`, `round5`, `roundMetrics`.
- `scripts/visual-gate/harness.mjs`: `settle` returns `flickering` (`reg.flickering?.length ?? 0` at the read) and `alarm`
  (`{ before, after, raised }` from `g.mode?.run?.alarm` / `g.mode?.reinforced`, null when the mode has neither); the
  `SettleResult` Contract line gains those two fields, nothing else in the Contract changed. New `thumb` (320 px webp in
  the page, null when the blob is not `image/webp`), `cardSpot` (e2e-darkness `findProbes` direction rule at one point,
  run after the pin; 8 horizontal fallbacks on a refused camera; null when none), `card` (probe, aim, converge, capture,
  `levelAt` after the pin, probe disposed in a `finally`).
- `scripts/e2e-visual.mjs`: the gate is the default mode; `--time` (M0) is unchanged (moved into `timeMain`). New flags
  `--extra`, `--record` / `--no-record`, `--rules-only`, `--cards n`, `--version x.y.z`, `--deadline s`, `--scratch d`,
  `--rescore <result.json>`; a bad `--cards` / `--deadline` / `--version` throws (exit 2). Gate run: Low and Epic in two
  browsers at once (`--serial` one after the other), maps in `MAP_ORDER`; per view `shoot` -> `lumaFromRgba` ->
  `planMasks` -> `measure` -> `thumb` -> ShotRecord + meter row; per rig on then off, leak from the on shot's `leak`
  mask (the on luma kept until the off shot is done; every other capture's RGBA dropped once measured); at Epic the cards
  (per view a fresh `settle(view.feet)` + `pin`, then per point `cardSpot` -> `card` -> `cardLuma` -> `cardCheck`);
  `closeBoot` in a `finally`; a thrown shot / card is recorded with its error and the run goes on. Then renderers
  (normalised), picks (`fetchStore`, `readRecords`, `pickBaseline` with `isAncestorFn`; skipped under `--rules-only`),
  tolerances (`tolerances.mjs` by dynamic import when the file exists, else FLOORS), `scoreRun`, sha / version / train /
  branch, scratch thumbs + `result.json`, `--json` copy, record, the block, the 60-day prune, `exit EXIT[verdict]`.
- `scripts/run-e2e.mjs` :36-37: `e2e-visual` joins `GPU`, the comment names it.
- `docs/systems/testing-tools.md`: one `e2e-visual` entry after `e2e-darkness`.

## Verdict rules as implemented (`decide`, first match)
1. error `renderer mismatch: a | b` (normalised renderers differ);
2. error `<first error> (+N more)`: a boot failed (`boot <map>@<preset>: ...`), a shot or rig state threw
   (`<key>: ...`), a card threw or its view's settle / pin threw (`<card id>: ...`), the baseline read threw
   (`baseline: ...`);
3. error `over budget: N shots not run` (the deadline, `--deadline` > `VG_DEADLINE_S` > 285 s, checked before every boot,
   shot, rig state and card in both browsers; the keys are listed on an `ERROR not run (N): ...` line);
4. error `no baseline for renderer <r>` (no pick at all; never under `--rules-only`);
5. flagged `N flags, M parity misses` (any non-known flag or parity row with ok false);
6. clean. Error keeps every flag listed in the block and the record.
Warnings (never the verdict): lint (F1 / F8 veil alone), unsteady converge, scene not ready, alarm raised in a settle,
meter miss with flickering lights, card without a camera spot, thumb encoder missing, record failed / not recorded,
a tolerances.mjs load failure. SKIPPED lines (calibrated rules not evaluated) count as warnings in the summary.

## Deviations (and why)
1. **cardCheck(0.27, 0.12)**: the brief's example says "miss (row 0-0.11)", but its own rule says `parityRange` skip ->
   `skip: 'edge'`, and VG1's merged `parityRange(0.27).skip` is true (0.27 is 0.01 from the 0.28 band edge; asserted in
   tests/visualGateMetrics.test.ts:287). I followed the rule: 0.27 -> `edge`; the row miss is tested on row 0.12 (0-0.06).
   Consequence for VG8 / the lead: a card at the bible's 0.27 target is never checked. If that is not intended, the fix is
   in `parityRange` (VG1: a row match in the level's own band wins over the edge skip), not in the gate.
2. Additive signatures: `skippedRules(..., skips = [])` (the why needs the shot's region skips); `scoreShot` takes
   optional `skips` and also returns `evaluated` (calibrated rules that had a value); `knownLines(items, flags,
   evaluated?)` (KNOWN PASSES needs to know a rule ran; without it any calibrated rule counts); `scoreRun` also returns
   `errors`, `parity`, `notRun`, `shots`, `measured`; `raw.warnings` is optional and appended. `items` may be an array
   or a record.
3. The verdict line's `N flags` counts non-known flags plus parity misses (so a parity-only flag never reads "0 flags");
   the summary JSON keeps them apart (`flags`, `parity`).
4. Harness test: besides the parseArgs describe, one new describe tests the settle's `flickering` / `alarm` over the
   existing fake page (the brief allowed only parseArgs + new pure helpers; the new settle fields had no other test).
   `thumb` / `cardSpot` / `card` are page-only (no pure part to unit test); they are exercised by the laptop run.
5. The gate soft-fetches `origin master` (60 s cap) before `isAncestorFn` (VG4 open item: the ancestor test needs a fresh
   `refs/remotes/origin/master`); a failed fetch is ignored.
6. Record asked but refused (e.g. `VG_RECORD=1` with `--only`) adds `WARN not recorded: <why>`.
7. A crash in gate / rescore mode prints an error block (`crash: ...`) and exits 3 (VG2 exited 1); `--time` keeps exit 1.
8. `result.json` = the RunRecord fields + `summary`, `warnings`, `runErrors` (boot / baseline errors only), `notRun`,
   `renderers`, `browsers`, `consoleErrors`. `--rescore` reads that shape (and a bare RunRecord); its cutoff uses the saved
   run's version and train (`--version` overrides).
9. Meter rows only for measured views (a thrown shot is already an error). A card's unsteady converge / unready scene go
   into its row `note`, not a WARN.
10. `docs/systems/testing-tools.md:63` (the one-line GPU list) still names three suites: the brief allowed one entry only.

## Tests and acceptance
- `npx vitest run tests/visualGateGate.test.ts --maxWorkers=2`: 1 file, 29 passed.
- `npx vitest run tests/visualGateHarness.test.ts --maxWorkers=2`: 1 file, 22 passed (was 20: +1 settle additions,
  +1 gate flags; the two `toEqual` asserts updated).
- `tests/visualGateMetrics.test.ts`: 38 passed; `tests/visualGateStore.test.ts`: 20 passed (both unchanged).
- `npm run typecheck:fast`: exit 0. `npx eslint tests/visualGateGate.test.ts tests/visualGateHarness.test.ts`: exit 0.
- `node --check` gate.mjs, harness.mjs, e2e-visual.mjs, run-e2e.mjs: ok.
- `node scripts/run-e2e.mjs --gpu --list`: refused (exit 1, "--gpu reads final pixels"); with `E2E_GPU=1`: lists
  e2e-darkness, e2e-desktop:3, e2e-coop-gpu, e2e-visual (exit 0, no server).
- `--rescore` on fixtures written with `runRecord` (a so-door-on@low rig shot, `--rules-only`): leak.mean 0.001 ->
  `### visual-gate: clean on cccccccc (4.97.1)`, exit 0; leak.mean 0.01 -> `### visual-gate: 1 flag on cccccccc
  (4.97.1)` with the row `| so-door-on@low | leak | mean | - | 0.0100 | 0.0040 | rule |`, exit 1.
- Usage: `--cards x` and a missing `--rescore` file exit 2.
- `git diff --stat a3362896 -- src`: empty.

## Laptop request (the lead sends it; rules-only on master, framing PNGs)
`node scripts/laptop-queue/request.mjs --sha <origin/master sha> --alone --set visual-vg5 --requester "Night Shift | Sector Ops Build" --note "visual-gate VG5 gate run" --step "git fetch -q origin feature/visual-gate-vg5 && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --rules-only --no-record --json C:/NightShift/scratch/visual-gate/vg5/vg5.json --png C:/NightShift/scratch/visual-gate/vg5/png"`
(origin/master was 798fe53db35cd7992c8d20cab3523067a55b158d at this build; after the merge into feature/visual-gate,
fetch `feature/visual-gate` instead). Pass: exit 0, or exit 1 with every parity / meter miss explained here by the lead;
wall <= 180 s, else `--cards 1` first (PLAN 7 ladder).

## Files touched
`scripts/visual-gate/gate.mjs` (new), `tests/visualGateGate.test.ts` (new), `scripts/e2e-visual.mjs`,
`scripts/visual-gate/harness.mjs`, `tests/visualGateHarness.test.ts`, `scripts/run-e2e.mjs` (:36-37),
`docs/systems/testing-tools.md` (one entry), this report.

## Open items
- **VG6**: read only line 2 of the block, `<!-- visual-gate-summary {json} -->` (VisualSummary, `v: 1`); the block is
  `VISUAL-GATE BEGIN` ... `VISUAL-GATE END` with nothing else of the gate's between (progress lines come before BEGIN).
  Status from `summary.verdict` / `reason` / `top` / `wallS` / `base`; exit 0 / 1 / 3 (2 = usage). The train step sets
  `VG_RECORD=1` and `VG_TRAIN=<n>` (`VG_BRANCH` optional, default `train/<n>`; `VG_SHA` optional, default git HEAD).
  Thumbs landed on the data branch are `summary.thumbs` (raw keys, `<key>.base` for baseline thumbs).
- **VG7**: `scripts/visual-gate/tolerances.mjs` exports `TOLERANCES: Record<string, Partial<Tolerances>>` keyed by shot
  key (`<id>@<preset>`, rigs `<id>-on@<preset>` / `<id>-off@<preset>`); each field is max(FLOORS, override). The gate
  calls `recordRun(rec, thumbs)` without `replace`, so a rerun on an already recorded sha WARNs `record failed: run <sha8>
  is already recorded...`; a deliberate re-record needs `recordRun(rec, thumbs, { replace: true })` from the scratch
  `result.json` (the RunRecord fields are at its top level) or a `--replace` flag added to the gate.
- **VG8**: `node scripts/e2e-visual.mjs --rescore <scratch>/<sha>/result.json [--rules-only] [--version x.y.z]` scores a
  saved run against the current viewpoints rules (no browser, no record) and exits by verdict. Deviation 1 above (the
  0.27 card skip) is VG8's or the lead's call.
- Polish (not done): testing-tools.md:63 GPU list line; `thumb` decodes the PNG a second time in the page (one decode per
  shot could serve capture and thumb if the runtime matters).
