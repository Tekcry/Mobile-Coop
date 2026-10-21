# anim-gear - state

## Now
PAUSED (orchestrator pacing, 00:40): implementer done (REPORT.md: check and e2e-studio, e2e-anim, e2e-weapons-carry pass), no checker yet. Waiting: the orchestrator's OK for `src/weapons/weaponModel.ts` (31 lines, the per-frame gear placement). Then the checker, merge master once #90 lands, full e2e on the laptop, PR.

## Next
1. Implementer (one slice): the Gear section, the rig hooks, the pouches, the bake into `animBase.ts` `gear`, tests.
2. Fresh checker, one fix round; merge master once #90 lands; full e2e on the laptop; PR.
3. Follow-up after T3: worn goggles through track C's hook.

## Done
- 2026-10-21 22:55: branch from `feature/anim-joints` 9c083d60; BRIEF, STATE.

## Resume prompt
```
Night Shift | CT Core Build: anim-gear RESUME. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-gear/BRIEF.md and
STATE.md in C:/NightShift/Mobile-Coop-anim-gear (branch feature/anim-gear; branch guard before every write). Resume
from STATE "Now": implementer + fresh checker, one fix round. Check get_usage before each agent; pause at 97%. Message
"Night Shift | Orchestrator" at the PR. Model Opus, effort high.
```
