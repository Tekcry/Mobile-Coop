# VG8 - calibrate the view rules from the proofs, prove them on a rerun of every pair (Opus builder)

Job visual-gate, group D (after group C: VG7 and P1-P7). Lead: Night Shift | Sector Ops Build. PLAN.md section 2
(:60-74, the targets and ":71" threshold rule), section 4 (:116-132, metrics and floors), slice table row VG8 (:215),
parallel safety (:219-221: VG8 is the only later writer of `viewpoints.mjs`), held polish (:234-238); BRIEF A10, A13,
A15, A21, A23, A24-A30; `checks/vg1-check.md` polish 1-3 and `checks/vg5-check.md` polish 1-2 (below, "Held polish").
Two phases with one laptop batch between them, as VG7:
- **Phase 1 (desk)**: thresholds from the P1-P7 numbers and VG7's noise, written into `viewpoints.mjs` `rules`; offline
  proof with `--rescore` on the pushed JSONs; `docs/visual-gate/RULES.md`; the viewpoints test updated.
- **Laptop** (the LEAD sends it): the 8 proof builds rerun with the new rules, plus one full run on the master head.
- **Phase 2 (desk)**: rescore the rerun JSONs; every Fn red on its bad build, green on its fixed build and on master;
  RULES.md gets the rerun columns. A rule that fails the rerun goes back to null (no retune).
Zero src diff. No new dependency. No edit to any measuring code.

## Preconditions (the lead checks before phase 1 / before sending the batch)
- Phase 1: VG7 phase 2 committed (`scripts/visual-gate/tolerances.mjs` with `SPREAD`, `docs/visual-gate/VG7.md`), the
  orchestrator's "initial" accept done, all seven `docs/visual-gate/proofs/P1.md`..`P7.md` committed, and the proof
  JSONs on `shots/visual-gate-proofs` (8 tag folders) and VG7's on `shots/visual-gate-vg7/<M8>/run1..3`.
- The batch: phase 1 committed and pushed on `feature/visual-gate` (each step fetches the gate, rules included, from it).

## Where
- The job worktree `C:/NightShift/Mobile-Coop-visual-gate`, branch `feature/visual-gate` (no other writer during group
  D; desktop C: is short, so no new worktree), or a cloud builder on `feature/visual-gate-vg8` cut from the pushed head
  (the lead picks). Guard before every write:
  `cd /c/NightShift/Mobile-Coop-visual-gate && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate"`
- Worktree mode: never commit, push, stash, reset or checkout (the lead commits after each phase). Cloud mode: commit
  and push `feature/visual-gate-vg8` only. Never push to `visual-baselines` or `shots/*` (only the laptop steps do).
