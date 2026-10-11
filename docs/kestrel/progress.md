# Kestrel - progress

Planning handover (decisions not yet in the briefs, stage order, working rules): see handover.md.

| Stage | Prompt | Status | Commit | Date |
| --- | --- | --- | --- | --- |
| P00 | Setup, rules, facts | APPROVED | 8945ddb | 2026-10-10 |
| S0 | Security systems spec | APPROVED | 65e28f9 | 2026-10-10 |
| S1 | Cameras and security desk | DRAFT (Part A done, Part B to run) | 478c3b8 | 2026-10-10 |
| S2 | Card readers, keycards, mantrap | not started | | |
| S3 | Beam detectors and PIR lights | not started | | |
| S4 | Security co-op sync and controls | not started | | |
| S5 | Dormant guards (Part A, Part B) | not started | | |
| P01 | Mission brief | APPROVED | 5764aad | 2026-10-11 |
| P02 | Building brief | APPROVED | 133a4d1 | 2026-10-11 |
| P03 | Tools | APPROVED | 81e50aa | 2026-10-10 |
| P03T | Campus tools (two buildings) | APPROVED | f097ce1 | 2026-10-11 |
| P03B | Block plan | DRAFT (part 1b-G) | pending | 2026-10-11 |
| P03R | Campus review | not started | | |
| B0 | Massing walk | to rerun (campus) | 57aaf6c | 2026-10-11 |
| CAM | Camera respects walls and low spaces | DRAFT | 6c1ac7a | 2026-10-11 |
| RU3 | Session size rules | DRAFT | | 2026-10-11 |
| SETUP-1 | Small sessions, reading rules, lessons | DRAFT | | 2026-10-11 |
| SETUP-2 | Planner, prompt files, workflow | DRAFT | | 2026-10-11 |
| V0 | Chaos Theory toolkit spec | APPROVED | 811eaca | 2026-10-11 |
| V1 | Toolkit: wall hug, optic cable | not started | | |
| V2 | Toolkit: lockpick, hacking | not started | | |
| V3 | Toolkit: mission kit, pistol secondary, shocker, interrogation | not started | | |
| P04 | Floor plans | not started | | |
| P05 | Architecture review | not started | | |
| P04S | Security layout | not started | | |
| P06 | Level design | not started | | |
| P07 | Encounters | not started | | |
| P08 | Mission and co-op | not started | | |
| P09 | Build contract | not started | | |
| P10 | Gameplay review | not started | | |
| B1 | Site and ground floor | not started | | |
| B2 | Levels and stairs | not started | | |
| B3 | Openings and traversal | not started | | |
| B4 | Light and sound layer | not started | | |
| B4S | Security devices | not started | | |
| B5 | Guards | not started | | |
| B6 | Mission and co-op | not started | | |
| B7 | Verification and playtest pack | not started | | |
| P11 | Playtest triage | not started | | |

## Log (newest first)
Older entries: progress-archive.md.
- 2026-10-11 P03B 1b-G: Building A ground, 25 rects in section 3 (731 of 731 m2, 0 overlaps, lift touches only AG18 and AG20). Spine [10, 40, 40, 43.5], bridge z0 = 40. Questions (recommended first): ASK-2 five rooms (AG05, AG06, AG07, AG14, AG24) cannot touch the spine: (a) side corridor later, (b) drop AG06 south-wall rule, (c) loosen AG01; ASK-3 fire stair reaches spine through a 2.5 m foot lobby: (a) accept, (b) none valid; ASK-4 AG22 across the spine from AG08/09: (a) accept, (b) swap with AG15; ASK-1 133 m2 leftover: (a) leave as pockets, (b) add stores.
- 2026-10-11 P03B 1a: 03B-block-plan.md replaced with the campus plan, sections 1 (site, grid) and 2 (levels, footprints). Site tiling check: 8208 of 8208, 0 cells wrong. Corrected: passage 2.0 centreline / 1.55 clear, rear strip behind wing 2.0 (was 2.5). Questions (recommended first):
  - Q1 wing grid: (a, Recommended) wing keeps its own grid offset 2.0 north, x on campus lines - own foundations per brief 2; (b) move wing to grid lines, passage 6.0 - breaks brief 12e.
  - Q2 bridge side walls: (a, Recommended) exterior 0.45, 3.05 clear - it is an outside enclosure; (b) interior 0.30, 3.2 clear.
  - Q3 bridge roof 7.8: (a, Recommended) add its own level (for example `L` at 7.8, footprint the bridge rect) - the bridge roof is a secret route (RULES 1) and every walkable height needs a level (lessons); (b) object top on F.
  - Michael answered all recommended (2026-10-11); applied. Schema 1 level-id list needs `L` added.
