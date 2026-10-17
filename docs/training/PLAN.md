# Fallow training bunker - plan

How the bunker gets built. Under DECISIONS D12, Claude builds the whole map start to finish without Michael's gates;
Michael reviews the finished map. Section 2 answers his question: which systems must exist first.

## 1. Branch plan
- Work branch: `feature/training-bunker`, created 2026-10-13 from `origin/feature/kestrel` (D6). Every bunker session
  commits and pushes only here.
- Never commit to or push `feature/kestrel` (an overnight run pushes there), `feature/ct-locomotion`, `ct-movement`,
  `dev` or `master`. Claude never merges into another branch; Michael merges.
- Feeding features in: when a switch-on session (section 3) needs a feature that has landed on `feature/kestrel`
  (security S1B-S5, toolkit V1-V3, DR) or `feature/ct-locomotion` (locomotion steps), that session merges the source
  branch into `feature/training-bunker` (a merge commit, never a rebase), runs `npm run check` and `npm run e2e:quick`,
  and logs the merge. It never pushes the merge anywhere else.
- Known pre-existing failure on the base: `tests/kestrelMap.test.ts` (kestrel-owned; locomotion STATE.md). Not ours to fix.
- Getting the bunker to Michael: when he wants it on a preview, he merges `feature/training-bunker` himself.

