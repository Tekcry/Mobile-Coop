# sector-batch B3 - build report (one door light threshold at 15%)

Owner: Night Shift | Sector Ops Build. Status: current.

Built by Night Shift | Cloud Builder 4 (cloud) from `docs/sector-batch/briefs/B3.md` on origin/feature/sector-batch
31e9f22e. Branch `feature/sector-batch-light` from origin/master 9ad370a90. Every brief anchor matched the code and
docs as quoted; no line had moved.

## Built
- Step 1 (58af67aee): `src/world/lightField.ts` line 22 comment and the `DOOR_SHUT` block, 0.05 -> 0.15 (now
  `lightField.ts:34`). `grep -rln DOOR_SHUT src`: `lightField.ts`, `bakedLamps.ts`, `torchShadowSet.ts` only.
- Step 2 (8aae85dba): `tests/lightField.test.ts` door test gains the 0.12 (shut) and 0.2 (free level) cases; new
  `tests/doorLight.test.ts` (2 cases: `DOOR_SHUT` 0.15, `DOOR_SHUT` = `DOOR.driveShut`).
- Step 3 (70d5505d6): `docs/systems/lighting.md`, `docs/systems/ai.md`, `docs/systems/world-and-characters.md`,
  `docs/level-design.md` 12.1, 12.2 and a new 12.3 bullet ("Map decisions that relied on 0.05: none"), word for word
  from the brief. Step 3f grep prints nothing.
- Step 4 (eabd38776): `changes/feature-sector-batch-light.md` (kind: patch).

## Checks
- `npm run typecheck:fast`: exit 0.
- `npx vitest run tests/doorLight.test.ts tests/lightField.test.ts tests/doors.test.ts tests/torchShadowSet.test.ts
  tests/shadowAccuracy.test.ts tests/torchOcclusion.test.ts tests/lampFalloff.test.ts tests/thermalThroughDoor.test.ts
  tests/doorPeek.test.ts --maxWorkers=2`: 9 files, 96 tests passed. `door.open = 0.2` gives the free level.
- `npx vitest run tests/changesFragments.test.ts`: 1 passed.
- `node scripts/doc-lint.mjs`: 0 errors; 23 warnings, the same count as on the base 9ad370a90 (none in the edited files).
- `git diff 9ad370a90 --stat`: only the brief's files (this report included).

## Step 3e: docs that quote the old 0.05 (not edited)
`grep -rn "DOOR_SHUT" docs --include=*.md | grep -v "^docs/archive/"` on 9ad370a90, the lines quoting 0.05 (or the
"light passes at 5%" behaviour) outside the edited system docs:
- `docs/marlow-final/CONSTRAINTS.md:176` - an engine-fact restatement ("pass past `DOOR_SHUT` 0.05"; the crack counts
  as closed). No Marlow Yard decision depends on the leaf passing light between 5% and 15%: the crack is still closed
  and an ordinary swing passes 15% in about a tenth of a second. Relies: no.
- `docs/marlow-final/ENGINE-ANSWERS.md:45` - a line-pointer answer (`DOOR_SHUT` 0.05 at `lightField.ts:27`). Relies: no
  (fact quote only; the pointer is now `:34`).
- `docs/conformance-sector-ops/CONFORMANCE.md:137` - row L15 asks for exactly this change. Relies: no (this slice is
  its fix).
- `docs/ct-research/code-inventory.md:67` - P3 row "Code: `DOOR_SHUT` 0.05". Relies: no (research inventory).
- `docs/sector-redesign/checks/light-measure.md:248` and `docs/sector-redesign/checks/shadow-audit.md:52` - check
  reports describing a closed leaf as `open <= DOOR_SHUT` 0.05. Relies: no (measurements were taken with shut or fully
  open doors; the threshold only moves the first tenth of a second of a swing).
Others matched by the grep do not quote the number (`marlow-final/slices/S0g-doors.md:21`, `ENGINE-ANSWERS.md:172`,
`KIT.md:35`, `sector-redesign/checks/lr16t-check-a.md:54`, `docs/systems/lighting.md:78`).
Result: no map decision relied on 0.05, so the 12.3 bullet says "none". The lead copies this list into the PR body and
sends it to Marlow Build.

## Deviations
- Commit trailer is `Co-Authored-By: Claude Opus 5.5` (the cloud builder's model) instead of the brief's Sonnet line.
- The brief's desktop worktree path and toplevel guard were not used (cloud brief: branch guard only).

## Pending PC run
- The affected e2e suites on the PR head (laptop queue), and any GPU look check the lead wants for door light.

## What Michael should try
Nothing new to walk: the change is the first tenth of a second of a door's swing; the crack and the stick-driven door
were already dark.
