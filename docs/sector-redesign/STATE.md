# sector-redesign - state

## Now (2026-10-23, after the clear; orchestrator trim: at most 2 agents)
- feature/sector-redesign d9a27c4f = slice 0 (b0b7bc24, checker PASS: docs/sector-redesign/checks/slice0-check.md) +
  slice L final (536c1355, protocol 31, A52) + M12 chokes (A60-A63, SPEC "Unavoidable posted guards (M12)").
- Slice 1: built (Sonnet), Opus checker PASS (checks/slice1-check.md), fix round done (A65 canopy hatch over the doorman + east downlights moved; A66 objective (19.3, -76); A67 voxel limit from map bounds; A68 campusOps off the op list until slice 3, #7 dormant, smoking shelter panel longer). Polish: CR1-south lip is one point; the 4.4 pavilion facade lip untested (planters 1.2 m off vs rule 3); SPEC calls the canopy light cuttable but its switch is in C1; wallX/wallZ quarter-turn boxes dropped by the Warehouse jump tests.
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

- FULL BURN (Michael ~07:55, via the orchestrator): 5 agents IN FLIGHT from 95097957 (master merged at f942df04): S2 builder (Sonnet, THIS worktree, brief briefs/SLICE2.md); S3 builder (Opus, feature/sector-redesign-s3, worktree -s3); E1 keypads EW5 (Opus, -e1); E3 pair bolt + pair gate EW3/EW4 (Opus, -e3); E4 isolator EW8 (Opus, -e4). Worktrees -s3/-e1/-e3/-e4 use a node_modules junction to this worktree. Each writes checks/<slice>.md; the lead commits each branch and merges into feature/sector-redesign. E2 glass (EW6) agreed split: Guard AI adds optional `glass?: 'clear' | 'frosted'` on BoxPiece (src/world/levelBuilder.ts:45) and the sight read (clear passes sight and the camera-body ray, frosted blocks; hearing treats both as a wall, 0.45), after its S3 integration. Ours (Menu Notes reviews): skip `glass` pieces in `canonicalLightShapes` (src/voxel/lightShapes.ts) so lamp light passes both kinds (picture, meter, guards read one field; marlow-final kit glass and windowAt panes already stay out), bullets per G45, and the campus data. Known gap: guard torch light through glass (meter blocked, picture passes). Build E2 once guard-ai's field lands. Slice 1 e2e (sectorops 1-6, coop, netmove, ctcourse; GPU 4189, heavy2.lock) running from dist/ built at 267b299f.

## Next
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
