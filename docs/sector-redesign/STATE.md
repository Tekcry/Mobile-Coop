# sector-redesign - state

## Now (2026-10-23, after the clear; orchestrator trim: at most 2 agents)
- feature/sector-redesign d9a27c4f = slice 0 (b0b7bc24, checker PASS: docs/sector-redesign/checks/slice0-check.md) +
  slice L final (536c1355, protocol 31, A52) + M12 chokes (A60-A63, SPEC "Unavoidable posted guards (M12)").
- Slice 1 BUILT (Sonnet 5.5, uncommitted -> committed after this line; report checks/slice1-build.md): campusOps registered
  (not listed), S1 full, S2-S5 stubs, 43 unit tests, e2e part 6 (`e2e-sectorops:6`). Checks: tsc 0, 77 vitest, eslint.
  camera-range PR #177 open (checker PASS); slice L checker PASS (checks/sliceL-check.md).
- LAPTOP d9a27c4f (GPU): vitest 3047 PASS; e2e-sectorops parts 1/3/4/5 PASS, **part 2 FAIL** (Warehouse solo team doors: "section 1 team door 0 (8,-10): unbolted, the doorway is open on the guards' nav grid {open:true,line:false}", then sections 2 and 3 "is live and has a team door" fail); coop, netmove, lightbake, levels, anchors PASS. Logs C:/NightShift/scratch/runs/sectorredesign-d9a27c4f/ (laptop). Suspect slice 0 (327ed8be / 4d09bcf2: restart reset of doors or sectors.ts) vs the r2-nav bolt nav-line closure: an Opus fix agent (first job when unpaused), then e2e-sectorops:2 solo rerun on the laptop.
- PAUSED by the orchestrator (TRIM 3, 02:11): no checker, no agent until it messages (~04:00).
- Slice 1 open items for the checker / fix round (Opus): (1) objective moved to (19.3, -76) for the 1.8 m reach;
  (2) CR1 drop takedown impossible (doorman 5-6 m inside the canopy lips under a solid slab): design call, likely move
  the post to the canopy's east edge or open a soffit gap (log as A64); (3) builder edited rooms / detailPass / voxelFit
  tests to pass a 154 x 154 m voxel grid vs a 110 limit: check it is not a real budget break (A20 load budget);
  (4) campusOps shows in the Sector op list now (sectorOps() filters MAPS, ignores LISTED_MAP_IDS): must hide until
  slice 3; (5) part 6 only as `e2e-sectorops:6`; (6) M8 isolation exceptions for pairs #1/#2, #3/#4; (7) wallX/wallZ
  quarter-turn boxes are dropped by the Warehouse jump tests (latent gap there).
- Laptop (Character Build, 4192 GPU): (1) sector-redesign d9a27c4f vitest + sectorops/coop/netmove/lightbake/levels/
  anchors; (2) camera-range 8fda08b9 security/ctcourse/sectorops/coop. Waiting on verdicts.
- Guard AI Build agreed the data shapes: `post: { leash, highSecurity?, guards }` and `profile` on SquadSlot (guard-ai
  S5); guard-ai adds `noisy?` / `entries?` to SectorDef; a lured posted guard looks >= 5 s (guard-ai A12); protocol
  32 is theirs. Until `post` lands, campus data uses `CAMPUS_POSTS`.
- Slice L agent note: tests/sectors.test.ts "sections 1-3 A2 survive patrol phase drift" failed on its old base;
  passes on this branch (slice 0 checker 54/54).

## Rules after the reset (Michael 01:45 "Lean windows", via the orchestrator)
- Each 5-hour window to 99%, lean, no quality loss: no new agent at 97%, save at 98%, stop by 99%; a cron resumes the
  session after each reset. Max 3 agents (desktop CPU).
- Opus plans, writes strict slice briefs (exact files, line ranges, acceptance, tests), reviews, and runs every fresh
  checker. Sonnet 5.5 builds from those briefs (section greyboxes, guard / camera / laser placement data, e2e routes);
  Haiku 5.5 for chores. Engine work (slice L protocol 31, camera-range, slice-0 engine items) stays Opus. A failed
  Sonnet slice gets its fix round from Opus.

## Next
0. FIRST at resume (orchestrator): #177 camera-range out of train 17. e2e-security pan pad light: master 1.00 (its spot x 14), branch 0.60 at x 16, 0.84 at x 15. Find why: compare the SAME spot on both (branch at x 14, master at x 16/15); check the dark-corner block's lamp off/restore loop (`for (i=0; reg.get(i); i++)` + setOn restore) leaves no lamp off or state changed; check the diff for any lamp / IR / cone mesh / occluder / light field change. A real light change = light-parity fix; a spot gradient = state it in the PR body with the numbers.
0b. Then the e2e-sectorops:2 fix agent (Opus).
1. Slice 1: Opus checker (with the open items above), laptop e2e-sectorops (campus part 1) + e2e-coop,
   one fix round at most; then message the orchestrator (slice 1 on the branch).
3. camera-range: checker verdict + laptop pass -> PR to master (orchestrator train); message the orchestrator.
4. Slice 2 brief (S2 + K2) for Sonnet; needs EW13 (origin/feature/g44-above, #169 in train 16).
5. Green slices go to master in a train (Michael: "Merge to master").
Polish (not blocking): slice0-check.md (EMP-on-restart lamp edge case and five notes).

## Done
- 2026-10-23 ~01:45: branch cut, BRIEF (M1-M5).
- ~02:45 (orchestrator): guard BEHAVIOUR (src/ai: perception, alert, hearing, squads, radio, reinforcement behaviour, posts) belongs to the new job guard-ai (Night Shift | Guard AI Build); sector-redesign owns map data + sectorMode (placement, archetype per guard, dog allowance, post / zone tags as data, restart resets, camera cap). Data requests for guard-ai: end of research/ENGINE.md. Protocol 31 is sector-redesign's (Sector light sync); guard-ai takes 32. Guard-cap perf run requested on the laptop by the orchestrator.

## Resume prompt
```
Night Shift | Course Ready Build: RESUME (cleared session). Job: sector-redesign (lead), branch feature/sector-redesign,
worktree C:/NightShift/Mobile-Coop-sector-redesign. git fetch, then read: CLAUDE.md and docs/ROADMAP.md (origin/feature/menu
for the live "Decided"); docs/sector-redesign/BRIEF.md (Michael M1-M11, assumptions A1-A45), STATE.md (this file: Now,
Rules after the reset, Next, MORNING-REVIEW), PLAN.md and SPEC.md, all on origin/feature/sector-redesign. Other open
items are in docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays (PRs #169 g44-above and #176 sw-reload in
the orchestrator's train 16: post the laptop rerun of sw-reload 0a34662b on #176 when Character Build replies).
In flight at the save: see STATE "Now" (check each branch log; an agent from the old session is gone, so rerun its slice from its brief or PLAN.md if its work is not committed). Carry on from "Next" under "Rules after the reset" (99% windows, max 3 agents,
Opus briefs / checks, Sonnet 5.5 builds greyboxes, Opus for engine work). Michael is asleep: log assumptions, no
question dialogs. Every e2e is E2E_GPU=1 and goes to Night Shift | Character Build on the laptop. Report to
"Night Shift | Orchestrator" at each slice and PR.
```
