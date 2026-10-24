# VG9 - chores: changelog fragment, TESTING and testing-tools lines, the PR split and bodies (Haiku builder)

Job visual-gate, group E (beside C1: disjoint files). Lead: Night Shift | Sector Ops Build. PLAN.md slice table row VG9
(:217); CLAUDE.md "Definition of done" (fragment, `TESTING.md`, `docs/systems/*.md`); `git show
origin/master:changes/README.md`; `git show origin/master:docs/systems/session-method.md` :41-46 and
`scripts/pr-size.mjs` (the ~1.5k counted-line cap). Mechanical work from this brief: copy the texts below, fill each
`{PLACEHOLDER}` by its rule, run the commands, paste the outputs. Never invent a number; a number whose source doc is not
committed yet stays `{PLACEHOLDER}` and goes in the report as open.

## Preconditions (the lead)
- VG8 phase 2 committed (`docs/visual-gate/RULES.md` final: coverage per Fn, the master rerun wall), VG7.md committed
  (runtime), M0.md committed. C1 may run at the same time.

## Where
- The job worktree `C:/NightShift/Mobile-Coop-visual-gate`, branch `feature/visual-gate`. Guard before every write:
  `cd /c/NightShift/Mobile-Coop-visual-gate && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate"`
- Never commit, push, stash, reset, checkout, create branches or open PRs (the lead does). No laptop request, no e2e,
  no build, no `npm run check`.

