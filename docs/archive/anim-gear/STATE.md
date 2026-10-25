# anim-gear - state

## Now
Checker PASS (CHECK.md, 00:53; check, e2e-studio, e2e-weapons-carry, e2e-anim). After it: the `pouches` and
`slingBack` sockets dropped (nothing visible moves with them; orchestrator ~00:45 for pouches, slingBack by the same
rule, the checker's polish 1); e2e-studio rerun. Waiting on #90's merge (this branch is cut from J2), then master
merged in, the full e2e on the laptop, the PR (name `src/weapons/weaponModel.ts`, approved ~00:45).

## Next
1. #90 merges; merge master; full e2e on the laptop; PR.
2. Follow-up after T3: worn goggles through track C's hook (`GOGGLE_OFFSET`, read per rig by `goggleFrame()`).

## Polish (non-blocking, from the check)
- While any offset is live, every crouch change bumps the gear version even with no crouch rows set: carried guns and
  the hip sling node re-place each frame of a crouch blend (cheap; bump only when the output changes).
- If `tuneRows` were switched off while a sling-node offset is on, the node keeps its offset (nothing toggles it).
- e2e-studio covers the holster and slingHip only; the back slots rely on the unit pivot maths.
- A gun holstered on rig A then held by rig B leaves a no-op hook on A (no caller does this).

## Done
- 2026-10-22 01:10: pouches and slingBack sockets dropped; e2e-studio rerun ok (120 s, every gear check).
- 2026-10-22 00:53: checker PASS (CHECK.md).
- 2026-10-22 00:40: implementer (5acccaa4): the Gear section, per-rig gear state, the base table key `gear`, the bake,
  `weaponModel.ts` placement hooks, tests (REPORT.md).
- 2026-10-21 22:55: branch from `feature/anim-joints` 9c083d60; BRIEF, STATE.

## Resume prompt
```
Night Shift | CT Core Build: anim-gear RESUME. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-gear/BRIEF.md and
STATE.md in C:/NightShift/Mobile-Coop-anim-gear (branch feature/anim-gear; branch guard before every write). Resume
from STATE "Now": implementer + fresh checker, one fix round. Check get_usage before each agent; pause at 97%. Message
"Night Shift | Orchestrator" at the PR. Model Opus, effort high.
```
