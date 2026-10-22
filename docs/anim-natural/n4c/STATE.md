# anim-natural N4c - state

Job lead: Night Shift | Menu Notes Build. Branch `feature/anim-n4c` (C:/NightShift/Mobile-Coop-anim-n4c, from master
4.57.0 703b5063). Updated 2026-10-22 ~20:10.

Now: two Opus implementers in parallel on disjoint code (uncommitted in the worktree):
1. Hand swap muzzle path (AUDIT row 29): `characterRig.ts` hand blend.
2. Elbow strike body (AUDIT row 49): `animGraph.ts` melee block, `strikeController.ts`.
Next: commit, fresh checker, one fix round at most, laptop suites (`npm run check`, e2e-anim, e2e-ctcourse, e2e-coop,
e2e-netmove: src/player changed), GPU sheet rows (hand-swap-shoulder, wall-edge-left, elbow-strike-guard) on the laptop,
PR with `changes/feature-anim-n4c.md`.
Open: none.

## Done
- 2026-10-22 ~20:05: BRIEF, worktree, implementers started.

## Resume prompt
```
Night Shift | Menu Notes Build: anim-n4c RESUME. Read CLAUDE.md and docs/ROADMAP.md, then docs/anim-natural/n4c/BRIEF.md
and STATE.md in C:/NightShift/Mobile-Coop-anim-n4c (branch feature/anim-n4c; git status / diff for uncommitted
implementer work). Resume at STATE "Next". Check the 5-hour meter before each agent. Message "Night Shift | Orchestrator"
at each slice and PR.
```
