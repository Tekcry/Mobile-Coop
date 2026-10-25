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
  RESULT 57a1dbc6: lint 0 errors; vitest 1 fail / 3568 (incidents.test.ts uncoordinated rule: our floor filter cut a
  5 m lamp's own-floor guard); part 6 FAIL at "the panel cut s2-atrium and #1 walked to it" (guard-ai's coordinated
  lightsOut: #1 did not see / share a room with the pendants). IN FLIGHT: Opus fixer on -m (floor rule -> not above
  the fixture, <= 7 m below; diagnose S2 rooms / pendants / #1; fix in our data or e2e, guard-ai change only as a
  proposal; checks/merge-m-fix.md). FIX DONE de19debd: #1 at the desk never saw the pendants (L1 slab underside 4.0
  cuts the sight line; pendants in no room). Data fix: the reception downlight (-20, 3.9, -26.5) moves from group 53 to
  s2-atrium (S2_GROUPS.reception removed; SPEC S2 Lighting text updated - ASSUMED, flag to Michael: the S2 lit-lamp
  list changed). lightsOutOld: feet not above y, <= LIGHTS_OUT_BELOW 7 below. 236 related tests pass. Optional idea
  for guard-ai: a witness when the light's lit area reaches his room. RUNNING: build + part 6 + full vitest at de19debd.
  de19debd GREEN: part 6 GPU PASS, full vitest 3572 pass; merged into feature/sector-redesign (717ef9c1). Then train 22
  (4.71.0, guard-ai S5 / S7) landed: second master merge on -m @ 6e118977 (sectorMode 3 hunks + e2e block, both sides
  kept). 6e118977 GREEN: e2e-sectorops 1-6 GPU PASS, vitest 3637 pass. PR 2 OPEN: Tekcry/Mobile-Coop#206 from
  feature/sector-redesign @ 7b5b5840 (orchestrator told, train-ready ~12:xx); + 098b3f47 / ade444c5: the S3 shift
  supervisor is an officer (guard-ai S12: validateGuardAi rejects enforcer in section lists, Michael item 3). TODO on
  -s45 after its GPU run: S4 enforcers (campusS4Data.ts:42, :66) -> officer; S5 four response enforcers
  (campusS5Data.ts:29-33) -> grunt; tests. Guard-ai S12 also turns warehouseSectors.ts :54 / :102 / :157 to grunt:
  take the same lines at the E9 merge (E9 edits that file). Was: green ->
  merge -m into feature/sector-redesign, open PR 2, message the orchestrator.
- Guard AI asks (~11:30, plan docs/guard-ai/research/stealth-over-shooting.md on feature/guard-ai; types in S11):
  optional `gear?: 'helmet' | 'armour' | 'both'` per slot and `SectorDef.gear?` default (fill for later sections; early
  sections unchanged); no `enforcer` in any section list (validateGuardAi rejects); optional `SectorDef.sweep?: [x, z][]`
  response-team sweep points. If armoured glass (E10) gets its own collision group, tell guard-ai. Do with E10 / after S11.
