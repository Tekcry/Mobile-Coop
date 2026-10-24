# VG5 check - the gate runner (fresh Opus checker, 2026-10-25)

Verdict: PASS

Checked `feature/visual-gate-vg5` @ 4a32654c (cloud build on a3362896) against `briefs/VG5.md`, BRIEF A1-A23,
PLAN :60-176, the polish VG5 owns (vg1-check polish 2-4, vg2-check polish 2-4 + vg2-build "Fix round", vg4-build open
items) and the build report `checks/vg5-build.md`. No must-fix items.

## Scope
- `git diff a3362896 HEAD --stat`: only the brief's 8 files (gate.mjs, visualGateGate.test.ts, e2e-visual.mjs,
  harness.mjs, visualGateHarness.test.ts, run-e2e.mjs, testing-tools.md, vg5-build.md). Zero `src/` diff. viewpoints,
  metrics, storeLib, store, baseline, package.json untouched.
- run-e2e.mjs: one hunk `@@ -36,2 +36,2 @@` (GPU list + comment). testing-tools.md: one entry right after e2e-darkness.
- Contract block: byte-identical to the brief (diffed). harness.mjs Contract: only the `SettleResult` line changed
  (adds `flickering`, `alarm`), exactly as specified.
- gate.mjs is pure: imports only `./metrics.mjs` and `./storeLib.mjs`; no `node:`, fs, git, page.

## Rules verified (code read + tests)
- Exit codes `EXIT` 0 / 1 / 2 / 3. `decide`: renderer mismatch, thrown shot / card / boot / baseline read, over budget,
  then `no baseline for renderer <r>` (not under `--rules-only`), then flagged, then clean. Error keeps flags. A run
  whose renderer string is empty or whose picks are `{}` is error, never green (C0 P10).
- Tolerances: `tolerances.mjs` loaded by dynamic import only when the file exists (try / catch, WARN on failure);
  absent -> `{}` -> `tolFor` = FLOORS; each field max(floor, override) (A13).
- `planMasks`: behind / < 1500 px small / blotch dropped when erode(24) keeps < 400 px (`blotch-small`), blotch never
  computed and trusted as 0 (VG1 polish 3). `stripThin` before `compare` on both sides (no hist emd on n 0, polish 4).
- `lintRules`: F1 / F8 with a `upper.veil` bound and no `upper.contrast` bound -> the WARN (VG1 polish 2).
- Rules never on a rig `off` shot; rig `on` leak from the on shot's `leak` mask, on luma kept until off is done.
- Parity: `meter-<id>@<preset>` miss when |meter - field| > 0.02 (A15 / A22), flicker -> `skip: 'flicker'` + WARN;
  cards Epic only, per view a fresh `settle(view.feet)` + `pin` (VG2 polish 4), `cardSpot` -> `card` (level read after
  the pin, probe disposed in `finally`) -> `cardLuma` centre 10 x 10 -> `cardCheck`; `--cards n` = first n per map.
- Alarm before / after in the settle, `raised` -> WARN (VG2 polish 2; stage and reinforced are numbers in src, so the
  String compare is sound). Unsteady / scene not ready -> WARN.
- Baseline cutoff (A18): `--version` > package.json on a train > next patch. Picks skipped under `--rules-only`.
- Record (A23): `--record` or `VG_RECORD=1`, not `--no-record`, no `--only` / `--maps` / `--extra`, 40-hex sha, >= 1
  measured; failure is a WARN. Thumbs: non-known flagged keys + `<key>.base` from the base run's scratch thumb.
- `--time` mode: `runMap` / `runPreset` / `timingTable` byte-identical to a3362896; `main`'s old body moved into
  `timeMain` unchanged (exit 0 / 1 as before). `--url` is the positional (default `http://localhost:4173/`); run-e2e
  passes it.

