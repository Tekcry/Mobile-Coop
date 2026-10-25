status: claimed Night Shift | Cloud Builder 3 2026-10-25T21:35Z
# J12 validator-port, docs slice D-D (Sonnet, strict Opus brief): docs for PR D (mission re-cut) plus S8 polish

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3). S8 checker PASS (fa4abab62) and
merged into PR D.

- Base: `feature/validator-port-mission` at `5cdb01cb8` (PR A dae93b996 + S8). New branch: `feature/validator-port-dd`
  cut from it. Push every sub-step. Guard before every write:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/validator-port-dd`.
- Read first: `docs/systems/agent-preamble.md` (origin/master, "Cloud sessions"); the PLAN
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` row D-D (:119), S8 detail (`**S8 (Opus,
  joint).**`, :283-291); BRIEF (same branch) A11, A19, A20, A25. On your branch: `scripts/mission-validate.mjs` (the
  solo walks use the lib's `soloArcsOf`: a `bolted` link and a `vent_unlock` open for one player only from their `to`
  end, A25), `docs/level-validator/mission-schema.md`, `docs/level-validator/example.mission.json`,
  `changes/feature-validator-port-s8.md`.

## Only files to edit
1. `docs/level-validator/graph-schema.md`: the mission pointer only (below).
2. `docs/level-validator/mission-schema.md`: rows :100 and :104 only.
3. `docs/level-validator/example.mission.json`: line 63 only.
4. `changes/feature-validator-port-mission.md` (new) and `git rm changes/feature-validator-port-s8.md` (one fragment
   per PR, `changes/README.md`).

Not in this slice: `tests/missionValidate.test.ts` (its temporary `mission_*` metrics overlay stays until S7a's rows
reach PR D through PR C), any script, the scale sheet. Style: plain English, hyphens not em or en dashes, lines under
120 characters, doc headers unchanged, one home per rule (mission fields and checks stay in mission-schema.md).

## Steps
1. Before any edit, save the baseline: `node scripts/level-validate.mjs docs/level-validator/example.mission.json >
   /tmp/dd-before.txt` (expected: `0 error(s), 4 warning(s).`, the four `rules.mission_* is missing` WARNs: this
   branch's metrics have no S7a rows yet).
2. `graph-schema.md`: append ONE new last section after "Campus conventions" (PR C's docs slice adds nothing after that
   section, so the two branches meet cleanly):
   `## Mission nodes` and 3-5 lines: a graph may carry four top-level nodes beside `meta`, `spaces` and `links`
   (`mission`, `objectives`, `rules`, `syncs`); their fields, merge rule and checks are in
   `docs/level-validator/mission-schema.md` (`checkMission` in `scripts/mission-validate.mjs`, called from `validate()`
   when the merged graph has a mission node); run the map files and the mission file together
   (`node scripts/level-validate.mjs <map files ...> <mission.json>`); worked example
   `docs/level-validator/example.mission.json`. No other line of graph-schema changes.
3. `mission-schema.md` (S8 checker polish 2): row :100 (Campaign forced co-op, M3) "`bolted` links only from their far
   side" and row :104 (Sector Ops solo) "`bolted` only from the far side" each name `vent_unlock` the same way: a
   `bolted` link or a `vent_unlock` (A25) opens for one player only from its `to` end. Check the wording against
   `soloArcsOf` in `scripts/level-graph-lib.mjs`.
4. `example.mission.json:63` (S8 checker polish 1): the shutter link `s2-strong -> s2-yard` keeps VAL-DIMS's
   `"gap": 0.9`; graph-schema reads a shutter's held gap as `height` ("Link kinds", `shutter` row). Change only
   `"gap": 0.9` to `"height": 0.9` on that line.
5. Rerun step 1's command into `/tmp/dd-after.txt`; `diff /tmp/dd-before.txt /tmp/dd-after.txt` must print nothing (the
   lead ran the same edit: 0 errors, the same 4 WARNs; 0.9 is the band's floor, `sizes.shutter_gap_h`, and passes).
6. `changes/feature-validator-port-mission.md`: line 1 `# Level validator: mission checks on the shared validator code`,
   line 2 `kind: patch`, then S8's bullet with one wording fix (S8 checker polish 5): "the no-alarm and no-kill runs"
   becomes "the ghost run (no loud link) and the no-kill run" (A11: ghost = no loud link); then one docs bullet
   (graph-schema points to the mission schema; the worked example's shutter uses `height`). `git rm` the S8 fragment.
   Commits: one per file group is fine, e.g. `validator-port D-D: graph-schema mission pointer`, `validator-port D-D:
   mission-schema vent_unlock solo rule, example shutter height`, `validator-port D-D: PR D changelog fragment`.

## Checks (unit only: no e2e, no GPU, no npm run check)
- Step 5's diff empty. `node scripts/level-validate.mjs docs/level-validator/example.graph.json`: `0 error(s), 0
  warning(s).`
- `npx vitest run tests/missionValidate.test.ts tests/levelValidate.test.ts tests/changesFragments.test.ts
  tests/docLint.test.ts`: all green.
- `node scripts/doc-lint.mjs`: 0 errors; no new warning in your files.
- `git diff --stat origin/feature/validator-port-mission...HEAD`: only the four files above (plus the removed S8
  fragment); no em or en dash in added lines.

## Done
The mission pointer, the two mission-schema rows, the example's `height`, one PR D fragment; example mission output
unchanged.

## Report (append below, then set line 1)
What changed (files, line ranges, commits), checks with counts, deviations. Then
`status: done feature/validator-port-dd <sha>`.
