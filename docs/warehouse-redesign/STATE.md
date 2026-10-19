# Warehouse redesign - state

**Now:** job started 2026-10-19 23:50 (BRIEF M1-M4). Step 1 done (a3664216, checker PASS); step 2 done (346ac584,
`REVIEW.md`); step 3 (`SPEC.md`, all 3 sections + a section 1 build sheet) running.
**Next:** (1) dog light fix + test, committed; (2) `REVIEW.md`; (3) `SPEC.md` for all 3 sections; (4) section 1
greybox, fresh checker, at most 1 fix round, `npm run check` + e2e-sectorops (laptop runner while the desktop lock is
held); push; walk guide to the orchestrator; (5) the PR to master by 06:00 (M4; greybox not stable by 05:00: the fix and the spec only),
the full `npm run e2e` on its head, a message to the orchestrator.
**Open:** the co-op client never draws any guard's flashlight (torch state is not on the wire; pre-existing, light
parity; for the orchestrator). Polish: calm guards read the light field each tick on dark maps (`check-step1.md`).

## Done
- 2026-10-19: branch `feature/warehouse-redesign` from master 3a07eee9 (4.7.5); node_modules junction (A1).
- 2026-10-19: step 1, dogs carry no flashlight (a3664216, `step1-report.md`): `torchWanted` never checked the kind, so a
  searching dog took a slot in World's flashlight pool; `carriesTorch` / `torchRule` in `ai/archetypes.ts`. Fresh
  checker PASS (`check-step1.md`): tsc, ESLint, 7 Vitest files 76/76. Step tier e2e on the job head later.

## Resume prompt
```
Night Shift | Warehouse Redesign. You are the job lead for the warehouse-redesign job (Sector Ops Warehouse level
overhaul, M1-M3; low priority: CT Core, then Course Ready, then this job). Work only in
C:\NightShift\Mobile-Coop-warehouse-redesign on branch feature/warehouse-redesign (git pull --ff-only first). Read
CLAUDE.md ("Sessions"), docs/ROADMAP.md, then docs/warehouse-redesign/STATE.md, BRIEF.md and the step docs it names.
Carry on from STATE "Now / Next" with an implementer and a fresh checker (docs/systems/session-method.md). Heavy runs
only under C:/NightShift/heavy.lock when higher priority jobs are not waiting; otherwise light commands only and send
suites to "Night Shift | Character Build" (branch, commit, suites). Push and report to "Night Shift | Orchestrator"
with a walk guide; the PR to master opens by 06:00 (M4).
```
