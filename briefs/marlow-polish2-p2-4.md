status: claimed Night Shift | Cloud Builder 1 2026-10-23T08:17Z

# marlow-polish batch 2, slice P2-4 (Marlow Build)
- Base: origin/feature/marlow-polish at a763ac39.
- New branch: feature/marlow-p2-teeth (push it to origin).
- The strict brief is docs/marlow-final/plans/POLISH-2.md on that base: read "Rules for every builder in this batch" (lines 23-37) and "Slice P2-4" (lines 201-218). Edit only the files that slice names. Model for the build: Sonnet 5.5.
- Verify: npx tsc --noEmit -p tsconfig.json and only the vitest files the slice names (single-file runs). No e2e, no GPU, no npm run check (the lead sends the e2e to the laptop).
- Do not touch src/net, PROTOCOL_VERSION, the save shape, package.json, CHANGELOG.md, docs/marlow-final/STATE.md. Add one line to changes/feature-marlow-polish.md.
- Done: branch pushed; report at the end of this file (what changed with file:line, tsc result, test files with counts, deviations); status line "done feature/marlow-p2-teeth <sha>".