- 2026-10-11 SETUP-2: PLANNER.md and prompts/P03B-1a.md created; RULES 7 and 9 gain the prompt-file, Next-line and recommended-option rules; handover Working rules gain the workflow and P03B part plan.
- 2026-10-11 SETUP-1: RULES.md gets Task size and Reading and checking rules, roster and order lines point to one source; CLAUDE.md skip line; lessons.md created.
  progress.md log trimmed to the newest 8 entries, old entries and the old Massing walk section moved to progress-archive.md.
- 2026-10-11 RU3: added the Session size rules (five lines) to RULES.md section 7 and a Working rules line to handover.md.
- 2026-10-11 V0 revision (pistol secondary, fixes 1-8): ct-toolkit.md 3.5 is now the pistol secondary (jammer and disruptor merged, ten rows, DRAFT again); 3.6 points to it; sections 2, 4, 5, 6, 7, 8, 9 updated; backlog item 22 removed; V3 row renamed.
  No secondary-fire or fire-mode input exists (actions.ts:2-52; `fireMode` is semi / auto data, weaponDefs.ts:41). Proposed: desktop H, pad A while aiming, touch "Pulse" chip; V3 confirms. New map field `disrupt` (section 5).
  Handover.md: lines 43-47 edited clause by clause (they also carry the rest of the approved kit), fix 7 line added once.
  Cascade: touches no other stage; nothing after V0 reads the spec yet (V1-V3 not started, P04 onward not started).
- 2026-10-11 P03T campus tools: facts site limit 110 x 80; meta.buildings, level footprint lists, rooms[].building, level H, ring-exempt INFO. check.mjs: A21 (buildings 48 x 30 inside the site, no overlap), A14 over rect lists, new A31, A29 lists exempt openings as INFO notes; plans.mjs: building outlines and ids, bay grid per building, exterior and services filtered on overlapping levels; expand.mjs: level stack follows level footprints. schema.md 1, 2, 5, 6, 7 updated (+32 lines).
  Baseline (sample 27 PASS / 0 WARN / 0 FAIL, blocks 25 / 1 / 1) unchanged per check id; A31 PASS on both; blocks shows one INFO line under A29 (D-B-DUCT). Old plan SVGs identical. Tool tests 79 -> 91 pass. npm run check: lint and build pass, 779 of 780 tests (kestrelMap copy test fails before and after: waits for the B0 rerun).
  Not tested: A30 on a campus layout built with modules (its serving test compares floors only, schema 6). Downstream: P03B uses meta.buildings, level footprint lists, rooms[].building and level H; the B0 rerun must update src/world/maps/kestrelGeo.ts and kestrel.ts, which read meta.footprint and one footprint rect per level (kestrelGeo.ts:85).
- 2026-10-11 P02 campus brief: 02-building-brief.md rewritten (419 lines, DRAFT). A 36 x 24 (two storeys at 4.2), B 48 x 30 (18 m two-storey west strip, 30 x 30 hall block, 6.6 roof), generator wing 24 x 12 behind a 1.5 passage, site 108 x 76; 151 schedule rows (AG/AF/AR/LF/BG/BF/BR/BU/TB/X).
  Lifts: 630 kg machine-room-less traction beside each main core, shaft 2.5 x 2.5, pit 1.1, no overrun, zone 3 only. Gallery sits in the strip (3.0 ceiling), stair in a well; level U -1.6, 1.5 clear; vault and tunnel -3.6.
  Zone corrections: S2 = 2 and 3, X = 1 to 3; tunnel and vault 4. Max stack 3. ASK-1 to 7, 5 questions.
  Downstream: P03B redoes the block plan (both lift shafts); schema.md ring-to-space line stale; kit rows (tension g); builders make lifts closed shafts.