- Read first: `docs/systems/agent-preamble.md`; CLAUDE.md "Hard rules"; BRIEF.md (targets table :28-39, A10, A13, A15,
  A21, A23-A30); PLAN.md :60-74, :116-132, :198-238; `briefs/P1-P7.md` (the 8-build table, "What red on bad, green on
  fixed means"); every `proofs/P<n>.md` (verdicts, SEPARATES rows, NOT MEASURED reasons, the coordinate checks);
  `VG7.md` (noise, `noisy` lines, runtime, P7 inputs); `checks/vg1-check.md` polish 1-3; `checks/vg5-check.md` polish
  1-2; the code you read but never edit: `metrics.mjs` (`FLOORS`, `checkRules`), `gate.mjs` (`lintRules`,
  `skippedRules`, `scoreShot`, `decide`), `noiseLib.mjs` (`PROOF_TARGETS`, `proofRows`), `e2e-visual.mjs` (`--rescore`).

## Files (only these)
- edit `scripts/visual-gate/viewpoints.mjs`: the `rules` bounds (and `presets` only under "One bound per key" below)
  of view items, the header comment lines that say bounds are null (:6, :59-61), and nothing else. `known` stays as it
  is: so-corner keeps `'F5b lr16-8-triage.md:65-87'` (A10); no other item gets `known` (a proposal goes in the report).
  Rig `rules` stay `{ 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 } }` unless "Rig rules" below says otherwise.
- edit `tests/visualGateViewpoints.test.ts`: only the two rule tests ("all bounds unset" :135-149 and the presets
  equality in :159-166; the rig literal :168-173 only if a rig rule changed).
- create `docs/visual-gate/RULES.md` (the calibration record) and `docs/visual-gate/checks/vg8-build.md` (your report).
These two extra files beyond PLAN :215 (the test, the report) follow VG7's A26 note; the lead logs them with A31.
Do NOT touch: anything under `src/`; regions, coords, `metrics` lists, `parity`, `targets`, MAPS, PRESETS in
viewpoints.mjs; `metrics.mjs`, `gate.mjs`, `harness.mjs`, `e2e-visual.mjs`, `noiseLib.mjs`, `noise.mjs`,
`tolerances.mjs` (generated), `store*.mjs`, `baseline.mjs`, `scripts/laptop-queue/*`, `package.json`, the proof docs,
VG7.md, BRIEF / PLAN / STATE (the lead's). P6's note "VG8 widens the quad" is superseded: a region change is a lead
decision with its own proof rerun, never part of this slice.

## Inputs (every number comes from a pushed JSON through the tools; never typed from a doc, never another build)
- Bad / fixed values per row: `noise.mjs proof` on the pairs the P-docs used (same commands as `briefs/P1-P7.md`), from
  `shots/visual-gate-proofs` fetched into a temp dir outside the repo. F6 bad = the look P3 names as "reads dark" (both
  looks named: use per row the look whose value is nearer the green side G, and note the other); F7 bad =
  `v4.82.0/marlow-photo`; F5 bad = `v4.82.0/rigs`.
- Master value M per row: the mean of the 3 VG7 runs (`noise.mjs proof --fn <Fn> --bad <M8>/run<k>/result.json` for
  k = 1..3, the bad column).
- sd per row: `SPREAD.keys[key]['<region>.<metric>']` from `tolerances.mjs` (VG7, master, n = 3). sd absent (key or
  region thin / missing in VG7) -> the row is NO RULE ("no noise estimate").
- sigma per row (A31 below): `sigma = max(sd, floorSigma)`, with floorSigma = the A13 floor / 4, so 4 sigma is never under
  the drift floor (3 runs of one build understate run-to-run noise):
  | metric | floorSigma |
  | --- | --- |
  | `mean` | 0.03 / 4 = 0.0075 (FLOORS.meanAbs) |
  | `nearBlack` | 0.08 / 4 = 0.02 |
  | `veil` | 0.02 / 4 = 0.005 |
  | `contrast` | 0.25 x G / 4 (FLOORS.contrastDrop, relative to the green value G) |
  | `blotch` | max(0.4 x G, 0.02) / 4 (FLOORS.blotchRatio 1.4, blotchAbs) |
  | `arc` | max(0.5 x G, 0.01) / 4 (FLOORS.arcRatio 1.5, arcAbs) |
  | `leak.*` | none: sigma = max(sd, 1e-4) |

## Threshold placement (A31: PLAN :71 made exact; the lead copies this into BRIEF.md as A31 when committing phase 1)
Per row (one view x region.metric x preset), rule side from `PROOF_TARGETS` (`bad: 'high'` -> `max`, `'low'` -> `min`):
1. Green value G = the worse of fixed and master for this rule (for `max`: max(F, M); for `min`: min(F, M)). A target
   whose fixed build is NOT MEASURED uses M alone and says so.
2. Direction: B must sit on the bad side of G, else WRONG WAY -> NO RULE.
3. `sep = |B - G| / sigma`. Candidate T0 = geometric midpoint sqrt(B x G) (arithmetic (B + G) / 2 when B or G <= 0.001).
   Margins in sigma: `mG = |T - G| / sigma`, `mB = |B - T| / sigma`.
4. Tiers, first match:
   - **SET**: T0 with mG >= 4 and mB >= 2 -> T = T0.
   - **SET (shifted)**: sep >= 6 -> T = G + 4 sigma toward B (mG = 4, mB = sep - 4 >= 2).
   - **THIN**: 4 <= sep < 6 -> T = (B + G) / 2 (both margins sep / 2, between 2 and 3). Set, and listed THIN: under
     PLAN :71's 4 sigma from the green side; C1 and the lead decide keep or drop.
   - **NO RULE** (cannot separate: no T leaves 2 sigma on both sides, i.e. sep < 4): the bound stays null.
5. Round T to 4 decimals away from G (`max`: ceil, `min`: floor), recompute mG / mB with the rounded T; the rounded
   margins are the ones written. A rounding that drops a margin under its tier floor demotes the row one tier.

### When a target cannot separate (margin < 2 sigma): report, do not fudge
Write the row as NO RULE in RULES.md with B, F, M, sd, sigma, sep and the reason (WRONG WAY, sep < 4, NOT MEASURED, no
noise estimate, skipped region, master on the bad side), leave the bound null, and list it under "Not caught" in the
report and the final message with what would fix it (a region, a metric, a view; as a proposal with its numbers).
Never, to make a row pass: move T inside 2 sigma of either side; use a sigma other than the one above (no dropping a
run, no "sd looks too big", no pooling with the rerun); pick another build pair, look, view, preset or region than the
P-doc measured; add a rule key the target does not list (`TARGET_RULES` in the test, e.g. no `whole.mean` for F1 / F8);
edit regions, coords, metrics or tolerances; add `known`; hand-edit a number. A master value on the bad side of T is a
finding (a possible regression on master or a look change since the fix): NO RULE, and the report names the views and
the numbers for the lead to send to the job that owns the look.

### One bound per key (the Rule shape has one min / max per `<region>.<metric>` for all its presets)
F2 `floor.nearBlack` and F6 `whole.mean` / `whole.nearBlack` cover both presets. Compute each preset's row; when both
are SET / THIN and one T satisfies both presets' tier floors (mG >= 2 and mB >= 2 for each), use the T of the preset
with the smaller sep, clamped into the shared interval; else narrow `presets` to the preset with the larger sep and
write the other preset's row NO RULE ("one bound per key"). Never widen `presets` past the target's list (F1 / F8 /
F4 Epic, F7 Low).

### Per target (rows and extra conditions; P-doc names the data)
- F1 (P6), F8 (P1): `upper.contrast` (min) per view; `upper.veil` (max) only on a view whose contrast row is SET or THIN
  (VG1 polish 2: veil is p5, blind to partial beams; `lintRules` warns otherwise, and the rescore block must show no such
  WARN). F8 `cp-s2-d`: rows NOT MEASURED when P1 says its upper region is off the beam (O1).
- F2 (P6): `floor.nearBlack` (max) on so-s1-goods-in; a `small`-skipped floor (236 x 44 px) is NOT MEASURED.
- F4 (P5): `so-s1-workshop wall.arc` (max), Epic. P5 must say the request ran with the exact-tangent arc (VG1 polish
  1, merged in feature/visual-gate before the proofs); if it did not, F4 is NO RULE ("arc not polished at measure").
- F6 (P3): per `m-*` view, `whole.mean` (min) and `whole.nearBlack` (max). Parity rows are A2 / A15 rules already: not
  calibrated here; RULES.md lists P3's parity outcome only.
- F7 (P2): `m-a3-lobby wall.blotch` (max), Low. `blotch-small` in the record's skips = NOT MEASURED (VG1 polish 3).
- F5 (P4), F5b (P7): rig rules, see below.

### Rig rules
F5's rules are set (0.004 / 0.02, VG3). Check them with the same margins: each rig x preset of so-door and cp-door, B
from `v4.82.0/rigs`, F from `v4.88.0/so`, M from VG7, sigma from SPREAD `leak.*` (VG7.md's `noisy` lines flag where 4
sd > rule). Keep the rules when every fixed and master value has mG >= 2 below them and at least one bad value is red.
Otherwise do not change them in this slice: write the failing rows and a proposed rule with its margins in RULES.md
and the report (a rig rule change also changes so-corner's F5b check). F5b: so-corner keeps `known` and the same
rules; RULES.md records P7's outcome (red in k of 3 VG7 runs, or NOT PROVEN) and the VG8 master rerun's KNOWN line.

## Phase 1 steps
1. Fetch: `git fetch -q origin shots/visual-gate-proofs shots/visual-gate-vg7`; `T=$(mktemp -d)`;
   `git archive origin/shots/visual-gate-proofs | tar -xf - -C "$T/proofs"` (mkdir first) and
   `git archive origin/shots/visual-gate-vg7 <M8> | tar -xf - -C "$T/vg7"`. Nothing lands in the worktree.
2. For each Fn, the P-doc's `noise.mjs proof` command(s) plus the three master ones; collect B, F, M, sd per row.
   Margin arithmetic in a scratch script under `$T` (never committed); RULES.md prints every input and result, so C1
   recomputes any row by hand.
3. Place T per row (tiers above); edit the bounds in `viewpoints.mjs` (4 decimals, the comment beside each bound:
   `// VG8: B <b> / F <f> / M <m>, sigma <s>, <tier> (RULES.md)`).
4. Offline proof, rules only, every JSON:
   `node scripts/e2e-visual.mjs --rescore <result.json> --rules-only --json <same dir>/<name>.rescore.json` for every
   proof JSON (all 8 tags, every folder) and the 3 VG7 runs. Read the `flags` (`kind: 'rule'`, `known: null`) and the
   block's SKIPPED / WARN lines. Required, per rule set:
   - red on its Fn's bad run (the P-doc's bad JSON);
   - green on its Fn's fixed run, on every run of a build at or after the Fn's fix tag that shoots the view (tag order
     v4.60.1 < v4.61.0 < v4.72.0 < v4.78.0 < v4.82.0 < v4.88.0 < v4.96.0 < v4.97.0 < master), and on all 3 VG7 runs;
   - never SKIPPED (behind / small / blotch-small / missing) on any of those runs (a skipped rule proves nothing:
     vg5-check polish 2).
   Red on a build before the fix tag that is not the P-doc's bad run (e.g. the F2 rule on v4.60.1 / v4.61.0 goods-in) is
   expected and listed as a cross flag. A rule failing a requirement: back to null, row NO RULE ("rescore: <why>").
5. `noise.mjs proof` again per Fn: the `rule bad` / `rule fixed` columns now read the new rules; they must match step 4.
6. Coverage: per Fn, COVERED (at least one rule red on bad and green on fixed / master; F1 / F8 need a contrast rule;
   F5 at least one rig x preset red), PARTIAL (some target rows NO RULE), UNCOVERED (none; the drift compare is then the
   only net: cite the P-doc drift column).
7. Tests, checks and RULES.md (below); report phase 1 in `checks/vg8-build.md`.

## Unit test changes (`tests/visualGateViewpoints.test.ts`, vitest, node env)
- Replace "all bounds unset" with: every view bound is null or a finite number in (0, 1); a `max` bound only on
  nearBlack, veil, blotch, arc; a `min` bound only on mean, contrast (matches each `PROOF_TARGETS` `bad` side: import
  `PROOF_TARGETS` from `../scripts/visual-gate/noiseLib.mjs` under the usual `// @ts-expect-error` line); a view with a
  set `upper.veil` bound also has a set `upper.contrast` bound; F1 / F8 items have no set bound outside Epic.
- Presets test: each rule's `presets` equals the target's list, or (one bound per key) is a one-preset subset of it.
- Keep: the rig literal (unless a rig rule changed, then the new literal), "only so-corner is known" (F5b), the keys
  test (`TARGET_RULES` keys unchanged: VG8 sets bounds, never adds or removes rule keys).
- `npx vitest run tests/visualGateViewpoints.test.ts --maxWorkers=2`, `tests/visualGateNoise.test.ts`,
  `tests/visualGateGate.test.ts` (single files, `--maxWorkers=2`) all pass.

## Acceptance, phase 1 (paste outputs in `checks/vg8-build.md`)
- The step 4 table: per rule x run red / green / skipped, all requirements met for every set rule; the 3 VG7 rescore
  blocks show 0 non-known rule flags and no `F1/F8 rule on veil alone` WARN.
- `npm run typecheck:fast` (or `npx tsc --noEmit -p tsconfig.json`) clean; `npx eslint tests/visualGateViewpoints.test.ts`
  clean; `node --check scripts/visual-gate/viewpoints.mjs`.
- `git diff --stat origin/feature/visual-gate -- src` empty; `git diff origin/feature/visual-gate --
  scripts/visual-gate/viewpoints.mjs` changes only bound values, `presets` (one-bound narrowing), their comments and
  the header lines. No e2e, GPU, build, `npm run check` or full `vitest run`.

## RULES.md (the calibration record; C1, VG9's PR body and the trains' readers use it)
- Header: sources (VG7 master sha / version / renderer, the `tolerances.mjs` commit, the proof JSON folders and the
  P-doc commits, the gate commit the rerun fetched), the method (sigma table, tiers, A31), date.
- One table per Fn: `| key | address | rule | B (build) | F (build) | M (VG7 x3) | sd | sigma | sep | T | mG | mB | tier |
  rescore bad / fixed / master | rerun bad / fixed / master | note |` (4 decimals, sep and margins 1 decimal, `-` for
  none; rerun columns filled in phase 2).
- Rigs: so-door, cp-door per preset (B, F, M, sd, margins to 0.004 / 0.02, verdict); so-corner (P7, KNOWN lines).
- Coverage: per Fn COVERED / PARTIAL / UNCOVERED with the rules that catch it; THIN rows; "Not caught" (every NO RULE
  row, its reason and the proposal); cross flags (expected reds before a fix tag); master findings.
- Runtime: the VG8 master rerun wall (summary `wallS`) next to VG7's (for C1's 180 s check).

## Laptop batch (the LEAD sends it after committing and pushing phase 1 on feature/visual-gate)
One alone request per build (the service's `prepare` keeps its per-slot lockfile record right only per sha, C0 P4, so
"one request" for 8 builds is one batch sent together, as P1-P7), same builds, steps and folders as `briefs/P1-P7.md`
(no `--png`: the frames were eyeballed in P1-P7), results to `shots/visual-gate-vg8`, plus one full gate run on the
master head (what a train runs, rules only). Bash, from the job worktree:
```bash
cd /c/NightShift/Mobile-Coop-visual-gate && git fetch -q origin && M=$(git rev-parse origin/master) && M8=${M:0:8}
G="git fetch -q origin feature/visual-gate && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate scripts/laptop-queue/serve.mjs | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --rules-only --no-record"
P="git fetch -q origin feature/visual-gate && git archive FETCH_HEAD scripts/visual-gate | tar -xf - && node scripts/visual-gate/push-results.mjs --branch shots/visual-gate-vg8"
D=C:/NightShift/scratch/visual-gate/vg8
R="node scripts/laptop-queue/request.mjs --alone --requester"
RQ="Night Shift | Sector Ops Build"
SO1="--only so-s1-goods-in,so-s1-girder"
$R "$RQ" --sha 62d80c02f020205453fa2992ffe3ab0aac624f5a --set visual-vg8-4.60.1 --note "visual-gate VG8 rerun F1 bad" \
  --step "$G $SO1 --json $D/v4.60.1/f1/result.json" --step "$P --dir $D/v4.60.1 --prefix v4.60.1"
$R "$RQ" --sha af56ab431dfa6889227d7095e375f63f8cc4b109 --set visual-vg8-4.61.0 --note "visual-gate VG8 rerun F1 fixed" \
  --step "$G $SO1 --json $D/v4.61.0/f1/result.json" --step "$P --dir $D/v4.61.0 --prefix v4.61.0"
$R "$RQ" --sha 0dc25cca9ab588be63b3d629a129b0471ea761cf --set visual-vg8-4.72.0 --note "visual-gate VG8 rerun F2 bad" \
  --step "$G $SO1 --json $D/v4.72.0/f2/result.json" --step "$P --dir $D/v4.72.0 --prefix v4.72.0"
$R "$RQ" --sha 518c3fa188cf50191431be8bc7e61211aa11f6c6 --set visual-vg8-4.78.0 --note "visual-gate VG8 rerun F4 bad" \
  --step "$G --only so-s1-workshop --extra falloff=photo --json $D/v4.78.0/f4-photo/result.json" \
  --step "$P --dir $D/v4.78.0 --prefix v4.78.0"
$R "$RQ" --sha 33fff449c1c8e4780df6ab75c094ab5e53226f71 --set visual-vg8-4.82.0 --note "visual-gate VG8 rerun F5 F6 F7 bad" \
  --step "$G --maps ctcourse --json $D/v4.82.0/marlow/result.json" \
  --step "$G --maps ctcourse --extra falloff=photo --json $D/v4.82.0/marlow-photo/result.json" \
  --step "$G --only so-door,cp-door --json $D/v4.82.0/rigs/result.json" \
  --step "$P --dir $D/v4.82.0 --prefix v4.82.0"
$R "$RQ" --sha 1b8361c506a1ed364f7cae197b1f74acafa2318c --set visual-vg8-4.88.0 --note "visual-gate VG8 rerun fixed F2 F4 F5 F6 F7" \
  --step "$G --maps ctcourse --json $D/v4.88.0/marlow/result.json" \
  --step "$G --only so-door,cp-door,so-s1-workshop,so-s1-goods-in,so-s1-girder --json $D/v4.88.0/so/result.json" \
  --step "$P --dir $D/v4.88.0 --prefix v4.88.0"
$R "$RQ" --sha 4c8648615084fb95a9c6f7a6df75a22edb0e3092 --set visual-vg8-4.96.0 --note "visual-gate VG8 rerun F8 bad" \
  --step "$G --only cp-s2-b,cp-s2-d,cp-s3-a --json $D/v4.96.0/f8/result.json" --step "$P --dir $D/v4.96.0 --prefix v4.96.0"
$R "$RQ" --sha 7ae1eda1dc67cde6b80460e8c20fb85fb9b49665 --set visual-vg8-4.97.0 --note "visual-gate VG8 rerun F8 fixed" \
  --step "$G --only cp-s2-b,cp-s2-d,cp-s3-a --json $D/v4.97.0/f8/result.json" --step "$P --dir $D/v4.97.0 --prefix v4.97.0"
$R "$RQ" --sha "$M" --set visual-vg8-master --note "visual-gate VG8 rules on master (full run)" \
  --step "$G --json $D/master/full/result.json" --step "$P --dir $D/master --prefix master-$M8"
```
- Statuses `laptop-e2e/alone-visual-vg8-<tag>`: a bad build's gate steps exit 1 (its rules red: expected), so its
  status shows fewer steps ok; a fixed build may exit 1 on parity / meter / leak rows the P-docs already explained. The
  verdict is read from the rescored JSONs (phase 2), never from the status. A failed `prepare` (`build failed`) pushes
  nothing: that build is NOT RERUN (the lead asks Test Runner for the log; no second try unless it is a laptop fault).
- Laptop time (estimate; replace it with P1-P7's real walls from their statuses when known): 8 builds ~50-55 min as
  P1-P7, plus the master run ~5-8 min (prepare + one ~3 min gate run) = **~55-65 min**.
- The lead writes the master sha `<M>` into STATE and RULES.md's header.

## Phase 2 (same builder resumed, or a fresh Opus with this brief and `checks/vg8-build.md`)
1. `git fetch -q origin shots/visual-gate-vg8`; `git archive origin/shots/visual-gate-vg8 | tar -xf - -C "$T2"` (a new
   temp dir). A missing folder: that build is NOT RERUN (say which step).
2. Rescore every rerun JSON as phase 1 step 4 (the rules from the committed viewpoints.mjs; the same command). Fill
   RULES.md's rerun columns. Requirements per set rule as step 4, with the VG8 master full run in place of / beside the
   VG7 runs.
3. A set rule that fails any requirement on the rerun: bound back to null (no retune, no new T from the rerun numbers),
   row `NO RULE (rerun: <why>)`, listed in "Not caught". Rerun tests and checks as in phase 1 when a bound changed.
4. Per Fn the final line: `F<n>: red on bad <tag> (<rules red>/<rules set>), green on fixed <tag> (0 red), master
   green (0 non-known rule flags)`, or why not. F5b: the master KNOWN line (expected `KNOWN so-corner-on@epic leak.*`)
   or `KNOWN PASSES` (finding: the rig misses the wedge on this run).
5. Append "Phase 2" to `checks/vg8-build.md`.

## Acceptance, phase 2
- Every set rule red on its bad rerun, green on its fixed rerun, on every later build's rerun that shoots the view, on
  the VG8 master run and the 3 VG7 runs; none SKIPPED there. Rules that failed are null and reported.
- The VG8 master run's block: 0 non-known rule flags (parity / meter rows may flag: list them, they are not VG8's);
  its `wallS` recorded in RULES.md.
- Tests, typecheck, eslint, `node --check` as phase 1; zero src diff; only the four owned files touched.

## Held polish this slice respects
- VG1 polish 1 (arc exact tangent): F4 numbers only from a gate that had it (P5 says which commit ran).
- VG1 polish 2 (veil blind to partial beams): F1 / F8 are caught by `upper.contrast`; veil never alone.
- VG1 polish 3 / VG5 `blotch-small`: a blotch rule on a region the gate drops is NOT MEASURED, never "blotch 0, green".
- VG5 polish 1: rig leak rows may flag in rules-only runs (F5 bad expected; fixed / master explained).
- VG5 polish 2: SKIPPED lines appear once a bound is set; a set rule must not be SKIPPED on its proof runs.
- PLAN 10 (e2e-affected) stays held: no change here.

## Report
`docs/visual-gate/checks/vg8-build.md`: per phase the commands, the step 4 table (rule x run), the bounds set (count per
tier), Fn coverage lines, "Not caught" with reasons and proposals, master findings, deviations and why, files touched,
test results. Final message (short): done / not done, per Fn COVERED / PARTIAL / UNCOVERED, THIN and NO RULE counts,
master green or not, open items for C1 and the lead (A31 to log, any proposal that needs a region / view / rig change).