## Runs (desktop CPU waited down from 91-97% to 81% first)
- `npx vitest run tests/visualGateGate.test.ts --maxWorkers=2`: 29 passed.
- `npx vitest run tests/visualGateHarness.test.ts --maxWorkers=2`: 22 passed.
- `npx tsc --noEmit -p .`: exit 0. `npx eslint` on both test files: exit 0. `node --check` gate / harness / e2e-visual /
  run-e2e: ok.
- `node scripts/run-e2e.mjs --gpu --list`: refused without E2E_GPU=1; with it lists `e2e-visual`.
- `--rescore --rules-only` on fixtures built with `runRecord` (scratchpad, no browser): clean -> block, exit 0; a
  meter miss -> `1 flag` + `PARITY meter-x@low meter 0.3300 field 0.3000`, exit 1. `--cards x` -> exit 2.

## Mutations (each restored with `git checkout -- scripts/visual-gate/gate.mjs`; tree clean after)
| # | Mutation | Caught by |
| --- | --- | --- |
| 1 | `decide`: drop the no-baseline error (`if (false && np === 0)`) | decide "errors, renderer mismatch, no baseline..." |
| 2 | `planMasks`: blotch never dropped (`< 0`) | planMasks "skips a behind quad..." |
| 3 | `meterCheck`: tolerance 0.05 instead of 0.02 | parity "meterCheck: d 0.03 misses..." |
| 4 | `meterCheck`: flicker skip removed | parity "meterCheck..." |
| 5 | `stripThin`: keep n 0 regions | stripThin tests (2 fail) |

## Laptop request line (correct for `scripts/laptop-queue/request.mjs` on origin/master 46a7cf85: `--sha`, `--alone`,
`--set`, `--requester`, `--note`, `--step` all parsed; the service sets E2E_GPU=1; master's e2e-lib exports `launch` /
`frames` the harness needs)
`node scripts/laptop-queue/request.mjs --sha <origin/master sha> --alone --set visual-vg5 --requester "Night Shift | Sector Ops Build" --note "visual-gate VG5 gate run" --step "git fetch -q origin feature/visual-gate-vg5 && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --rules-only --no-record --json C:/NightShift/scratch/visual-gate/vg5/vg5.json --png C:/NightShift/scratch/visual-gate/vg5/png"`
(after the merge into feature/visual-gate, fetch `feature/visual-gate` instead.)

## Builder deviations
All 10 accepted. Deviation 1 needs a lead call outside VG5: the bible's 0.27 DARK row sits 0.01 from the 0.28 band
edge, so A15 / VG1 `parityRange` always skips a card there (`edge`); the gate follows the merged rule correctly. If
0.27 cards must be checked, change `parityRange` (VG1: a row match wins over the edge skip) or A15, not the gate.

## Polish (none blocks)
1. Laptop run expectation: the brief says only parity and meter = field can flag in rules-only, but `so-door` and
   `cp-door` (F5, `known: null`) carry calibrated `leak.mean <= 0.004` / `leak.p95 <= 0.02` rules
   (viewpoints.mjs RIGS), so rig leak flags may also appear; the lead explains those too.
2. Region skips (`behind` / `small` / `blotch-small`) print nothing in the block unless a calibrated rule depends on
   them (A21 lists them as WARN / SKIPPED lines). They are in result.json `skips`. With every view rule still null,
   VG8 would benefit from one `WARN <key>: regions skipped a (small), b (behind)` line per shot, or a count in the
   summary (gate.mjs `scoreRun` :451-470).
3. `meterCheck` (gate.mjs:327): a NaN meter or field reads ok (`!(NaN > tol)`). Treat a non-finite pair as a miss or
   `skip: 'error'`.
4. `gateMain` / `rescoreMain` call `process.exit` right after `console.log` of the block (e2e-visual.mjs:561-563,
   :597-598). Fine on the Windows laptop (pipes are written synchronously, and the smoke test piped the whole block),
   but `process.exitCode = ...; return` is the safer pattern if the gate ever runs on POSIX.
5. Builder's own: testing-tools.md:63 GPU one-liner still lists three suites; `thumb` decodes the PNG a second time.
