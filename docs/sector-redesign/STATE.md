# sector-redesign - state

## Now (2026-10-23 ~11:00, third window after the account swap)
- feature/sector-redesign @ b0fd3edf (pushed): + the part-6 lights-out fix found uncommitted from 10:43 (a wall switch
  going dark lures a guard from its own floor only: EnemyManager.lightsOut(x, z, y), LIGHTS_OUT_FLOOR 2,
  tests/enemyLightsOut.test.ts 2/2; the S2 reception panel was luring #4 off the L2 balcony). The 3796700d part-6
  verdict was not found (Character Build is not running); assumed red on the lights-out lure.
- e2e-sectorops:6 GPU at b0fd3edf: PASS 152 s (desktop 4191; S1-S3 legs, all S3 probes, no console errors).
- PR 2 prep: master (4.70.0, guard-ai S2-S5) conflicted in 4 files, merged on feature/sector-redesign-m @ 57a1dbc6
  (worktree -m; kept off the lead worktree while the E9 planner commits there). lightsOut: guard-ai's coordinated
  incident path wins; our floor filter lives in the uncoordinated rule. tsc clean, 26 related files 380 tests pass.
  RUNNING: build + e2e-sectorops:6 + full vitest + lint at 57a1dbc6 (log scratch/runs/sectorredesign-57a1dbc6).
  Green -> fast-forward feature/sector-redesign to -m, open PR 2, message the orchestrator.
- Guard-ai types are on master now: Next 4 (CAMPUS_POSTS -> slot post, validatePosts, E2 glass) is unblocked.
- Orchestrator ~11:00: no mid-window clears (clear only past ~50% context); Gmail / Drive / Fergus connectors off.
- S4 DONE (Sonnet): feature/sector-redesign-s4 @ ebbd5789 (checks/slice4-build.md). S5 DONE: -s5 @ f546db0d
  (checks/slice5-build.md). Data only, no nav code.
- E8 DONE: -e8 @ 9fbd18c2 (checks/e8-cameras.md; 106 tests in 6 files; ricochet scratch vectors). Owes an Opus
  checker (batch it with E9's engine part). At the S4 / S5 merge: `bulletproof: true` on every S4 camera,
  `bulletproof: true, thermal: true` on every S5 camera, drop their side tables, extend the "campus armour ramp" test.
  Gap (wire change): a co-op client sees no ricochet sparks for its own shot.
- S4 + S5 check (checks/slice45-check.md, 4d009c4b): S4 PASS, S5 FIX (M8 exceptions beyond the 4 brief pairs),
  merge-join J1-J4. IN FLIGHT: Opus fix + integrator: S5 M8 fix on -s5, then feature/sector-redesign-s45 off -m
  (worktree -s45) = -e8 + -s4 + -s5, J1-J4, E8 flags on S4 / S5 cameras; report checks/merge-s45.md. Then lead:
  GPU part 6 on -s45, PR 3 (S4 / S5 / E8) after PR 2.
- E9-crate brief DONE: briefs/E9-CRATE.md (ce574d71, A99-A109). PROTOCOL 35 (orchestrator ~11:25; registry 31 master,
  32 guard-ai, 33 marlow-final, 34 hang-down; renumbering at train build is the orchestrator's). IN FLIGHT: Opus part (a)
  engine + net on feature/sector-redesign-e9 off -m (worktree -e9, checks/e9-engine.md). Was: needs a number (NetItem kind 'crate' + event
  'crate'); asked the orchestrator ~11:20. Build (a) Opus engine + net, then (b) Sonnet crate model / placement / tests.
- (done) Opus E9-crate planner -> briefs/E9-CRATE.md (commits only that file). On resume: check each file / branch; rerun if
  missing.

- Swap rule (Michael 10:55, via the orchestrator; CLAUDE.md "Account swap" on feature/menu): at 95% no new agents,
  finish those in flight, queue long runs; save by 98%; small work to 100%; Michael swaps at 100%. The orchestrator
  messages at 95%.

## Now at ~10:20 (superseded)
- feature/sector-redesign @ 88f5c33a+ (pushed) = the 09:50 state + part-6 fixes + campusOps listed + ammo removal + S4 / S5
  briefs. Commits since 22e755bf: 7c2087ee part 6 fix (S3 SW stair half-landing collision lip campusS3.ts:350, navBuild
  `navGridFromLevel`, tests/campusRuntimeNav.test.ts runs the e2e leg check on the runtime grid; checks/part6-fix.md);
  c92fc53b e2e camera count 7; 07c96701 e2e moves the frozen S2 facilities officer off the BMS hack spot
  (checks/part6-fix2.md); 25f22a9c campusOps listed (A68 filter gone, LISTED_MAP_IDS); 5a8973e6 briefs/SLICE4.md +
  SLICE5.md, A78-A98; 88f5c33a no ammo inside sections on every map + src/world/mapCheck.ts checkMapLayout +
  tests/noAmmoPickups.test.ts (checks/no-ammo-build.md).
- e2e verdicts (all GPU): laptop 22e755bf e2e-coop PASS 66 s, e2e-netmove PASS 171 s. Part 6 at c92fc53b: all passed
  (S1 40 + S2 71 + S3 99 legs, every S3 probe) except the C2 hack (stale test, fixed 07c96701). The 07c96701 run was VOID
  (the laptop's dist was another branch's). PENDING: Character Build runs e2e-sectorops:6 at 3796700d (= PR 2 head, fresh
  build) on 4192, verdict ~10:45; it goes to this session and the orchestrator.
- IN FLIGHT: Sonnet S4 builder (worktree C:/NightShift/Mobile-Coop-sector-redesign-s4, branch feature/sector-redesign-s4)
  and Sonnet S5 builder (-s5), both from 5a8973e6, told to commit + push WIP per step and keep checks/slice4-build.md /
  slice5-build.md current. On resume: check each branch log and build file; rerun a builder from its brief if unfinished.
- IN FLIGHT (~10:45, after the save, orchestrator "keep working to 99%"): Opus E8 builder (bulletproof / thermal camera
  flags, S3 cam-view bulletproof) on feature/sector-redesign-e8 (worktree -e8, pushes per step, checks/e8-cameras.md);
  Opus E9-crate planner writing briefs/E9-CRATE.md (commits + pushes only that file). On resume: check both; rerun if
  missing.
- Desktop lane: heavy.lock was held by CT Core / Menu Notes all morning; send part 6 to Character Build.
- Token rules (orchestrator ~10:00, CLAUDE.md "Heavy-usage throughput" on origin/feature/menu): message the orchestrator
  only at PR open / train-ready / blocked / needs Michael; progress lives here; save at ~25-30% context; one checker per
  batch (Sonnet checks S4 + S5 greybox / data together, Opus checks nav / net code); no polling turns; merge master into
  this branch only when PR 2 is about to go to a train.
- Stealth over shooting (Michael ~10:10 / ~10:15 / ~10:20): PLAN E8 (bulletproof / thermal cameras), E9-crate
  (between-section weapons crate, once per player; no in-section ammo, done), E10 (armoured routes with a quiet bypass).
  Guard AI owns helmets, armour, response teams.
- Backlog note: `LevelBuilder.ramp` end-cap error (collision slab lowered vertically only; a one-cell-wide flight can
  lose a nav cell; fixing it moves every map's ramps). Plus the 09:50 polish list below.

## Next (in order)
1. Part 6 verdict at 3796700d (Character Build). Green -> PR 2 (feature/sector-redesign -> master: slices 2-3, E1 / E3 /
   E4 / E5 / E6, lips, part-6 fixes, campusOps listed, no in-section ammo). Area suites: coop + netmove green at 22e755bf
   (E6 touched src/net/coopClient.ts; nothing in src/net since); part 6 on the PR head or in the train. Merge master in
   just before the train. Message the orchestrator when PR 2 opens. Red -> one Opus fix round, rerun part 6.
2. Collect the S4 / S5 builders. Then ONE Sonnet checker for S4 + S5 data / greybox together (Opus on any nav code); one
   fix round each; merge -s4 / -s5 into feature/sector-redesign (lead joins campusOps.ts / campusSectors.ts / test
   counts / e2e / changelog per SLICE4.md's merge table). First S4 / S5 part-6 run on the laptop; the first part-6
   asserts must count cameras / guards per section (13 cameras after S4 / S5).
3. Opus plans E9-crate (net part first: per-player use on the host; ask the orchestrator for a protocol number if a
   wire change is needed), Sonnet builds; then E8 camera flags (Opus, small); E10 after E2.
4. When guard-ai's types reach master: merge master, CAMPUS_POSTS -> slot `post`, validatePosts in campus tests, E2 glass.
   When guard-render lands: lift the A64 cap for S4 / S5 (20 / 24 guards).
5. Campus detail art (Michael ~10:40 "add the full detail-art lift of campus as efficiently as possible"; G278 covers
   campusOps, ROADMAP fdf10e28) after the S4 / S5 greybox: Opus plans a shared instanced prop / material kit (reuse
   marlow-final pieces), rule-based base dressing by room tag, hero sets only in the atrium, lab block, data hall, Old
   House strongroom and gatehouse; Sonnet dressers in parallel; one Opus checker per batch (props keep routes / cover /
   nav); one GPU perf pass.

## History: the 09:50 save (superseded by "Now" above)
- feature/sector-redesign @ 22e755bf = master 4.68.0 + S2 + S3 + int (E1 keypads, E3 pair bolt / gate, E4 isolator
  boards) + E5 alarm stages + lips join + E6 security desk. tsc + 192 campus / sector tests pass.
  Checkers: S2 PASS; S3 FIX -> fixed (A70 spandrel 6.2, A64 test rewritten, worst 6); E5 FIX -> fixed (door-side legs,
  doorway-clear wait); E6 FIX -> fixed (deskSec follows the loaded section). Reports: checks/slice2-check.md,
  slice3-check.md, e5-check.md, e6-check.md, merge-e5.md, lips-join.md. BRIEF up to A77.
- Side branches (all pushed, all merged into feature/sector-redesign): -s3 2ee011be, -e5 5c553f0b, -int b71a9894,
  -lips 3b56426e, -e6 79236f87 (worktrees C:/NightShift/Mobile-Coop-sector-redesign-<x>, node_modules junctions).
- e2e (all E2E_GPU=1): e2e-sectorops 1-5 PASS (desktop, b550cc2a, 322 s). Runner gap fixed: scripts/run-e2e.mjs PARTS
  now lists sectorops part 6 (campus), 4def7d24. Laptop (Night Shift | Character Build [06fe56], port 4192):
  RAN at 4def7d24 (verdict below): e2e-coop, e2e-netmove, e2e-ctcourse, e2e-sectorops:6 (first run of the S2 / S3
  campus routes); QUEUED e2e-coop + e2e-netmove at 22e755bf (E6 touches src/net/coopClient.ts) after guard-render S1
  and guard-ai-s5. Verdicts go to this session + the orchestrator: on resume ask Character Build for them.
- LAPTOP VERDICT 22e755bf (GPU, 4192, 10:0x after the swap): e2e-coop PASS 66 s, e2e-netmove PASS 171 s (log
  C:/NightShift/scratch/runs/sectorredesign-22e755bf on the laptop). After the swap: Opus part-6 fixer and Opus S4 / S5
  brief planner running in this worktree (checks/part6-fix.md, briefs/SLICE4.md + SLICE5.md).
- LAPTOP VERDICT 4def7d24 (GPU, 4192): e2e-coop PASS 133 s, e2e-netmove PASS 182 s, e2e-ctcourse 1-3 PASS; e2e-sectorops:6
  FAIL (93 s, log C:/NightShift/scratch/runs/sectorredesign-4def7d24 on the laptop), two asserts, both stale e2e
  expectations / the S3 merge, not S1-S2 play: (a) "five sections ... the other stubs none" expects s3 = 0 guards; S3
  is built (16): update the part-6 assert to [s1 8, s2 12, s3 16, s4 0, s5 0]. (b) "every walked S3 route leg has a nav
  path" fails at leg 4 of all three routes = S3_ENTRY's [14, -23, S3_L1] -> [13.3, -27.4, 2.25] (the north stair from
  the L1 bridge landing down to the hall, added at the merge per the S3 checker's note 7): the real nav grid has no
  path there. Fix (Opus, one round): check the north stair's actual landing / flight points in campusS3.ts (the stair
  S3 already uses for its L1 routes, e.g. [40.6, -1.1, 2.25]) and route S3_ENTRY over a stair that exists from the
  (10, L1, -14.6) door, or add the missing L1 landing -> stair link; then rerun e2e-sectorops:6 (GPU) on a desktop lane
  or the laptop. Unit tests passed because analyticNav differs from the runtime grid here.
- LOST at the save: the Opus planner writing briefs/SLICE4.md + SLICE5.md (it had written nothing). Rerun it from
  "Next" 1.
- Polish list adds: A77 kp-fac can be built now (E1 merged); S3 R1-R4 (CR3 payoff, clean-room reason, #1 soft choke,
  CR3 / leg-up e2e probes); S2 checker polish 1-7; K2 landing downlight; lamp 58 switch; E5 polish (lightsFull vs a
  running isolator window); E6 polish 1, 3, 4 (128-item cap assert, client refusal message, SecurityDesk type into
  security/data.ts); E6 e2e not written (window.__sector.useDesk(i), debug().desks ready).
- Orchestrator rules: as many agents as the work splits into unless desktop CPU > 90% (it messages trims); push WIP +
  refresh this file after every hand-back; desktop lanes (heavy.lock 4191 / heavy2.lock 4192) only for single GPU
  suites when CPU allows; coop / netmove / ctcourse on the laptop. Opus plans / checks / engine; Sonnet builds sections
  from strict briefs; Haiku chores.

### Next at 09:50 (superseded)
0. FIRST: fix e2e-sectorops:6 per "LAPTOP VERDICT" above (parallel with 1), rerun part 6; 22e755bf coop + netmove are still queued on the laptop.
1. Rerun the Opus planner for briefs/SLICE4.md + SLICE5.md (prompt summary: strict Sonnet briefs in SLICE2.md's shape,
   exact files / lines / acceptance; S4 20 guards incl. 1 dog, S5 24 incl. 2 dogs; A64 <= 6 awake on screen with the
   rewritten every-cell test + dormant tags until guard-render lands; one named unavoidable guard per section (M12);
   co-op-only routes but solo completable; use merged E1 / E3 / E4 / E5 / E6 data (S4 gets the first desk: pass
   layout.security as checkSectors' 3rd arg); E2 glass not in (fence fallback L10); connector far doors at the arrival
   floor; routes start at the previous connector checkpoint height; lips go into campusLips.ts; S4 and S5 build in
   parallel on -s4 / -s5 with merge notes; builders log L-numbers in checks/slice4-build.md / slice5-build.md; no
   build / e2e for builders). Commit the briefs.
2. Sonnet builders S4 (feature/sector-redesign-s4) and S5 (-s5) in parallel, worktrees off feature/sector-redesign with a
   node_modules junction (`cmd //c mklink //J <wt>\node_modules C:\NightShift\Mobile-Coop-sector-redesign\node_modules`).
   Then Opus checkers, one fix round each, merge (lead resolves shared blocks of campusSectors.ts / campusOps.ts).
3. Laptop verdicts green -> list campusOps (remove the A68 filter in src/ui/screens/missionsScreen.ts, add to
   LISTED_MAP_IDS), PR 2 to master (slices 2-3 + E1 / E3 / E4 / E5 / E6 + lips + the part-6 runner fix), message the
   orchestrator. Red -> fix round on the failing suite (Opus), rerun that suite.
4. When guard-ai's types reach master: merge master, CAMPUS_POSTS -> slot `post`, validatePosts in campus tests, E2 glass
   (skip glass in canonicalLightShapes). When guard-render lands: lift the A64 cap for S4 / S5 (20 / 24 guards).

## History: the 08:15 save (superseded by "Now" above)
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

## Next at the 08:15 save (superseded)
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
Night Shift | Sector Ops Build (was Course Ready Build): RESUME (cleared session / new account). Job: sector-redesign (lead), branch
feature/sector-redesign, worktree C:/NightShift/Mobile-Coop-sector-redesign. git fetch, then read: CLAUDE.md; docs/ROADMAP.md
(the live "Decided" is on origin/feature/menu: Sector Ops redesign 01:08-01:25, unavoidable guards 01:50, lean windows
01:45); docs/sector-redesign/BRIEF.md (M1-M12, A1-A77), STATE.md ("Now" and "Next" at the top), PLAN.md, SPEC.md,
briefs/, all on origin/feature/sector-redesign; CLAUDE.md "Heavy-usage throughput" + token rules on origin/feature/menu
until they reach master. In flight at the save: Sonnet S4 / S5 builders on feature/sector-redesign-s4 / -s5 (worktrees
-s4 / -s5, WIP pushed per step; check their logs and checks/slice4-build.md / slice5-build.md, rerun from the brief if
unfinished). Ask "Night Shift | Character Build" for the e2e-sectorops:6 verdict at 3796700d if STATE has none. Message
the orchestrator only at PR open / train-ready / blocked / needs Michael. Then follow "Next". Opus plans, writes
strict briefs, runs every checker and engine work; Sonnet 5.5 builds sections from the briefs; Haiku chores; one fix
round per slice. Agent count / pacing as the orchestrator says. Michael may be asleep: log assumptions, no question
dialogs. Every e2e is E2E_GPU=1: coop / netmove / ctcourse on Character Build (laptop); single suites on a desktop lane
(heavy.lock 4191 / heavy2.lock 4192) only when CPU allows. Push WIP and refresh STATE after every hand-back. Report to
"Night Shift | Orchestrator" at each slice end, PR or blocker.
```
