# Warehouse redesign - state

**Now:** section 1 greybox built (5371c537), fresh checker PASS (`check-step4.md`), one fix round (2dba40b2): the DVR
stand point clear of the door and guard 4 (the e2e-sectorops download fail on 5371c537), cabinet under the hatch, roof
strips, guard 8's window, the time model matches the game. `npm run check` passed on 5371c537 (176 files, 1943 tests).
SPEC final (defe864a). Walk guide `WALK.md`.
**Next:** (1) e2e-sectorops (and the step suites) on the fix-round head, through the orchestrator to the laptop, or
the desktop when its lock is free and CT Core is not waiting; (2) a failure in the fix: the step is OPEN with the
evidence; (3) PR #37 open (head 5392f6d5, laptop passed 0017294d); the full e2e on its head via the orchestrator; then sections 2 and 3 from SPEC 2.2 / 2.3.
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
