# Warehouse redesign - state

**Now:** PAUSED 2026-10-20 00:45 (Michael via the orchestrator: movement is the only focus tonight; usage limit; no PR
tonight). Step 1 done (a3664216, checker PASS); step 2 done (`REVIEW.md`); step 3 `SPEC.md` is a DRAFT (stopped early):
the building, section 1 design, engine fit and loosenings L1-L11 are done; the section 1 build sheet is mostly done
(climbs indices in R2/R3 and levelBuilder signatures unchecked); sections 2 and 3 are outline only.
**Next:** (1) the job lead decides SPEC "Decisions": C1 (sectorCheck: a takedown spot passes when unseen or the guard
is alone 3 s on its timed patrol), N1 (sectorMode.ts:310 passes per-point waits and facings), section 1 start moved to
(-20, -24.6), 8 guards in section 1, heavies / sniper left in sections 2-3 against G155 until rebuilt; (2) section 1
greybox (implementer on Sonnet from the build sheet, fresh Opus checker, at most 1 fix round, `npm run check` +
e2e-sectorops); (3) push, walk guide and the PR to master (dog fix + spec + greybox) when the orchestrator says;
the full `npm run e2e` on its head.
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
