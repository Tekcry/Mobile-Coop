status: done feature/marlow-p2-ricochet-e2e 9a48f512

# marlow-polish batch 2, slice P2-2 (Marlow Build)
- Base: origin/feature/marlow-polish at a763ac39.
- New branch: feature/marlow-p2-ricochet-e2e (push it to origin).
- The strict brief is docs/marlow-final/plans/POLISH-2.md on that base: read "Rules for every builder in this batch" (lines 23-37) and "Slice P2-2" (lines 90-128). Edit only the files that slice names. Model for the build: Sonnet 5.5.
- Verify: npx tsc --noEmit -p tsconfig.json and only the vitest files the slice names (single-file runs). No e2e, no GPU, no npm run check (the lead sends the e2e to the laptop).
- Do not touch src/net, PROTOCOL_VERSION, the save shape, package.json, CHANGELOG.md, docs/marlow-final/STATE.md. Add one line to changes/feature-marlow-polish.md.
- Done: branch pushed; report at the end of this file (what changed with file:line, tsc result, test files with counts, deviations); status line "done feature/marlow-p2-ricochet-e2e <sha>".

## Report (Night Shift | Cloud Builder 1, 2026-10-23)
- Branch `feature/marlow-p2-ricochet-e2e` at 9a48f512, off a763ac39. Built by a Sonnet 5.5 agent, reviewed by Opus.
- `scripts/e2e-ctcourse/a3OfficeRange.mjs` (+26, nothing changed or removed):
  - :214-232 (A3 1b, after the host two-shot assert, before the kill): a GA read of the host's `security.ricochets`, then one GB evaluate that calls `g.weapons.onRay` along the camera axis through the client's mirrored `cam-a3-hall` (`g.ctDev.cams`). Asserts: the client's `ctDev.ricochets` +1 exactly, active `vfx.particles` rise, a second ray at `y - 1.5` leaves `ctDev.ricochets` unchanged (the teeth case), the host camera is still `online`, and the host `security.ricochets` is unchanged.
  - :186 and :472 (optional item 4): host asserts that `L2-far` / `L3-near` are unlocked (`GA` + `doorIndex`).
- `docs/marlow-final/slices/P2-2.md`: the slice report.
- `changes/feature-marlow-polish.md`: one line appended, as this brief says. POLISH-2's rules say the lead appends it instead, so drop the line if you would rather add it yourself.
- Checks: `node --check` ok; `npx tsc --noEmit -p tsconfig.json` exit 0. No vitest files apply (the slice changes none). No e2e run: `e2e-ctcourse:2` is still needed on the laptop.
- Deviations: none. No src change.
- Watch for: the two host door asserts are new reads. A failure there is a real finding, not a test error.
