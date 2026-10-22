# anim-natural N4d - state

Job lead: Night Shift | Menu Notes Build. Branch `feature/anim-n4d` (C:/NightShift/Mobile-Coop-anim-n4d, from
feature/anim-n4c). Updated 2026-10-22 ~21:45.

Now (~21:55): built at 74cb0634; fresh checker PASS; desktop GPU run on 74cb0634 COMPLETE and green (below);
PR #142 open (stacked on #139).
Next: once #139 (train 9) merges, merge origin/master into feature/anim-n4d (the diff then shows n4d only); the
orchestrator puts #142 in a train.
Open: none.

## Checker (fresh Opus, ~22:00, on 74cb0634): PASS
tsc clean; eslint clean; Vitest 17 files / 255 tests pass.

## Polish list (checker, non-blocking)
1. courseMode.ts:641 / sectorMode.ts:173 call `takedown.reset()` only while a takedown is active: a bay restart or
   section unload within 0.31 s of a kill leaves the follow-through playing on the restarted player.
2. The tail ignores team moves, traversal attach, a carry pickup and the gun draw (the arm arc overlays them <= 0.31 s).
3. The tail runs at the nominal 0.7 / 0.5 s pace (ignores `handsMul` and per-kind blow lengths).
4. Remote: one lost snapshot can keep the grab kill's last seen phase under 0.85: no follow-through on the partner.
5. Remote: the tail plays over a committed-move replay that starts right after the kill (remoteAvatar.ts:399).
6. Pre-existing: remotes pose melee 0 instead of -1 during a choke or a lethal approach (the wire clamps -1 to 0).

## Done
- 2026-10-22 ~21:10: BRIEF, worktree, implementer started. ~21:40: implementer done (A1-A5 in BRIEF).

## Resume prompt
```
Night Shift | Menu Notes Build: anim-n4d RESUME. Read CLAUDE.md and docs/ROADMAP.md, then docs/anim-natural/n4d/BRIEF.md
and STATE.md in C:/NightShift/Mobile-Coop-anim-n4d (branch feature/anim-n4d). Resume at STATE "Next". Message
"Night Shift | Orchestrator" at each slice and PR.
```

## Desktop run on 74cb0634 (GPU, complete)
`npm run check` PASS 233 s (2825 tests). e2e (`E2E_GPU=1`, JOBS=2, 406 s, all ran to the end): e2e-takedown PASS 17 s,
e2e-anim PASS 39 s, e2e-coop PASS 84 s, e2e-netmove PASS 142 s, e2e-ctcourse PASS 266 s. Later commits: docs and the
master 4.58.1 merge (test scripts only).