- 2026-10-11 V0 answers applied: kit approved; V3 builds only the kit (disruptor, airfoil, knife to docs/backlog.md items 22-24, specs kept); snap cover replaced and deleted in V1; minigames only (hold mode removed); RULES 11 exception recorded. Spec status stays DRAFT until Michael approves V0.
- 2026-10-11 V0 toolkit spec: docs/systems/ct-toolkit.md (234 lines, DRAFT). Ten tools, each with fiction, targets, controls (desktop, pad, touch), timing, noise and light, noticing, S0 interaction, ghost tag, co-op and camera; numbers TUNE or F / SN ids. Mission kit as `MissionDef.kit` (absent = everything); map fields `lock`, `seal`, `optic`, `alarm`, `hack`, `cut`, `lines` for P06.
  Dead Line kit proposed: in wall hug, optic, lockpick, hacking, jammer, shocker (2), interrogation; out disruptor, airfoil, knife. Build plan V1-V3, all before B3.
  Findings: `GADGETS` is in src/game/gadgets.ts, not src/config; no toolkit verb exists in code yet; bindings for the optic (F, R3) are proposals V1 checks. 5 questions for Michael (kit, disruptor realism, snap cover, RULES 11 exception, minigames).
- 2026-10-11 P01 revision (civilians, traversal, two tracks; fixes 1-8): 01-mission-brief.md 299 lines, DRAFT. 20 guards + 7 civilians (night duty engineer, NOC operator, night cleaner in A; facilities engineer, remote-hands technician, two visiting tenant engineers in B). Generator test moved to the facilities engineer; the freed guard post is the B ground rounds officer.
  Two tracks: A (card, cameras, cage number and key safe code, key safe) and B (reach B, scout, B credential, take position) meet at the secure zone, which needs one item from each (roof shaft: roof key + B's roof; riser: B credential + cameras looped). Beats keep ids B1-B10 with a track column. New 4.4 civilian opportunities, civilian column in 4.2, traversal rows (zip line not used).
  Time: solo 42.5 min (17 moving, 25.5 waiting); split team 36-39 min. RULES.md: sections 1 (two tracks, traversal), 2 (guards and civilians), 12 (S6). New ASK-16 to 19.
  Downstream: P02, P04S, P07, P08, S5, S6 recheck (lines at the end of the brief); TALLY radio line still names the duty engineer.
- 2026-10-11 CAM camera fix: diagnosis on the B0 map: kestrel geometry already blocks the camera (one static G.STATIC body); the faults were the single thin ray (camera 1 cm inside a corridor wall, 4 cm past the hit allowed), the shoulder point only pulled 75% back and the pivot never tested from the head, no floor or ceiling test (2 cm under a 1.5 m ceiling), and the near plane cutting walls 1-3 cm away (G20, S-MAIN, S-FS1, S-FS1R).
  Fix: src/player/shoulderCamera.ts sphere casts head -> pivot -> shoulder -> camera, up / down probes, near plane only while close; pure maths src/player/cameraBounds.ts; numbers in src/config/camera.ts; ShapeCastResult export in src/core/babylon.ts. tests/cameraBounds.test.ts (17), scripts/e2e-camera-bounds.mjs (REQUIRED, COVERS the camera files).
  Checks: e2e-camera-bounds 13 of 13 pass (old camera: corridor 40-43 bad frames per run, S-MAIN 115, S-FS1 63); yard within 0.27% of the old framing; check: lint, build pass, 779 of 780 tests (kestrelMap copy test fails before and after: docs blocks wait for the B0 rerun); e2e:quick all pass (e2e-touch KNOWN FLAKY; e2e-desktop:1 failed a performance-note save once, passed alone).
  Level U is not in the built map: the low-space run used a 1.5 m test box ("rerun after B0"). Note for B0: level U in the docs blocks is a 1.5 m void under a 0.3 m slab, so 1.2 m clear; F32 says 1.2 m fails for crouching. GPU and perf: pending PC run.

## Camera fix (CAM)
- What changed: the camera checks walls with spheres, not one ray, from the head to the pivot, the pivot to the shoulder and the shoulder to the camera, so none of them ends up behind a wall, and no wall can cut the edge of the view. It pulls in at once and eases back out. Under 1.9 m of clear height it shortens the boom to 1.4 m, keeps the shoulder point between floor and ceiling and flattens the camera's up / down swing, easing back when the space opens. In the open nothing changes.
- Try on PC (`/?autostart=kestrel&mode=sandbox`): hug a corridor wall and turn round slowly and fast on each shoulder; walk up the main stair and both fire stairs looking back down; crouch into a low space (level U after the B0 rerun; any duct on other maps); open the yard and check the framing feels as before. Watch for a snap or jitter when a wall comes in or goes away.

## Decisions by Michael
- 2026-10-11 Task size: P03B-1b stopped (too big). Sessions are capped by decisions (about 15-20), not lines; layout is one level of one building per session; stage sessions run medium or low effort, never high; commit and push after every table. P03B-1b is split into 1b-G, 1b-F, 1b-R and 1c by floor the same way. RULES 7, PLANNER, lessons updated.
- 2026-10-11 V0 revision: the camera jammer and light disruptor are one pistol secondary function (Chaos Theory OCP style), always available in every mission, not a kit tool; it disables lights and electronics briefly on a recharge.
- 2026-10-11 P02 ASK-6: the 1.2 m raised-floor pedestal grid stays in the brief as a real fact; pedestals are "not modelled", so P04 and the builds leave them out of level U.
- 2026-10-11 P02 questions: generator hall is a separate wing behind B (1.5 m passage); key-only and exit-only doors (manhole, fire exits, passage door, wing doors, compound gates) are exempt from the zone step rule; office corridors 2.4 m clear under the 1.5 m void accepted; sizes A 36 x 24, B 48 x 30, site 108 x 76 accepted.
- 2026-10-11 P02 campus brief: handover.md 'Decisions to carry into P02' adopted as Michael's decisions.
- 2026-10-11 P02: one passenger lift per building at the main core, locked off at night; no goods lift.
- 2026-10-11 V0 questions: Dead Line's kit approved as proposed (in: wall hug, optic cable, lockpick, hacking, camera jammer, sticky shocker 2 rounds, interrogation; noisemaker, sticky cam, EMP, sleeping gas). V3 builds only Dead Line's kit; the light disruptor, ring airfoil and knife are not built now, their specs stay in ct-toolkit.md and each has a backlog line. V1 replaces snap cover (`src/cover`) with the wall hug and deletes it. Lockpick and hacking are minigames only. RULES.md section 11 exception for V1-V3: they may change the player controller, the camera and the grab and takedown code, and add src/config/tools.ts and the `toollab` debug map; no existing tuning value changes. This also brings the toolkit into the RULES.md section 2 scope.
- 2026-10-11 Chaos Theory toolkit: the engine gets the full Chaos Theory toolkit (wall hug, optic cable, lockpick, hacking, camera jammer, light disruptor, sticky shocker, ring airfoil, interrogation, knife); each mission offers only the tools that suit it through a mission kit; every tool is realistic and respects the ghost rule. V0 writes the spec (docs/systems/ct-toolkit.md) and proposes Dead Line's kit for approval; build sessions V1-V3 follow it and all finish before B3.
- 2026-10-11 P01 revision: 20 guards plus 7 civilians (each with an employer and a job); two parallel tracks (A in Building A, B in Building B) that meet at the secure zone, which needs one thing from each; every movement the engine supports appears at least once on a real element; no zip line on this campus (saved for a future mission); S6 civilians added to the build order after S5.
- 2026-10-11 CAM exception to RULES section 11: the CAM session may change the third-person camera code and src/config/camera.ts; nothing else in src/player, src/ai or the movement config.
- 2026-10-11 Campus redesign after the massing walk (RULES.md sections 1, 2, 12 updated; every design stage reruns):
  - Mission 1 is a campus of two buildings: A (2004 original: offices, security room, night operations desk, records) and B (2021 phase 2: secure data hall, meet-me room, Pell's cage), joined at first-floor level by an enclosed link bridge; shared grid, materials and storey logic, not identical. Objectives 1-4 at the site and in A, 5-6 in B, 7 out through the yard.
  - Control ladder: a real control at every zone boundary and move inward, plus knowledge gates; each control has a realistic alternative with a cost.
  - Secret routes, each with a real reason to exist: service tunnel, pipe rack, link bridge roof, cooling supply shaft (rappel, bolted alarmed grille), corridor ceiling voids (never into rooms whose walls run to the slab), risers with fixed ladders, smoke vents, carrier manhole and vault, underfloor void under B's hall with hinged hatches.
  - B's hall is entered only from upstairs (mantrap, secure corridor, gallery, stair down); its ground equipment door is locked, no outside handle or reader, opens only from inside, alarmed, never a way in.
  - Extra rooms: gas suppression, indoor generator hall with catwalks, CCTV equipment, key safe, customer staging and shipping cage, tape library, customer lounge, post room, locker room, media destruction. Office floors: corridor-only suspended ceilings, 1.5 m crawl void, about 4.2 m floor to floor.
  - Ghost rule: every objective in order can be done as a perfect ghost (no detection, alarm, takedown, kill or grab); every critical-path control has a no-contact solution. Investigations are allowed if nobody is seen; the cooling trip is not an alarm; fire alarm, gas warning and anything raising the alarm level are. Grab, takedown, clone-by-grab and fire-alarm lock release stay as louder alternatives only.
  - Scope: site at most 110 x 80 m; each building at most 48 x 30 m; about 8 guarded spaces plus the way out; critical path 450-650 m; solo ghost run 35-45 min, speedrun 12-16 min; 20 guards plus 1 civilian (night duty engineer); at most 12 awake through dormant guards (S5 may test a higher desktop cap as a recorded decision, not by default); roster table to be redone in the P01 revision. (superseded 2026-10-11 by the P01 revision: 20 guards plus 7 civilians)
  - Performance: desktop is the performance target; the phone is for quick light-preset tests only, no stage tunes for it; phone controls must still work.
  - Order: P01 revision (campus), P02 campus brief, P03B campus block plan, P03R campus review, B0 massing walk rerun, CAM camera fix, then P04-P05, early walk B1-B2 then BR, P04S, P06-P10, B3, B4, S1-S4, B4S, BR, S5, B5, B6, BR, B7.
  - The "secure entry upstairs" revision was stopped and not applied; its ideas carry into the campus brief.
- 2026-10-10 P03B approval: add a ground-floor staff WC (G27) in zone 3 off G20, P04 places it; depot facade 7.0 m, viaduct 9.0 m to its deck; the three A07 block-arch failures are accepted until P04's real doors.
- 2026-10-10 P03B questions: loading bay G07 sits under the first floor at 3.0 m clear (brief 4.0; P04 records it); carrier manhole X10 moves to the north service strip beside the vault (short duct), reached from G22's exit-only fire door along the strip, brief 02 updated (revision row P03B Q2); critical path 388 m accepted.
- 2026-10-10 P03 Part C questions: A07 corner rule applies to corridors and play-space rooms only (service rooms just need the door inside the wall); mantrap ring 4 and A29 steps 1-2-3-4-5 with 3+ beside 3 only; A11 takes dog-leg stairs and the stair cores go back to 6.0 m; fire stair stays 3.0 wide and the customer cage 3.5 deep (brief deviations for P04).
- 2026-10-10 P03 Part B questions: door end-clearance is measured from the opening's near edge; levels get an optional footprint rect for the first-floor-over-the-front-block-only shape (ground and roof use the full footprint, the first floor its own smaller rect).
- 2026-10-10 P01 questions: bible 5.8 triggers are assumed (zone trigger for objective 1; objective 6 starts the generator test); the carrier route passes a corner of S5; all 16 guards armed with sidearms; alarms never fail the mission (only killing the civilian); the four sleeping guards are chosen by P07.
- 2026-10-10 S0 questions: a shot camera makes a manned desk send a guard; cloning = hold a cloner to a grabbed guard's card; keycards are taken automatically on any takedown of the holder; the iris enrols the night duty engineer and the duty manager (no civilian system yet); cameras or beams switched off at the panel are noticed when the desk is next manned (a guard is sent).
- 2026-10-10: map first. Order: P01-P03, P03B block plan, B0 massing walk, P04-P05, early walk B1-B2 then BR, P04S, P06-P10, B3, B4, S1-S4, B4S, BR, S5, B5, B6, BR, B7. Designers use S0's SN numbers; the systems are built after the design. S1 Part A is already built; S1 Part B runs in its slot after B4.
- 2026-10-11 Session size rules added to RULES.md section 7 (RU3).

- 2026-10-11 SETUP-1: task size and reading rules, lessons.md, progress archive; Kestrel sessions skip CLAUDE.md's main-project reading.
- 2026-10-11 SETUP-2: planning runs in Claude Code planner sessions; prompts live in docs/kestrel/prompts/; questions carry a recommended option; one step at a time.

## BLOCKED