## 2. Systems that must exist before the build (the answer to Michael)
**Blocking (built here first, session T1):**
1. **Course framework** (new; a small slice of bible Phase 4's triggers / actions and checkpoints). Pure logic in
   `src/game/course/` with Vitest tests, a `CourseMode` (`src/game/modes/courseMode.ts`), co-op `NetMode` `course`
   (capacity 2), and a test map `courselab` (MAPS only, modes `[]`, like `seclab`). It provides:
   - course data types (bays, airlocks, gates, squads, radio lines, element switch-on flags, objectives);
   - two-person airlocks (both inside, cycle, near door locked for good, far door open, checkpoint);
   - gates: `lever` (a switch unlocks a door), `bolt` (a door opened from one side only), `hold` (open while held),
     `timedHold` (open while held and N s after), `pair` (two switches within a window: Sync's stand-in), `egress`
     (request-to-exit on the secure side), `mains` (a door unlocked while a light group is off), `flag` (a door unlocked
     by a course flag: a key, a card, a code), `anchorLock` (an anchor unusable until a flag: the B3 fan guard);
   - per-bay squads spawned when the bay's entry airlock cycles, and kept within `MAX_ALIVE`;
   - bay restart when both players are down: both respawn in the bay's entry airlock; the bay's squad, gates, lights and
     breakables reset;
   - course radio lines through the existing barks / subtitles path, with solo / team variants left empty (2 players);
   - mandatory drills per bay, ticked per player, gating the airlocks (D30), with a full tutorial HUD (both players'
     ticks, step text, markers that a setting hides; D18, D19), results with per-bay stats and a rating (D26), a course
     record and "Start at bay N" (D20), a dev solo flag (D21);
   - host authority: the host runs the course state; a `course` message (state, door locks, flags) when changed or every
     2 s; clients mirror door locks and anchor locks; `parseMessage` case and a `tests/net.test.ts` test.
2. **Run-time door lock state on clients** (inside T1 if T0 finds `Door.anchor.locked` changes do not reach clients:
   doors sync open indices only today, coop.md).
3. **Anchor disable at run time** (inside T1: `AttachController` skips anchors in a disabled set; one hook).

**Needed for the full experience (the map is playable without them through placeholders; each switches on later):**
4. **Desk console view** (a player at a security desk watches its feeds and cycles them): not in S0. Recommended as an
   addition to S1 Part B's prompt; until then B6's code gate uses the lit-sign placeholder.
5. **Light state sync to clients** (lamp on / off / destroyed; First Playable S7a, bible L10). T0 checks whether
   switch and shot-lamp changes already reach clients through `items` and events; if not, recommended before T6 so the
   co-op light tests mean something.
6. **Dev bot partner** (locomotion step 20): the automated full course run with the bot as P2.
7. Everything else in FEATURES.md with a status other than `exists`: locomotion steps 09-34, S1B-S5, V1-V3, DR, bible
   Phase 1 (fuse box, emergency lamps), Phase 2 (sound), Phase 5 (co-op set), Phase 6 (civilians, throwables, per-stop
   facing), backlog 23-24. None blocks the build.

## 3. Switch-on map (features landing -> bay elements switched on)
Every element is built in T2-T7 in its final geometry; its gate or drill runs in its "now" form until the feature lands.
A switch-on session merges the feature in (section 1), flips the element's course flag from now to final, extends
`e2e-bunker`, and updates FEATURES.md's status column.
| Session | Trigger (feature landed) | Bays and elements | Check |
| --- | --- | --- | --- |
| SW-L1 | loco 09-15 (holster, elbow strike, wall, corners, edge aim, door peek, vision, medkits) | B1 draw / elbow pad; B6 corners; B7 sandbag lean; B8 draw and ADS; A4 / A6 / A8 medkits; B5 thermal; B6 electro | e2e-bunker B1, B6, B7, B8; e2e-netmove cases |
| SW-L2 | loco 20 (bot partner) | Whole course with the bot as P2; FEATURES section 11 coverage | bot run; per-player verb log |
| SW-L3 | loco 22-29 (quick 180, momentum, drag, guard body language) | B1 / B2 drills; B7 drag; B5-B9 guards | anim-audit; e2e-bunker B2, B7 |
| SW-S1 | S1 Part B (+ console view, item 4) | B6 desk, panel, fault; B9 bridge desk | e2e-seclab; e2e-bunker B6 |
| SW-S2 | S2 | B6 readers, cards, clone, mantrap, iris | e2e-bunker B6 |
| SW-S3 | S3 | B5 PIR; B6 beams, PIR; B9 beam, PIR | e2e-bunker B5, B6, B9 |
| SW-S4 | S4 (+ S5) | Security sync for both players; dormant guards replace T1 spawning if Michael prefers | e2e-bunker 2 players |
| SW-V1 | V1 | B6 / B7 optic cable | e2e-toolkit; e2e-bunker B6 |
| SW-V2 | V2 | B6 locker 7, manager's door, records PC, keypad; B9 key drawers | e2e-bunker B6, B9 |
| SW-V3 | V3 | Course kit; pistol secondary (B5, B6, B8, B9); shocker (B8, B9); interrogation (B7) | e2e-bunker B7, B8 |
| SW-DR | DR | S6 push-bar door | e2e-bunker S6 |
| SW-P1 | Phase 1 fuse box | B5 breaker reset by a guard; maintained emergency lamps | e2e-bunker B5 |
| SW-P2 | Phase 2 | B3 fan and B5 genset masking; sound meter; whistle (B5, B7) | e2e-bunker B5 |
| SW-P5 | Phase 5 | B4 new team moves; Sync (B7 pair, B9 keys); clutch save (B9); drag a downed mate and medkit on a mate (B9); typed pings; outlines; team results | e2e-bunker B4, B7, B9 |
| SW-6B | Phase 6b (visual target) | The desktop beauty pass for every bay (D14): CC0 textures, detail, haze, flicker, beauty shots | PC-PASS shots |
| SW-P6 | Phase 6 / backlog | Throwables (B5, B8); civilian umpire (B7); per-stop facing; knife (B7 dust sheet); airfoil (B8) | e2e-bunker |

## 4. Build order (the local run)
Priority (D7): the run (Blocks A-D) goes before Dead Line's P03R; the SW sessions interleave with Dead Line stages as
features land. The run is local on Michael's PC, unattended, orchestrated like the locomotion run: BRIEF.md (start and
resume), RULES.md (rules), STATE.md (where it is), `steps/` (one file per step). Each step is implemented by one opus
subagent and checked by a fresh opus subagent (up to 3 fix rounds); the orchestrator keeps only STATE, the step file and
the agents' summaries in its context.
| Block | Step | Delivers | Block end |
| --- | --- | --- | --- |
| A Foundations | T0 facts | Baseline, 10 engine answers, reuse list, `T0-facts.md`, CLAUDE.md resume line (3 parallel Explore agents + checker; no code) | |
| | T1a course logic | `src/game/course/` pure state machine: gates, airlocks gated by drills, per-player ticks, restart, start at bay N, per-bay stats, pack / apply; tests | |
| | T1b course mode | `CourseMode`, NetMode `course` (2 players, co-op lobby only), `course` and `ctick` messages, door / anchor locks, light state, dev solo flag, `courselab`, `e2e-course` | |
| | T1c tutorial | Drill detection, the tutorial HUD (both players' ticks, step text, markers with a hide setting), results panel and rating, the `course:fallow` record, bay select in the lobby | full e2e, perf trend, GPU baseline |
| B Geometry | T2 Upper | `bunker.ts`, `bunkerUpper.ts`: B1, A1, B2, A2; `plan-svg.mjs`; map tests | |
| | T3 Shaft and Cistern | `bunkerShaft.ts`: B3, A3, B4, A4; split gap, ropes, fence, duct, co-op lips | |
| | T4 Plant | `bunkerPlant.ts`: B5, A5, B6, S6, A6; trench, gallery, mock site rooms, duct, device mount points | |
| | T5 Deep | `bunkerDeep.ts`: B7, A7, B8, A8, B9, L9; e2e-anchors covers the map; nav order test; `WALK.md` | full e2e, GPU shots per bay, then PAUSE: Michael walks the bays (D27) |
| C Life | T5b walk notes | Walk-1 fixes: automatic airlocks (R6), objective list always on screen (R5) | |
| | T5b2 partner collision | Partners block each other (D49); teleport snap | |
| | T5c BAYS v2 | Docs only: BAYS v2 under R1-R8 (v1 kept as `BAYS-v1.md`), FEATURES "who", explicit objective lines (A59) | |
| | T5d-T5g rebuild | Every bay rebuilt to BAYS v2 (T5d B1-A2, T5e B3-A4, T5f B5-A6, T5g B7-L9): R1 / R2 nav tests per element, footprint check (R4), objective lines as drill names | full e2e, GPU shots per bay, then PAUSE: Michael walks again (walk 2) |
| | TM merge | `feature/ct-locomotion` (past step 20) and `feature/kestrel` merged in; drills use the real loco 09-20 verbs (waits for loco 20, D15) | |
| | T6 Light | every light plan, circuits, switches, zones, surfaces; `e2e-bunker` light section | |
| | T7a Course data | `bunkerCourse.ts`: every drill, all gates, S1 cameras, radio lines, objectives, kit | |
| | T7b Guards | 21 guards in squads per bay, cycles 25-45 s, darkness / noise / body checks | full e2e, perf trend, GPU light look |
| D Proof | T8a e2e first | course suite for B1-B5: every drill by real input, both tick columns, gates, airlocks, a forced restart | |
| | T8b e2e rest | B6-B9, the full course, the per-player coverage report, lethal vs non-lethal rating, perf on the bunker | GPU perf budgets |
| | T8c course bot | the loco 20 bot drives P2 through the course; "Bot partner (course)" in the debug menu (D35) | |
| | T9a art Upper / Plant | voxel art layer for B1-B6 (D14); voxelFit includes the bunker | |
| | T9b art Deep | voxel art layer for B7-B9, S6, airlocks, signage | |
| | T10 Finish | light and dark showcase tuning on this PC, readability, TESTING, REVIEW.md | final checks; stop for Michael |
| Later | SW-* | section 3, one run each from `steps/SW-template.md` | per run |

## 5. Local run and GPU
- **Where:** Claude Code on Michael's PC, branch `feature/training-bunker`. Start: "Training run: START. Follow
  docs/training/BRIEF.md." Resume: "Training run: RESUME. Follow docs/training/BRIEF.md."
- **GPU:** because the run is local, the block ends run the PC-PASS items with `E2E_GPU=1` (perf budgets are real
  results on this PC). Looks are recorded as screenshots for Michael's eyes (`test-results/training/`, not committed).
- **Michael:** no input during the run (D12). He reads REVIEW.md at the end, plays the two-player checklist, and judges
  the screenshots. The editor is not needed (section 6).

## 6. Editor second-map part (scope only; optional, for a later PC session)
D12 has Claude build the bunker in code, so the editor is no longer on the critical path. If Michael later wants to tweak
the bunker by pad, the editor needs:
1. A map registry: `scripts/kestrel/editor-server.ts` hard-codes the campus and play files (`CAMPUS` line 14, `PLAY`
   line 21); make them a choice (`?map=kestrel|bunker`) with a sandbox per map.
2. A bunker blocks file in the campus schema (docs/kestrel/schema.md), exported once from `bunker.ts` (rooms, walls,
   openings, stairs, ladders, objects, climb pieces, lamps, circuits, guards, markers), so the editor can load it;
   the bunker then builds from that file, as Kestrel builds from its own (`kestrelCampus.ts` `campusToBuild`).
3. Per-map checks: `check.mjs` and `standards-check.mjs` read Kestrel facts and rules; give the bunker its own rule set
   (or none) so the Checks panel does not flood.
4. The walk test's converter: `campusToBuild` assumes two buildings and Kestrel's levels; generalise it to any blocks file.
5. Not covered by the editor today and needed by the bunker: shafts with galleries, ropes and ziplines as placed pieces,
   course gates and airlocks, security devices (P04S / B4S stage). Those stay in code.
Estimate: one Opus session for items 1, 3 and 4, one for item 2, on the PC (the editor is dev-only and needs the dev
server). Recommendation: skip until Michael asks.

## 7. Starting the run
The earlier cloud prompts are replaced by the run files: BRIEF.md (what the orchestrator does), RULES.md, STATE.md and
`steps/T0-facts.md` .. `steps/T10-finish.md`. Start with "Training run: START. Follow docs/training/BRIEF.md."