## Files (only these)
- create `changes/feature-visual-gate.md`
- edit `TESTING.md`: insert one checklist item (below), nothing else
- edit `docs/systems/testing-tools.md`: the GPU one-liner only (below)
- create `docs/visual-gate/PR.md` (the split, the build commands for the lead, the PR bodies)
- create `docs/visual-gate/checks/vg9-build.md` (your report)
Do NOT touch: `CHANGELOG.md`, `package.json`, `CLAUDE.md` (its doc-index row is drafted in PR.md; the lead adds it on
master's copy in the last PR), any code, test, other doc. These three shared files are older copies on this branch
(base bd54dfcd): edit only the lines named; the split re-applies them as hunks on master (PR.md step 3).

## 1. Changelog fragment `changes/feature-visual-gate.md` (exact text; fill the placeholders)
```
# Visual gate: a picture check after every green train
kind: patch
- Tests: after every green train the laptop now runs a picture check (`e2e-visual`, about {WALL_MIN} min): {VIEWS}
  fixed views on Marlow Yard, Saltmarsh Park, Sector Ops and the Warehouse at Low and Epic, plus guard-torch rigs at
  doors and a corner, each measured for brightness, near-black floors, haze, blotchy walls, hard light arcs and torch
  light through doors.
- Each shot is checked against rules set from the old builds where these faults were seen ({COVERED}) and against
  the last accepted release; a big change posts a failed `visual-gate` status and a comment on the train PR, and never
  holds a release.
- The display brightness check now covers every map: grey cards at Epic must read in their light band, and the light
  meter must match the light field on every view.
- A deliberate look change is accepted with `node scripts/visual-gate/baseline.mjs accept`; the torch haze wedge round
  corners stays a known fault until it is fixed (`docs/visual-gate/`).
```
- `{WALL_MIN}`: VG7.md's mean wall in minutes, rounded to the nearest 0.5 (e.g. 152 s -> 2.5).
- `{VIEWS}`: `node -e "import('./scripts/visual-gate/viewpoints.mjs').then(m=>console.log(m.VIEWS.length))"` (26 at
  d1e45ddc; the M0 ladder may have cut campus views).
- `{COVERED}`: the COVERED and PARTIAL targets in RULES.md "Coverage", in this order and these words, comma separated:
  F1 "strip-light fog cones", F2 "black bay floors", F4 "hard light arcs", F5 "torches through doors", F6 "dark Marlow
  Yard", F7 "blotchy Low walls", F8 "campus fog beams". Leave UNCOVERED ones out. If the M0 ladder cut parity cards to
  one per map, bullet 3 stays as written.
- Wording rules (`changes/README.md` format; the 4.100.2 "Laptop queue: visual-gate after green trains" entry in
  `git show origin/master:CHANGELOG.md` is the model): line 1 `# <title>`, line 2 `kind: patch` (README: a test-only
  change; no game change); `- ` bullets, continuation lines indented 2 spaces, every line <= 120 chars; plain words a
  tester reads, present tense; no slice ids (VG1-VG9, P1-P7, C0, C1), no A / G / F numbers, no shas, no file:line, no
  model names; hyphens, never em dashes.
- If the lead splits the PR (section 4), the same text goes in the last PR renamed after its branch
  (`changes/feature-visual-gate-pr6.md`, README naming); the earlier parts carry no fragment.

## 2. `TESTING.md`: one item in "Release checklist" > "Checks"
Insert right after the item that ends `or lists them as "pending PC run".` (find it: `grep -n "pending PC run" TESTING.md`):
```
- [ ] A job that touches lights, maps or rendering: its train's `visual-gate` status is clean, or each flag is fixed
  by that job or accepted (`node scripts/visual-gate/baseline.mjs accept`, `docs/visual-gate/`); a PR can run the gate
  on the laptop first with `request.mjs --sha <head> --suites e2e-visual --set visual`.
```

## 3. `docs/systems/testing-tools.md`: the GPU one-liner (vg5-check polish 5)
`grep -n "GPU (\`--gpu\`" docs/systems/testing-tools.md` (one line, :63 at d1e45ddc): change
`` `e2e-darkness`, `e2e-desktop:3`, `e2e-coop-gpu`. `` to `` `e2e-darkness`, `e2e-desktop:3`, `e2e-coop-gpu`,
`e2e-visual`. `` (the `run-e2e.mjs` GPU list order on this branch). Nothing else in the file.

## 4. `docs/visual-gate/PR.md`
### 4a. Size (paste the outputs)
The job diff is far over the cap: at d1e45ddc, 8964 changed lines, of which 5626 counted (scripts and tests; docs,
`*.md` and `changes/**` are not counted, `scripts/pr-size.mjs` DOC_GLOBS), before VG7's noise tools, `tolerances.mjs`
and VG8. So it splits (A32, below). Measure the real numbers now:
```bash
cd /c/NightShift/Mobile-Coop-visual-gate && git fetch -q origin && J=origin/feature/visual-gate
git diff --numstat origin/master...$J | awk '$3 !~ /^docs\// && $3 !~ /\.md$/ && $3 !~ /^changes\// { s += $1 + $2 } END { print "counted", s }'
for g in "scripts/visual-gate/metrics.mjs tests/visualGateMetrics.test.ts" \
         "scripts/visual-gate/viewpoints.mjs tests/visualGateViewpoints.test.ts" \
         "scripts/visual-gate/storeLib.mjs scripts/visual-gate/store.mjs scripts/visual-gate/baseline.mjs tests/visualGateStore.test.ts scripts/visual-gate/harness.mjs" \
         "scripts/visual-gate/gate.mjs tests/visualGateGate.test.ts" \
         "scripts/visual-gate/noiseLib.mjs scripts/visual-gate/noise.mjs scripts/visual-gate/push-results.mjs tests/visualGateNoise.test.ts scripts/visual-gate/tolerances.mjs" \
         "scripts/e2e-visual.mjs tests/visualGateHarness.test.ts scripts/run-e2e.mjs"; do
  git diff --numstat origin/master...$J -- $g | awk -v g="$g" '{ s += $1 + $2 } END { print s, g }'; done
head -1 scripts/visual-gate/tolerances.mjs   # counted unless this line matches /GENERATED|Do not edit/ (pr-size GENERATED_HEADER)
```

### 4b. The split (A32; the lead copies A32 into BRIEF.md: "the job ships as 6 stacked PRs cut from master, each <= 1500
counted lines, `scripts/e2e-visual.mjs` and the run-e2e GPU hunk last; undo: one PR with the orchestrator's `big-pr`
label"). Fill the counted column from 4a:
| PR | Branch | Files | Counted | Base |
| --- | --- | --- | --- | --- |
| 1 metrics | `feature/visual-gate-pr1` | `metrics.mjs`, its test; all of `docs/visual-gate/**` (not counted) | {N1} (1172 at d1e45ddc) | master |
| 2 viewpoints + rules | `-pr2` | `viewpoints.mjs`, its test | {N2} (903 + VG8) | pr1 |
| 3 store + harness | `-pr3` | `storeLib.mjs`, `store.mjs`, `baseline.mjs`, store test, `harness.mjs` | {N3} (1406) | pr2 |
| 4 gate core | `-pr4` | `gate.mjs`, its test | {N4} (1087) | pr3 |
| 5 noise | `-pr5` | `noiseLib.mjs`, `noise.mjs`, `push-results.mjs`, noise test, `tolerances.mjs` | {N5} | pr4 |
| 6 the gate on | `-pr6` | `e2e-visual.mjs`, harness test (it imports `e2e-visual.mjs` `parseArgs`), hunks of `run-e2e.mjs` / `testing-tools.md` / `TESTING.md`, the CLAUDE.md doc-index row, the fragment | {N6} (1058) | pr5 |
Rules the table must keep (write each as a line under the table, with ok / not ok):
- Every counted cell <= 1500. Over: say which and the option, never move a file against the order below. For PR 5
  the likely cause is `tolerances.mjs`: the options are a `GENERATED` first line in VG7's `renderTolerances` header
  (then pr-size skips the file; a VG7 code change the lead orders, regenerated, not hand-edited) or `tolerances.mjs`
  alone as its own PR.
- Order: a PR's tests import only its own files and earlier PRs' (metrics -> viewpoints -> store / harness (harness
  types read viewpoints) -> gate (imports metrics, storeLib) -> noise (imports metrics, gate, viewpoints) -> e2e-visual
  (imports all)). Check: `grep -n "from '\.\./scripts\|^import" tests/visualGate*.test.ts scripts/visual-gate/*.mjs`.
- `scripts/e2e-visual.mjs` and the run-e2e GPU hunk only in PR 6: master's train step (VG6, #367, merged in train 76)
  runs the gate as soon as a train head has `scripts/e2e-visual.mjs`, so PRs 1-5 are inert on their own.
- The six enter one train together (CLAUDE.md "Sessions": stacked series); each PR's base is the previous branch, so
  CI's `pr-size` (base = the PR's base ref) counts only that part.