- Guard-ai types are on master now: Next 4 (CAMPUS_POSTS -> slot post, validatePosts, E2 glass) is unblocked.
- FROZEN (orchestrator ~12:xx): feature/sector-redesign stays at f29a43da for train 23 (#206); every later commit,
  STATE included, goes on feature/sector-redesign-p3 (worktree -p3). PR 3 INTEGRATED: -p3 @ f96924e5 (s45 a6681b4e +
  e9 ff0522ad; S4 / S5 crates; S4 #6 #20 officers, S5 #1-#4 grunts; section-tag room test; 810 tests; checks/merge-p3.md).
  RUNNING: build + e2e-sectorops 1-6 + coop + netmove GPU + full vitest (scratch/runs/sectorredesign-f96924e5). Watch:
  crates stand in the previous section's connector but are tagged with their own section (co-op prompt on arrival).
  warehouseSectors.ts still lists 3 enforcers (guard-ai S12 changes them).
- Orchestrator ~11:00: no mid-window clears (clear only past ~50% context); Gmail / Drive / Fergus connectors off.
- S4 DONE (Sonnet): feature/sector-redesign-s4 @ ebbd5789 (checks/slice4-build.md). S5 DONE: -s5 @ f546db0d
  (checks/slice5-build.md). Data only, no nav code.
- E8 DONE: -e8 @ 9fbd18c2 (checks/e8-cameras.md; 106 tests in 6 files; ricochet scratch vectors). Owes an Opus
  checker (batch it with E9's engine part). At the S4 / S5 merge: `bulletproof: true` on every S4 camera,
  `bulletproof: true, thermal: true` on every S5 camera, drop their side tables, extend the "campus armour ramp" test.
  Gap (wire change): a co-op client sees no ricochet sparks for its own shot.
- S4 + S5 check (checks/slice45-check.md, 4d009c4b): S4 PASS, S5 FIX (M8 exceptions beyond the 4 brief pairs),
  merge-join J1-J4. IN FLIGHT: Opus fix + integrator: S5 M8 fix on -s5, then feature/sector-redesign-s45 off -m
  (worktree -s45) = -e8 + -s4 + -s5, J1-J4, E8 flags on S4 / S5 cameras; report checks/merge-s45.md. DONE: -s5 fix
  9dd3ab4b (M8 back to the 4 brief pairs, all 24 guards); -s45 @ 3fc36d79 (e8, s4, s5, -m de19debd; 467 tests in 30
  files). Open polish: S4 1-4, S5 1, 2 (L11 window nav), 4. RUNNING: first GPU part 6 on -s45. Then lead:
  GPU part 6 on -s45, PR 3 (S4 / S5 / E8) after PR 2.
- E9-crate brief DONE: briefs/E9-CRATE.md (ce574d71, A99-A109). PROTOCOL 35 (orchestrator ~11:25; registry 31 master,
  32 guard-ai, 33 marlow-final, 34 hang-down; renumbering at train build is the orchestrator's). IN FLIGHT: Opus part (a)
  engine + net DONE on feature/sector-redesign-e9 @ 1dc25681 (off -m; PROTOCOL_VERSION 35, 500 tests, checks/e9-engine.md).
  Part (b) DONE: -e9 @ 1a571836 (checks/e9-build.md; tsc clean, 423 tests; e2e legs unrun: sectorops parts 1 + 6,
  e2e-coop). At the S4 / S5 join: crates s4 (25.2, 0, 6.8) yaw -PI/2, s5 (-17.2, 0, 27.0) yaw 0, campus count 5, drop
  the stub filter. E8 + E9 CHECK (0deafd5b, checks/e8-e9-check.md): E8 PASS, E9 FIX 1 (mapCheck Math.hypot -> hyp2,
  done 1bb9516c). Polish P1-P7 (e.g. the client re-sends `use` every frame while held). At the s45 join: S4 / S5
  crates from S4_AMMO_CRATE / S5_AMMO_CRATE, weaponsCrate campus count 5, drop the stub filter. Crate e2e legs unrun.
- S45 part 6 GPU at 3fc36d79: S4 / S5 blocks run, FAIL only on the interactable cap (196 > 128, S4 + S5 asserts).
  CAP FIX DONE 5bee8eff (checks/s45-cap-fix.md): 128 = MAX_ITEMS (src/net/protocol.ts; client cuts at 128 too).
  Items carry their section; the host sends only the live section + untagged (objective, connector doors, revives,
  c- items): worst 64 incl. crate headroom; no wire change. tests/sectorItemScope.test.ts. Risk: a switch / board
  reachable from another section than its builder file loses its client prompt (only doors are tested).
  5bee8eff GREEN (GPU): sectorops:6 214 s, netmove 163 s, coop 78 s. IN FLIGHT: Opus PR 3 integrator on
  feature/sector-redesign-p3 (worktree -p3) = feature/sector-redesign + -s45 + -e9, S4 / S5 crates, S4 / S5 enforcers out,
  item-scope room test; checks/merge-p3.md. Then GPU: sectorops 1-6 + coop + netmove + full vitest, PR 3.
  Then ONE Opus checker for E8 + E9 (engine + net). Was: needs a number (NetItem kind 'crate' + event
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

## Next window (saved ~12:15; start all PARALLEL lanes at once, CPU <= ~80%, never two agents on the same files)
0. Read the GPU verdict of the PR 3 run at f96924e5 (C:/NightShift/scratch/runs/sectorredesign-f96924e5: build.log,
   e2e.log = sectorops 1-6 + coop + netmove, vitest.log). Green -> open PR 3 (feature/sector-redesign-p3 -> master: S4 /
   S5 / E8 / E9 crate protocol 35 / item scope / enforcers out), bind it, message the orchestrator (train-ready; it
   renumbers protocol at train build). Red -> one Opus fix round per failing suite (likeliest: the co-op crate prompt,
   the crate stands in the previous connector but is tagged with its own section and items are scoped to the live
   section), rerun only the failing suites. After #206 lands in master: merge master into -p3 only when PR 3 enters a train.
PARALLEL lanes (each its own branch off -p3 + worktree with a node_modules junction; push WIP per step). STARTED ~12:15
(Michael ~12:10 "do it faster"): lane B E2 glass (Opus, feature/sector-redesign-e2, checks/e2-glass.md) and lane C posts
move (Sonnet, feature/sector-redesign-posts, checks/posts-move.md). On resume: check each branch log + report; rerun
from this text if unfinished. Lane A: briefs DONE (2b349d4b, 87496dcc: ART-PLAN, ART-KIT A110-A126, ART-S1..S5 A127-A152,
batch 3 A153-A157; assumptions AS1-AS10 for Michael in ART-PLAN, none blocking). ART-KIT (Opus, branch off -p3) is
STARTED ~12:25 (Opus, feature/sector-redesign-art-kit, worktree -art-kit, checks/art-kit-build.md); rerun from
briefs/ART-KIT.md if unfinished. Then one Opus checker, then ART-S1..S5
(Sonnet, parallel, cut from the ART-KIT head). Note: ART-S3..S5 hero coordinates come from -s45, re-check on -p3.
Lane C DONE: feature/sector-redesign-posts @ e20103d6 (5 posts onto slot `post`, CAMPUS_POSTS / S4_POSTS / S5_POSTS gone,
tests/campusPosts.test.ts, 425 tests; checks/posts-move.md). Owes a Sonnet checker (batch with lane D / E data); merge
into -p3 after PR 3 opens (or ride PR 3 if it is still unopened and green).
A. Detail art: briefs/ART-PLAN.md + ART-KIT.md + ART-S1..S5.md (Opus planner, ~12:00; check -p3 for them; rerun the
   planner from ROADMAP "Next: campus detail art" if missing). Opus builds ART-KIT first (kit + rules engine + tests);
   then Sonnet dressers S1-S5 in parallel (each only campusS<N>Dress.ts + one registration line); one Opus checker per
   batch; then the GPU perf pass (E2E_GPU=1) + sectorops 6 + coop.
B. E2 glass (EW6): guard-ai's `glass?` on BoxPiece is on master: skip glass pieces in canonicalLightShapes
   (src/voxel/lightShapes.ts), campus glass data where SPEC has it, bullets per G45; Opus (small). Then E10 armoured
   routes (S4 / S5 bulletproof glass / doors + a named quiet bypass each, A97); if armoured glass gets its own collision
   group tell Guard AI (their sight must see through it).
C. Posts move: CAMPUS_POSTS -> each slot's `post` (guard-ai SquadSlot post), validatePosts in the campus tests; Sonnet
   from a short Opus brief; touches campusSectors.ts / campusS4Data.ts / campusS5Data.ts only (not lane A / B files).
D. When feature/guard-ai-s11 types reach master: `gear?` per slot / `SectorDef.gear?` (helmets / armour in S4-S5, none
   early), `SectorDef.sweep?` points; after lane C (same files).
E. Polish (Sonnet, after A-C so files do not overlap): S4 polish 1-4, S5 1 / 2 (L11 window nav) / 4 (checks/slice45-check.md);
   E8 / E9 polish P1-P7 (checks/e8-e9-check.md; e.g. the client re-sends `use` every frame while held); E6 polish; S2 / S3
   polish lists below; the LevelBuilder.ramp end-cap backlog item.

## Next at ~10:20 (superseded)
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

## History: resume block 2026-10-24 ~23:10 (superseded)
```
Night Shift | Sector Ops Build: RESUME (saved 2026-10-24 ~23:10, 5-hour cap; orchestrator resumes at the 03:10 reset).
SAVE ~23:10: signoff WIP e41942bf (S1 DONE 8acf65d3: validator 13 -> 0, 15 guards; S2-S5 partial files committed as WIP,
their planners die with the window -> on resume: for each S<N> missing S<N>.md / S<N>-detail.md / plan SVG, rerun its
planner from briefs/SIGNOFF-PLANNER.md + the section line in this block's item 5 + the messages below). Planner messages
sent ~23:00 (resend to reruns): sync nodes as a top-level "sync" array (id / kind / space / src / lead / track A|B, as S1);
guard ramp S1 15 < S2 > 15 < S3 ~20+ < S4 ~24+ < S5 most; Marlow's nodes - S2 Split Shift: sync-s2-comms (camera_loop,
comms patch panel loops cam-turnstile / cam-lift / cam-bridge), sync-s2-switchgear (power_cut, plant breaker, groups 55+56),
optional sync-s2-atrium (board campusS2.ts:192), kp-fac keypad (planned), leads kitchen overheard line + mail-room plant
log + post-room note; S4 Code Relay (Marlow's pick): sync-s4-dockboard (code_source, built), sync-s4-desk (camera_loop,
desk-sec4), sync-s4-noc (code_source) + sync-s4-cagekp (code_sink) 30 s / 90 s solo, riser-side kp-deck keypad, leads deck
radio line + duty roster + seat placard, spook bolt by the riser door, footage wipe (optional); S5 code pair = reserved spare.
VG1 built + pushed 84ddc14c (38 tests); Opus VG1 checker was running (-> docs/visual-gate/checks/vg1-check.md; rerun if
missing). Disk: orchestrator cleanup approved by Michael ~22:55 (10.9 GB free at 23:05). OVERNIGHT MODE (orchestrator ~22:40): no swap, Michael
asleep, full burn to the cap each window, save at ~92%, the orchestrator resumes you after each reset; no question
dialogs: decide, log assumed decisions in the BRIEF. coop4 / #317 / feature/coop4-pol are GUARD AI BUILD's: do not push there.
1. #354 bake2 (feature/sector-redesign-bake2 @ 54cdb9e1, fragment added) OPEN + train-ready; laptop bake2 3/3 PASS on
   90bf843b; auto-train takes it on green CI. Act on the train verdict; Opus triage on red.
2. #357 fog2 (feature/sector-redesign-fog2 @ 65e36232, Opus check PASS, polish P1-P3 held in checks/fog-wiring-check.md)
   OPEN + train-ready (~23:20, orchestrator told). Act on the train verdict.
2b. DISK (~23:15): desktop C: hit 0.03 GB free (git failed); ~6 GB at ~23:30. 74 clean, pushed old sector-redesign
   worktrees (~35 GB) listed in C:/NightShift/scratch/sector-ops-removable-worktrees.txt; auto mode DENIED my bulk
   removal, orchestrator asked (Michael's call). Make NO new desktop worktree (~490 MB each) until space returns.
3. CLOUD brief briefs/sector-redesign-bake3.md (cloud-queue 6dccd057, open): bake2 polish P1 / P2 / P4 on
   feature/sector-redesign-bake3 off 54cdb9e1. On done: one checker, then PR stacked after #354.
4. VISUAL-GATE (docs/visual-gate/STATE.md holds its resume block): C0 = FIX (M1 pin order, M2 campus sectorGuards=1).
   C0 fixed + group A briefs at 0b7f46f4; DISPATCHED ~23:30: VG1 Opus agent in worktree -visual-gate-vg1 (lead commits),
   VG2 / VG3 / VG4 cloud briefs (cloud-queue 6e29ea80). Detail: docs/visual-gate/STATE.md "Now" (3fd594e5).
5. CAMPUS SIGN-OFF PAGES (orchestrator ~22:50; Marlow Build leads mission-framework): branch feature/sector-redesign-signoff
   (worktree -signoff, cut from feature/level-validator = PR #346; c088b7e9). Done: plan-svg --floors / --bounds / --out /
   --prefix; before plans signoff/before/S<N>-<y>.svg; plan graphs docs/sector-redesign/graph/plan/ (players [1,2,3,4]);
   signoff/README.md = the sync-node contract AGREED with Marlow (~22:55: fields id / kind / space / src / lead, tracks A / B,
   S2 Split Shift, S4 + S5 Code Relay candidates). IN FLIGHT: 5 Opus planners (rulebook briefs/SIGNOFF-PLANNER.md on this branch;
   ) writing signoff/S<N>.md + S<N>-detail.md + S<N>-plan-<y>.svg + plan graph; they do
   NOT commit: the lead commits all, compiles signoff/SYNC.md, runs one checker, pushes, messages Marlow + the
   orchestrator ("sign-off pages up"). No greybox before Michael approves. Rerun a missing planner from that rulebook.
The no-refining rule is LIFTED (ROADMAP Decided ~21:50): held polish lists may now be built (cloud briefs preferred).
Cloud: tsc / vitest-only builder slices go to cloud-queue briefs. Older context (sector-redesign idle until Michael's playtest):
worktree C:/NightShift/Mobile-Coop-sector-redesign-polish (feature/sector-redesign-polish: STATE / PLAN / checks / briefs).
git fetch; read CLAUDE.md; PLAN.md "LR16". Laptop: copy scripts/laptop-queue/request.mjs + lib.mjs from origin/master to
scratch; node <scratch>/request.mjs --sha <sha> [--pr N] --branch <b> --set <s> --suites "a b" --requester "Night Shift |
Sector Ops Build"; verdict = GitHub status laptop-e2e/<set>; with --pr a failure posts its excerpt on the PR (always pass
--pr when a PR exists). The laptop fetches branches only: to test a PR's merge with master, push its merge commit to a
test/ branch first.
RELEASED: #226 campus art (4.84.0); #291 = all of LR16 + Marlow LR16-M + train-entry fixes (4.88.0; #287 marked merged).
RELEASED: #307 (4.89.0). IDLE until Michael's playtest or an orchestrator task (orchestrator ~14:45, saves the weekly). Was OPEN: PR #307 (feature/sector-redesign-lr16b2 9602eed0 = LR16-4 reception board + LR16-6 vision polish
  + LR16-POLISH2 A-C), TRAIN-READY: CI green; laptop sectorops:6 + coop PASS on the head, darkness PASS on the merge commit
  bf7879f8 (test/pr307-merge; the head's red is the pre-#295 8 s watchdog only). Act on the train's verdict; one Opus
  triage on any failure. After release: Michael may delete test/pr307-merge, feature/sector-redesign-lr16-entry,
  -lr16fix*, -lr16b2 parts (his call).
HANDOVER: Test Runner (guard-render phase 2) owns src/world/world.ts, sunCascadeCull.ts, src/game/sectorGuardFreeze*.ts
  this window; keep off them. It must keep #307's ghostFrame rule (animTierView) and test case.
COOP4 HANDED TO GUARD AI BUILD (~19:50, orchestrator): feature/coop4 / #317 at afc616f0 (p8 rejoin = test expectation, fixed test / docs only, checks/p8-rejoin-fix.md); it reruns sectorops:8, merges master, labels; feature/coop4-pol follow-up (head 134f6abe) also in its hands. Do not push to feature/coop4.
CLOUD (orchestrator ~19:40): tsc / vitest-only builder slices (fog follow-ups, coop4 follow-ups) go to cloud-queue briefs, not desktop agents; LR16-1 / LR16e / LR16t briefs marked done there.
ORDER (orchestrator ~19:35): fog first, then coop4 part 8 rejoin, then #333. #317 and #333 CONFLICT with master 4.95.0 (auto-train skips them): after each fix round merge origin/master into the branch (orchestrator-approved), rerun the suites the merge touches, then label train-ready. Michael saw the fog on Epic: triage Epic, then High.
CAMPUS FOG (HIGH, Michael ~19:02, on Epic: "Campus lights look very foggy, can't see through them"): CAUSE (~20:00) src/vfx/volLights.ts:29-30 volBeam gives 76 / 134 campus fixed lights (coned spots, plain fixture box, no LED model) the torch beam at Medium+; since LR16a each marches up to 14 m, 6-12 overlap per room. Fix building (4813dbf2: theme.lampBeams false on campus). Orchestrator told. Opus triage + fix on feature/sector-redesign-fog (worktree -fog off master d91d0e00, node_modules junction to -bake); report checks/fog-triage.md on that branch; GPU shots via the laptop queue to shots/fog-<sha>; check old PR #152 idea. Message the orchestrator the cause in one line; one PR, train-ready on green.
SECTION BAKE (Michael ~17:50: "start the faster campus load now"): PR #333 (draft) feature/sector-redesign-bake @ 5cc02048 = build cfacf4bc + check A PASS + check B FIX fixed (flip-Y / premultiply cleared before the tile texSubImage3D) + master 4.95.0 merged (gameState.ts conflict: guard-model warm-up and the section wait both kept; tsc clean, 24 files 281 pass). Laptop set bake (lightbake darkness sectorops:6 coop netmove) on 5cc02048 queued; the alone 7-9 requests withdrawn (parts 7-9 are coop4-only). Green -> gh pr ready 333, label train-ready, message the orchestrator. Polish (check A P1-P8, B 1-10) held; S1 hole P3 (plant roof -> pavilion -> x -44 drop to open ground) flag to the level owner. GPU look line in TESTING.md owed.
PLAN: every slice built. HELD for Michael's playtest (docs only until then): (per-section campus bake now STARTED, see above; was ~2 slices, 3-4 h;
  a lamp spanning two sections counts for both); body-shader compile cost (one laptop GPU probe, then dynamic-bounded
  torch / PCSS loops; cold Epic compile 29.3 s solo, 43.5 s with 3 browsers, cap now 90 s); torch haze spill past a wall at
  corners (volLights / torches reach, checks/lr16-8-triage.md A3); polish held lists (checks/*-check.md polish).
For Michael: ceilings over cone fittings / halls > 4 m read black (cone up-glow, 6-7 m bounce ~3x bake, albedo); partner
  beacon a 1.4-2 cm unlit sphere (min screen size or halo); NV too dark in S3 / S4 darkest rooms; views with no pool / no
  dark, S3 lit everywhere; LR16 +22 s campus cold first load; proving moonlit ground card 0.29 vs band 0.42 (parked mode);
  Realistic dimmer (S2 atrium 0.47); S3 hall-lit white fog; R2N ladder foot 0.44.
Sheets: git branch shots/lr16-8 (LR16-8 showcase, redo-040708-5c20c538): no light leak, no parity break.
RULES: message the orchestrator only at PR open / train-ready / blocked / needs Michael; Opus plans / checks / engine,
Sonnet from strict briefs; two checkers on src/ai or src/net; one checker per batch in parallel with the laptop request;
Opus triage on any laptop failure; one fix round; never merge master into a job branch (conflicts resolve in the train or
on a separate entry branch the orchestrator approves); no e2e and no GPU probe on the desktop; vitest --maxWorkers=2 under
C:/NightShift/scratch/sr-slot-{1..4}.lock; agents wait while CPU > 90%; never two agents on one file; hot paths allocate
nothing even un-inlined (no uint32 returns: 30-bit Smi). Detached worktrees: `cmd //c rmdir "<wt>\node_modules"` FIRST,
then git worktree remove --force. Train-ready = message + `gh pr edit <n> --add-label train-ready`.
```

## Resume prompt
```
Night Shift | Sector Ops Build: RESUME (refreshed 2026-10-25 ~13:30 after the 13:10 reset; new orchestrator).
git fetch; read docs/RULES.md and docs/VISION.md from origin/master (never a branch copy); BOOT.md "Sector Ops Build"
on origin/feature/menu. Full burn.
DOCS-FIRST HOLD (G346, G355; BOOT common start 4): until Michael signs off the folded plan (ROADMAP Now row 6) no new
game work. Finished PRs may ship. Message the orchestrator only at PR open / train-ready / blocked / needs Michael.
0. FIRST JOB: conformance review, plan only (brief docs/orchestrator/review-briefs/sector-ops.md on
   origin/feature/menu). PR #420 (feature/conformance-sector-ops @ 419b54c1, worktree
   C:/NightShift/Mobile-Coop-conformance-sector-ops): docs/conformance-sector-ops/CONFORMANCE.md is complete (63 rows,
   12 Michael questions). Fresh Opus checker started ~13:45 (report: session scratchpad check-report.md, may be lost
   at a swap). If no `checker` status on the PR head: start a fresh Opus checker (re-find every file:line, rule
   quotes, missed scope, needs-Michael calls), one fix round, post `checker`, message the orchestrator.
1. DOC FIXES STOPPED (Michael 13:53 "plan comes first", via orchestrator): no PR, no cloud briefs. WIP pushed only on
   feature/sector-ops-docfix (874c3e81 lighting.md L16 / L17, campus-run REPORT + S1 notes L13; 26fe2e57 SPEC / BRIEF /
   PLAN L12 + stale counts; fragment one placeholder bullet). Left for resume: S2.md:168, S4.md:154, run.txt notes;
   fragment bullets; campus-greybox (briefs/S1.md:614 meta, briefs/S2.md:342-343 soloWindow vs C4), light-realism
   docs (none written), visual-gate plan + stale STATE (no edits made). bake5 = PR #421 (orchestrator, Michael OK).
2. HELD until row 6 (plans only, no code):
   - campus-greybox (Now row 9): feature/campus-greybox @ c2f1f131 (BRIEF, PLAN, STATE, briefs S1..S5); worktree
     C:/NightShift/Mobile-Coop-campus-greybox. Resume from docs/campus-greybox/STATE.md on that branch.
   - light-realism (Now row 10): feature/light-realism @ bd8b843e (S1 car park measurement scripts); worktree
     -light-realism; the lux grid goes to Michael via the orchestrator.
   - character shadows in the meter (Now row 11, G352) and stars fill lower tiers (Now row 12, G331): Opus plans.
   - visual-gate: feature/visual-gate @ 07eefea0 (45 ahead of master); docs/visual-gate/STATE.md on that branch.
3. Merged since the 09:08 save: #333 (section bake), #379 (polish 3), #385 (bake4), #339 (fog). Older notes in
   this file above this block are history.
Laptop requests: node scripts/laptop-queue/request.mjs (RULES "Machines"); suite names are e2e-*.
Rules: RULES on origin/master only; never restate them here.
Previous blocks: git log -p on this file.
Next: #420 review DONE at aca518a5 (checker FIX -> fix round 977bc3a1 -> Opus re-check FIX on one line -> fixed
  aca518a5). `checker` status not posted (auto mode blocks self-approval): Michael posts it or approves. Then HOLD until
  the orchestrator says row 6 is signed off; resume the doc-fix WIP (item 1) and the held jobs (item 2).
```
