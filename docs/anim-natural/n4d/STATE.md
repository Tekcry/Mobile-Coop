# anim-natural N4d - state

Job lead: Night Shift | Menu Notes Build. Branch `feature/anim-n4d` (C:/NightShift/Mobile-Coop-anim-n4d, from
feature/anim-n4c). Updated 2026-10-22 ~21:45.

Now (~21:40, before the account swap): built at 74cb0634 (n4d on n4c 5f6a0d9d); fresh checker PASS. Desktop run
`npm run check` + GPU e2e (takedown, netmove, coop, anim, ctcourse) was running under heavy.lock ("Menu Notes Build |
n4d-e2e") at the save; its logs: C:/NightShift/n4d-check.log, n4d-build.log, n4d-e2e.log.
Next: read those logs (complete runs only count: every suite ran to the end and passed, on the GPU); if the run did not
finish, rerun it (heavy.lock or GPU lane 2 heavy2.lock / port 4192). Then merge origin/master (4.58.1+) and, once #139
(train 9) merges, master again; open the PR to master listing every suite with its result; message the orchestrator.
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
