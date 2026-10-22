# sector-redesign - state

## Resumed (2026-10-23 ~08:40, new account)
- #184 part 1 MERGED (master 4.68.0, train 19). Every in-flight item was committed and pushed before the swap: S2 f5422070
  (this branch), S3 66287baa (-s3), E5 417c7560 (-e5), int b71a9894 (-int). No reruns needed.
- Running: 3 Opus checkers (S2 -> checks/slice2-check.md here, S3 -> -s3 checks/slice3-check.md, E5 -> -e5 checks/e5-check.md).
  Cap 3 agents (orchestrator). Window: 0% at 08:35, resets 13:30, pace to ~99%.
- Laptop runs go to "Night Shift | Character Build [06fe56]" ([d57b71] is stale); its queue: #186 ctcourse, train 20, then ours.

## Now (2026-10-23 ~08:15, SAVED at ~80% for Michael's account swap)
- PR #184 (part 1 = slices 0 + L + 1) open from feature/sector-redesign-p1 @ d21399f5, in train 19 with #180 (orchestrator).
  All checkers PASS; GPU e2e green on 267b299f. campusOps registered, not listed.
- feature/sector-redesign (this worktree) @ 2dc95081 + uncommitted S2 work: master merged at f942df04.
- Engine branches, each built + Opus checker PASS + one fix round, pushed:
  - E1 keypads (EW5): feature/sector-redesign-e1 @ 0986b109 (checks/e1-keypads.md, e1-check.md).
  - E3 pair bolt + pair gate (EW3/EW4): feature/sector-redesign-e3 @ ae6131ca (no fix round needed).
  - E4 breaker / isolator boards (EW8): feature/sector-redesign-e4 @ 4aa0a462.
