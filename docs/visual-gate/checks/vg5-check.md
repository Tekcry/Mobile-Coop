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

## Laptop run (VG5, 46a7cf85)
`alone-visual-vg5` on master 46a7cf85 (run 20261024T182523), the gate from feature/visual-gate, `--rules-only
--no-record`: exit 1 flagged, 64 shots, 0 errors, wall 176.6 s (Low 107.2 s, Epic 176.6 s; budget 180). Triage and fixes
by vg5t (Opus, `checks/vg5t-build.md`, branch `feature/visual-gate-vg5t`). Verdict per line of the block:

| Line | Verdict | Action |
| --- | --- | --- |
| PARITY card-so-s2-aisle-1 level 0.4659 luma 0.4167 range 0.10-0.37 | Parity range problem, not a look issue: A15 stretched the bible's one mid row (0.40: 12-35%) over the whole mid band; the curve renders 0.466 at 0.42 on its way to 45% at 0.70, in step with every other card. Card spot right (between pools). | A32 (vg5t): ranges linear between rows -> 0.17-0.51, passes |
| PARITY card-m-a5-kiosk-2 level 0.4840 luma 0.4118 range 0.10-0.37 | Same (Epic haze in m-a5-kiosk lifts it a little too) | A32 -> 0.19-0.55, passes |
| PARITY card-cp-s1-f-1 level 0.3244 luma 0.0850 range 0.10-0.37 | Same at the bottom of the mid band (moon card; the curve is steep from 0.27 to 0.40) | A32 -> 0.03-0.22, passes |
| KNOWN PASSES so-corner (F5b) | Not fixed on master (no `hazeReach` / `beamReachMin`; `volLights.ts` still marches `l.reach`): the rig does not reproduce F5b. The guard faces straight down the side aisle (yaw pi, cone half-angle 0.34 rad), so the cone passes ~1.65 m from its axis at the junction and never crosses R3N; on - off at Epic is 0 on R3N's face (leak.mean 0.00012) | Keep `known`; turn the rig guard to aim at the corner (viewpoints.mjs, after vg3p: `checks/vg5t-build.md`); P7 must read red at Epic |
| WARN unsteady m-a8-vestibule / m-f-gallery / cp-s1-b @epic | Harness: not a short budget. The worst cell moves 0.008-0.017 for 35-63 reads (a shimmer, it never falls): TAAU jitter flips sub-pixel bright edges at Epic native resolution (railing, desk edges). Each cost the 8 s cap | vg5t: noisy-steady converge exit (0.9 quantile under 0.004, worst cell under 0.03) |
| WARN meter-cp-s3-c @low / @epic meter 0.415 vs field 0.352 | Gate bug hid it: every map has one flickering light somewhere, so the flicker skip covered every meter row. The miss is the same in 4 runs (M0 + VG5, both presets) and the meter has no easing, so it is not flicker timing; meter > field means the meter sampled a brighter spot: most likely the player was pushed off the view's feet (lockers) | vg5t: field read where the player stands, `drift` recorded (WARN over 0.3 m), the skip only for a flickering light reaching the body. The vg5b rerun says which: drift -> move cp-s3-c's feet; no drift -> a real meter / field mismatch for the lighting owner |

Also found and fixed (not in the block): the cinematic letterbox (sector / clear modes, 2.8 s at boot) was in every
Warehouse, Sector Ops and campus shot of a boot's first ~3 s of settles, its height set by the view order (`M0.md`).
Polish 2-4 done in vg5t (region-skip WARN line + `regionSkips` count, non-finite meter / field / card = `skip: 'error'`,
`process.exitCode` with an unref'd backstop exit).