### 4c. Build the stack (the lead runs it after C1 PASS; one temp worktree, removed at the end)
```bash
cd /c/NightShift/Mobile-Coop-visual-gate && git fetch -q origin && J=origin/feature/visual-gate
W=C:/NightShift/Mobile-Coop-visual-gate-split          # check free space on C: first (~500 MB)
git worktree add --detach "$W" origin/master
# per PR k = 1..6, in order (FILES_k = the table's new files; PR 1 adds docs/visual-gate):
git -C "$W" switch -c feature/visual-gate-pr$k
git -C "$W" checkout $J -- <FILES_k>
# PR 6 only: shared files as hunks on master's copies (never whole-file copies: they would revert master's newer lines)
git diff origin/master...$J -- scripts/run-e2e.mjs docs/systems/testing-tools.md TESTING.md | git -C "$W" apply -3 --index
git show $J:changes/feature-visual-gate.md > "$W/changes/feature-visual-gate-pr6.md"   # + the CLAUDE.md row by hand
git -C "$W" add <FILES_k> && git -C "$W" commit -m "visual-gate $k/6: <title>" && git -C "$W" push -u origin feature/visual-gate-pr$k
gh pr create --base <master | feature/visual-gate-pr$((k-1))> --head feature/visual-gate-pr$k --title "visual-gate $k/6: <title>" --body-file <scratch>/pr$k.md
# after PR 6: the top of the stack equals the job branch for every gate file
git -C "$W" diff --stat $J -- scripts/visual-gate scripts/e2e-visual.mjs tests   # prints nothing
git worktree remove "$W"
```
(Commit messages end with the attribution lines the lead's session gives.)

### 4d. PR bodies
PR 1-5 (one short body each; fill `<k>`, `<prev>`, the bullets from the table's files, the test file and its pass
count from the latest `checks/*-build.md` or C1):
```
Part <k> of 6 of the visual-gate job (stacked on <prev>; the six enter one train together).
- <what this part adds, 1-3 bullets in plain words>
- Inert on its own: no suite list, no train step, no game code (zero src diff).
- Tests: `tests/<file>` (<n> pass).
The full description, rules and proofs are in part 6 (#<n6>) and `docs/visual-gate/`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
PR 6 (the full body; every number from a committed doc, cited by file):
```
## Visual gate: a picture check after every green train (part 6 of 6, turns it on)
After a green train the laptop runs `e2e-visual` on port 4189: {VIEWS} fixed views on 4 maps at Low and Epic, 3 torch
rigs, the L5 parity grid; rules and a compare with the last accepted release; status `visual-gate`, a PR comment on
flags. It never holds a release (BRIEF A1). Zero src diff.

### Faults it catches (docs/visual-gate/RULES.md)
| Fault | Caught by | Bad -> fixed (rule red -> green on the rerun) |
<one row per F1-F8 and F5b from RULES.md "Coverage": COVERED / PARTIAL / UNCOVERED, the rules, the builds>

### Runtime (BRIEF Limits: target <= 180 s, cap 300 s)
M0 {M0_S} s; VG7 runs {VG7_S1} / {VG7_S2} / {VG7_S3} s; master rerun {VG8_S} s.

### Baseline
Initial: VG7 run 3 on master {M8}, accepted by {APPROVER} ("initial"); renderer {RENDERER}. Accept a look change:
`node scripts/visual-gate/baseline.mjs accept --sha <run> --by <name> --why <text> [--only k,k]` (BRIEF A9).

### Known and not caught
F5b torch haze wedge: `known` on so-corner until fixed (A10). Not caught: <RULES.md "Not caught" rows, one line each>.

### Switches and undo
`LQ_VISUAL=0` on the laptop service turns the train step off; block on flags later: BRIEF A1 undo; Michael's open
questions (PLAN 9) keep their defaults: flag, do not hold; the orchestrator may accept with a cited reason; Low + Epic.

### Checks
Unit: <each tests/visualGate*.test.ts with its pass count>. Laptop sets: visual-m0, visual-vg5, visual-vg7,
visual-proof-<8 tags>, visual-vg8-<8 tags + master>. Checker: C1 {C1_VERDICT} (`docs/visual-gate/checks/c1-check.md`).
Stack: #<n1> .. #<n5> (parts 1-5), this PR last.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
Placeholders and their sources: `{M0_S}` M0.md wall; `{VG7_S1..3}`, `{M8}`, `{RENDERER}` VG7.md; `{APPROVER}` VG7.md
"Baseline" (after the accept); `{VG8_S}` RULES.md runtime line; `{C1_VERDICT}` c1-check.md verdict line (or
`{C1_VERDICT}` left open while C1 runs); `{VIEWS}` as section 1. PR numbers stay `#<n>` (the lead fills them).

### 4e. The CLAUDE.md doc-index row (draft; the lead adds it to master's CLAUDE.md "Doc index" in PR 6)
```
| `docs/visual-gate/` | The visual gate (`e2e-visual`): views, rules and their proofs (`RULES.md`), baselines, accepting a look change | A train's `visual-gate` flag, or a change to lights, maps or rendering |
```

## Acceptance (paste outputs in `checks/vg9-build.md`)
- `npx vitest run tests/changesFragments.test.ts --maxWorkers=2` passes (the fragment parses as the train build reads it).
- `awk 'length > 120' changes/feature-visual-gate.md TESTING.md` prints nothing new; `grep -n $'\xe2\x80\x94' changes/feature-visual-gate.md
  docs/visual-gate/PR.md` (em dash, UTF-8 bytes) prints nothing.
- `git diff --stat` shows only: `changes/feature-visual-gate.md` (new), `TESTING.md` (+3), `docs/systems/testing-tools.md`
  (1 line changed), `docs/visual-gate/PR.md` (new), `docs/visual-gate/checks/vg9-build.md` (new). `git diff --stat -- src` empty.
- Every filled number has its source named in the report; every unfilled `{PLACEHOLDER}` is listed as open.

## Report
`docs/visual-gate/checks/vg9-build.md`: the files and their diffs (short), the 4a outputs, the split table as filled
with ok / not ok per rule, the placeholders filled (value, source) and open. Final message (short): done / not done, the
fragment test result, the counted lines per PR, any PR over 1500 and the option it needs, open placeholders.