- IN FLIGHT at the save (agents die with the session; WIP snapshots pushed as refs wip/sector-redesign-<x>):
  - S2 BUILT on feature/sector-redesign (this commit; checks/slice2-build.md, L1-L19; 39 new tests, 122 + 147 related pass; e2e part 6 extended, not run). A64 worst 5. Owed: Opus checker (A69: CR2 east edge; lip list pushed at module load -> join in one place; #9 clocks only the SW door + lift lobby; #5-6 M8 exception; C2 bridge dead-ends until the S3 merge moves C2 far door to (10, 4.5, -14)).
  - S3 BUILT: feature/sector-redesign-s3 @ 66287baa (checks/slice3-build.md; 32 new tests, 236 related pass; e2e block written, not run). Owed: Opus checker; at merge join S3_COOP_LIPS into CAMPUS_COOP_LIPS (L1), move C2 far door to the S2 L1 bridge landing (10, 4.5, -14) (L13); A64 worst view exactly 6 at (51, 6, -29).
  - E5 alarm-stage actions BUILT: feature/sector-redesign-e5 @ 417c7560 (checks/e5-stage-actions.md; 58 tests); owed: Opus checker, then merge into int.
  - Integrator DONE: feature/sector-redesign-int @ b71a9894 (pushed) = E3 + E1 + E4, one shared nav-closure helper (SectorTeamDoors.navClosure), 233 tests pass (checks/int-e1-e3-e4.md). Merge this branch (not e1 / e3 / e4 separately) into feature/sector-redesign.
  On resume: for each, check the worktree's `git status` / the branch log; if the agent's report file exists and checks
  pass, commit; else rerun that agent from its brief (S2: briefs/SLICE2.md; S3 / E5 / int: the prompts are summarised
  in this file's "Next").
- Agreed with peers: Guard AI types (post, noisy, entries, glass) on feature/guard-ai 971711c4, to master after #185;
  glass split (guard-ai sight; ours: skip glass in canonicalLightShapes; Menu Notes reviews). Client switch press was not
  a bug (Menu Notes S-switch.md).
- Guard-cap: render-bound (24 awake ~17 fps at Epic); A64 keeps <= 6 awake on screen + `dormant` tags; Character Build
  builds guard-render.

## Rules after the reset (Michael 01:45 "Lean windows", via the orchestrator)
- Each 5-hour window to 99%, lean, no quality loss: no new agent at 97%, save at 98%, stop by 99%; a cron resumes the
  session after each reset. Max 3 agents (desktop CPU).
- Opus plans, writes strict slice briefs (exact files, line ranges, acceptance, tests), reviews, and runs every fresh
  checker. Sonnet 5.5 builds from those briefs (section greyboxes, guard / camera / laser placement data, e2e routes);
  Haiku 5.5 for chores. Engine work (slice L protocol 31, camera-range, slice-0 engine items) stays Opus. A failed
  Sonnet slice gets its fix round from Opus.

- FULL BURN (Michael ~07:55, via the orchestrator): 5 agents IN FLIGHT from 95097957 (master merged at f942df04): S2 builder (Sonnet, THIS worktree, brief briefs/SLICE2.md); S3 builder (Opus, feature/sector-redesign-s3, worktree -s3); E1 keypads EW5 (Opus, -e1); E3 pair bolt + pair gate EW3/EW4 (Opus, -e3); E4 isolator EW8 (Opus, -e4). Worktrees -s3/-e1/-e3/-e4 use a node_modules junction to this worktree. Each writes checks/<slice>.md; the lead commits each branch and merges into feature/sector-redesign. E2 glass (EW6) agreed split: Guard AI adds optional `glass?: 'clear' | 'frosted'` on BoxPiece (src/world/levelBuilder.ts:45) and the sight read (clear passes sight and the camera-body ray, frosted blocks; hearing treats both as a wall, 0.45), after its S3 integration. Ours (Menu Notes reviews): skip `glass` pieces in `canonicalLightShapes` (src/voxel/lightShapes.ts) so lamp light passes both kinds (picture, meter, guards read one field; marlow-final kit glass and windowAt panes already stay out), bullets per G45, and the campus data. Known gap: guard torch light through glass (meter blocked, picture passes). Build E2 once guard-ai's field lands. Slice 1 e2e at 267b299f (desktop, GPU 4189, JOBS=1, 08:04): e2e-sectorops 1-6 (incl. campus S1), e2e-coop, e2e-netmove, e2e-ctcourse 1-3 ALL PASS. E1 keypads 34973765 and E4 isolator 21528f35 built and pushed, Opus checkers running.

- PR #184 (part 1: slices 0 + L + 1) from feature/sector-redesign-p1 @ d21399f5, train 19 with #180 (orchestrator). Slices 2-3 + E items go in a second PR from feature/sector-redesign.

- Guard AI types on feature/guard-ai 971711c4 (types only; to master with its PR after #185): SquadSlot `post?: PostDef` / `profile?`, SectorDef `noisy?` / `entries?`, BoxPiece `glass?` (levelBuilder.ts:61); src/ai/posts.ts (POST.lureLook 5 s, lureSweep 0.6 rad), src/ai/guardAiData.ts (validateGuardAi / validatePosts). When it lands on master: merge master, move CAMPUS_POSTS onto each slot's `post`, call validatePosts in the campus tests, then build E2 (skip glass in canonicalLightShapes).

## Next
1. Collect the in-flight work above (S2, S3, E5, integrator). S3 builder prompt: build S3 like briefs/SLICE2.md (SPEC S3,
   16 guards, las-gown / las-store with near-side panels, CR3, no choke, A64 screen count), only campusS3.ts, the S3
   block of campusSectors.ts / campusOps.ts, tests/campusS3.test.ts, an appended e2e block in part 6. E5 prompt:
   `stageActions` on SectorDef (lightsFull, lockDoors never softlocking, responseRoute, releaseDogs stub), restart
   undoes, tests/sectorStageActions.test.ts, no protocol change.
2. Opus checkers for S2 and S3 (one fix round each), then merge S2 + S3 + int (E1/E3/E4) + E5 into feature/sector-redesign;
   tsc + campus / sector tests; then laptop GPU e2e (sectorops 1-6, coop, netmove, ctcourse).
3. Slice 3 end: list campusOps (remove the A68 filter in missionsScreen.ts, add to LISTED_MAP_IDS as PLAN says), PR 2
   (slices 2-3 + E1/E3/E4/E5) to master; message the orchestrator.
4. When guard-ai's types reach master: merge master, CAMPUS_POSTS -> slot `post`, validatePosts in campus tests, E2 glass.
5. Slices 4-5 (S4 data hall + first dog; S5 Old House) need guard-render (dormancy / LOD) for 20 / 24 guards; E6
   security desk (EW10).
Polish: slice0-check.md, sliceL-check.md, slice1-check.md, e1/e3/e4-check.md polish lists.

## Done
- 2026-10-23 ~01:45: branch cut, BRIEF (M1-M5).
- ~02:45 (orchestrator): guard BEHAVIOUR (src/ai: perception, alert, hearing, squads, radio, reinforcement behaviour, posts) belongs to the new job guard-ai (Night Shift | Guard AI Build); sector-redesign owns map data + sectorMode (placement, archetype per guard, dog allowance, post / zone tags as data, restart resets, camera cap). Data requests for guard-ai: end of research/ENGINE.md. Protocol 31 is sector-redesign's (Sector light sync); guard-ai takes 32. Guard-cap perf run requested on the laptop by the orchestrator.

## Resume prompt
```
Night Shift | Course Ready Build: RESUME (cleared session / new account). Job: sector-redesign (lead), branch
feature/sector-redesign, worktree C:/NightShift/Mobile-Coop-sector-redesign. git fetch, then read: CLAUDE.md; docs/ROADMAP.md
(the live "Decided" is on origin/feature/menu); docs/sector-redesign/BRIEF.md (Michael M1-M12, assumptions A1-A68),
STATE.md (Now, Rules after the reset, Next), PLAN.md, SPEC.md and briefs/, all on origin/feature/sector-redesign.
PR #184 (part 1) is in the orchestrator's train 19. In flight at the save: STATE "Now" lists each agent, its worktree,
branch and WIP ref (wip/sector-redesign-<x>); the agents are gone, so collect what is committed / reported and rerun
the rest from its brief or the prompt summary in "Next". Agent count and pacing: as the orchestrator says (it messages
after the swap). Opus plans, writes strict briefs and runs every checker; Sonnet 5.5 builds map greyboxes / data / e2e
routes; Opus for engine work; one fix round per slice. Michael may be asleep: log assumptions, no question dialogs.
Every e2e is E2E_GPU=1, on Night Shift | Character Build (laptop) or, when it is down, the desktop second lane
(heavy2.lock, port 4189 or 4192). Report to "Night Shift | Orchestrator" at each slice end, PR or blocker.
```
