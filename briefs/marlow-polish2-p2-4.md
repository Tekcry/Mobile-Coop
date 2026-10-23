status: done feature/marlow-p2-teeth 1fd50f3c

# marlow-polish batch 2, slice P2-4 (Marlow Build)
- Base: origin/feature/marlow-polish at a763ac39.
- New branch: feature/marlow-p2-teeth (push it to origin).
- The strict brief is docs/marlow-final/plans/POLISH-2.md on that base: read "Rules for every builder in this batch" (lines 23-37) and "Slice P2-4" (lines 201-218). Edit only the files that slice names. Model for the build: Sonnet 5.5.
- Verify: npx tsc --noEmit -p tsconfig.json and only the vitest files the slice names (single-file runs). No e2e, no GPU, no npm run check (the lead sends the e2e to the laptop).
- Do not touch src/net, PROTOCOL_VERSION, the save shape, package.json, CHANGELOG.md, docs/marlow-final/STATE.md. Add one line to changes/feature-marlow-polish.md.
- Done: branch pushed; report at the end of this file (what changed with file:line, tsc result, test files with counts, deviations); status line "done feature/marlow-p2-teeth <sha>".

## Report (Night Shift | Cloud Builder 1, 2026-10-23)
- Branch `feature/marlow-p2-teeth` at 1fd50f3c, off a763ac39. Built by a Sonnet 5.5 agent, reviewed by Opus. No set file touched.
- `tests/ctcourse/a7DataHall.test.ts`:
  - :838-853: `skinsInOf(list, ...)` (`skinsIn` delegates to it) and `plantIn`.
  - :1070-1095: `clearWindows()`, all 15 windows: 2 fence, 2 spots, 5 doors, 2 sliding doors, 2 lenses, the lees.
  - :1097-1099: the existing cage test, now one loop over the same windows with the same `toEqual([])`.
  - :1101-1111: new teeth test. Each window is bare without the plant, and dressing plus a 0.03 m cube finds exactly that skin.
- `tests/ctcourse/a6PumpHouse.test.ts`:
  - :783-784: `skinsInOf`.
  - :989-1009: `overlap`, `marks`, `clearPoints`, `inPlateColumn` and `plantAt`, lifted out of the existing test unchanged.
  - :1011-1019: the existing test, with the same expectations.
  - :1021-1048: new teeth test. Every mark, every device / switch / lamp point, the plate column, the cage door opening and the leg-up floor window each catch a planted skin and are bare without it.
- `docs/marlow-final/slices/P2-4.md`: the slice report.
- `changes/feature-marlow-polish.md`: one line appended, as this brief says.
- Checks: `npx vitest run tests/ctcourse/a7DataHall.test.ts tests/ctcourse/a6PumpHouse.test.ts`: 2 files, 108 passed (the base had 106: +2 new tests), re-run by Opus. `npx tsc --noEmit -p tsconfig.json`: clean.
- Deviations: the two existing tests' bodies were restructured to share their window lists with the teeth tests. No expectation or number changed. The A7 L6 / L7 sliding-door asserts now compare `.map((p) => p.c)` to `[]` (equivalent) and carry a name.
- Merge note: P2-3 also runs `a6PumpHouse.test.ts` but does not edit it, so there is no file overlap. The only shared file across P2-2 / P2-3 / P2-4 is the appended changes line.
