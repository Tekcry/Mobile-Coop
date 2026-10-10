# Kestrel - progress

| Stage | Prompt | Status | Commit | Date |
| --- | --- | --- | --- | --- |
| P00 | Setup, rules, facts | APPROVED | 8945ddb | 2026-10-10 |
| S0 | Security systems spec | APPROVED | 65e28f9 | 2026-10-10 |
| S1 | Cameras and security desk | DRAFT (Part A done, Part B to run) | 478c3b8 | 2026-10-10 |
| S2 | Card readers, keycards, mantrap | not started | | |
| S3 | Beam detectors and PIR lights | not started | | |
| S4 | Security co-op sync and controls | not started | | |
| S5 | Dormant guards (Part A, Part B) | not started | | |
| P01 | Mission brief | APPROVED | 30fad8a | 2026-10-10 |
| P02 | Building brief | APPROVED | d0fc54f | 2026-10-10 |
| P03 | Tools | APPROVED | 81e50aa | 2026-10-10 |
| P03B | Block plan | DRAFT | 5ff1e6f | 2026-10-10 |
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
- 2026-10-10 P03B approval changes: staff WC zone G-Z3W (2.5 x 4) off G20 beside a 3 m mantrap; north block shifted 0.5 m east (all zones still at or under 85%); depot facade 7.0 m, viaduct 9.0 m; brief 02 gets G27 (revision row). Check 25 PASS, 1 WARN (A10), 1 FAIL (A07, accepted). Critical path 385.1 m.
- 2026-10-10 P03B: docs/kestrel/kestrel.blocks.json (36 zones and corridors, B/G/F/R), 03B-block-plan.md (137 lines), plans/blocks-{B,G,F,R}.png. Building x 15-63, z 22-52; first floor front block z 22-37.5; north block hall, gallery, power, meet-me. Critical path 387.7 m.
  Check: 26 PASS, 1 FAIL (A07: three block arches on 4 m corridor-end walls, left for P04), A30 SKIP (no modules; fire stairs checked by hand).
  Deviations raised: loading bay 3.0 m under the first floor (brief 4.0), G23 29 m and F08 48 m long, 4 m north service strip. Michael answered the 3 questions: X10 moved beside the vault (duct 3 m, G22 fire door now opens to the strip); check now 25 PASS, 1 WARN (A10), 1 FAIL (A07).
- 2026-10-10 P03 Part C revision (Michael's 3 answers): A07 corner rule only for corridors and play-space rooms (rooms[].service added, set by service modules); A29 steps 1-2-3-4-5 with 3+ beside 3 only; mantrap back to ring 4; A11 teaches stairs[].layout "dogleg" (two flights side by side, 1.3 m landing for fire stairs, 2.0 otherwise); stair cores back to 6.0 m as dog-legs, main core uses two 1.3 m flights. Fire stair stays 3.0 wide, cage 3.5 deep (P04 records both as brief deviations). 78 tests pass (check 51, expand 27).
- 2026-10-10 P03 Part C: module kit. scripts/kestrel/modules.json (37 modules: the 35 listed plus corridor and lift-shaft), expand.mjs (layout to rooms, walls, openings, objects, stairs, ladders, voids; shared walls merge; rotations; manual and untagged items kept; items it wrote carry "gen"), expand.test.mjs (23 tests incl. every module x size x rotation alone in a filler frame), docs/kestrel/sample.layout.json. check.mjs: A28 ring, A29 ring steps, A30 fire stairs / roof / staff WC and janitor (runs only when a room has a module); check.test.mjs now 49. 72 tests pass.
  Fixed Part B bugs found by the kit: A06 counted a collinear wall beside an edge as a gap; A26 flagged each rack against the next-but-one rack and the wall behind its neighbour (now a gap with a tall thing across it is ignored). plans.mjs leaves off an object id that does not fit.
  Schema calls to confirm (schema.md section 7): A07 means small rooms need a wall that runs on past them; mantrap ring 3+ (brief says 4); stair cores 8.0 m (brief 6.0) because A11 wants a 7.13 m run, fire stair 3.0 wide, customer cage 3.5 deep; rack depth, height and other fixed contents are general knowledge, not facts. New fact kit.ringStepMax.
- 2026-10-10 P03 Part B: scripts/kestrel/check.mjs (A01-A27, SC01-SC06, empty GAMEPLAY CHECKS (P09) section; exports runChecks) and check.test.mjs (40 tests: clean sample, a trip case per FAIL/WARN check, CLI exit codes, missing fact = SKIP; all pass). Fixed Part A's flaw in plans.mjs: a room label now goes where it clears stairs, voids and objects (full, then narrow, then small font), else into a callout column right of the site with a leader line; void label moved above its rect. Sample: downpipe E001 moved to x 17.5 (A02 grid). New facts: render.labelSteps, labelSpread, calloutGap, calloutPad.
  Schema calls to confirm: stairs[].flights is optional (default = fewest flights at 18 risers or less, straight run); fire-door = exit-only (SC02); opening end-clearance measured from the opening's near edge; A14 covers each upper level over its optional levels[].footprint (default meta.footprint; Michael's answer, below); A20 counts floors plus non-noLedge object tops at 1.9 m or more; the checker FAILs a wall that is not on the X or Z axis. All in schema.md section 6.
- 2026-10-10 P03 Part A: docs/kestrel/schema.md, scripts/kestrel/facts.json (about 150 leaves, each with src), lib.mjs (shared loader and clear-size helper, added so Parts B and C reuse it), plans.mjs (SVG + PNG per level; --play and --security overlays), docs/kestrel/sample.arch.json. Rendered the sample (G, F, and with a scratch play and security file); walls, door arc, window, hatched stair with UP/DN, voids, labels all drawn. Prompt's play schema was cut off; Michael re-sent it and schema.md uses the full version.
  Schema calls to confirm: rooms[].open holds edge letters W/S/E/N; ring may be "3+"; lamp, switch and service points are [x, y, z]; a door leaf swings toward between[1]; devices[].level may be an id or a name. No rule number is typed in the scripts (only drawing arithmetic).
- 2026-10-10 P02 revision: fixes 1-2 applied to 02-building-brief.md (291 lines, DRAFT). G06's only door now opens from G20 (window onto G01 kept), so no zone-2 door into 3+. Fire stair 1 (G24/R02) moved from NE to the SE corner of the front block; both fire stairs serve the first floor (first-floor escape ~24 m). Area sums unchanged. Downstream: P04, P06 recheck G06 and G24.
- 2026-10-10 P02: docs/kestrel/02-building-brief.md (260 lines, DRAFT). Cinder Yard, 48x30 building on a 6.0 m grid, site 78x56. 42 rooms/areas across basement (vault), ground (reception, secure core, goods), first (staff), roof (plant). Every fixed-program room placed in its zone; zones confirmed S1=1..S6=5. Area arithmetic fits each floor. Two fire stairs (NE roof-to-ground, SW), data-hall fire exits, manhole X10 by the facilities fire exit, second exit via vehicle gate/loading apron. 4 ASK items, 4 questions. Michael answered same day, applied: added zone-3 plant/services corridor G22, zone-2 goods lobby G26, hall ceiling 5.0 m, one carrier vault/manhole. 276 lines, DRAFT.
- 2026-10-10 P01 revision: fixes 5-7 applied to 01-mission-brief.md (207 lines, time 37.5 min, DRAFT). Zones S3 = 3+, S4 = 3; carrier route passes a corner of S5 again, P02 places the manhole near an exit-only fire door; fence and fence rattle removed from B8.
- 2026-10-10 P01 revision: fixes 1-4 applied to 01-mission-brief.md (204 lines, time 37.5 min unchanged, DRAFT). Iris keys: engineer or manager; exit by vehicle gate or loading apron; carrier route by yard manhole, vault, riser; zones 1, 2, 3, 3+, 4, 5. Downstream lines at the end of the brief.
- 2026-10-10 P01: docs/kestrel/01-mission-brief.md (194 lines, DRAFT). Seven objectives mapped to beats B1-B8 (one per space, S1 has none); time 37.5 min (13 moving, 24.5 waiting); tension 1,3,2,4,3,5,4,5.
  Design calls: duty manager's master card is the one keycard (drawer, takedown or clone); engineer is the iris key, found in the ops register; carrier route in cable chamber under the yard; generator test event-driven.
  12 ASK items, 5 questions for Michael (triggers, carrier route vs space-skip, guard weapons, alarm fail, which four sleep).
- 2026-10-10 S1 Part A: cameras only. src/config/security.ts, src/security/ (camera, data, securitySystem, securityView), seclab map (MAPS only, modes [] so it is off the menus), tests/securityCamera.test.ts (19), scripts/e2e-security.mjs (REQUIRED, 18 checks), facts F40-F52. GameState builds SecuritySystem from layout.security and chains weapons.onRay (no src/ai, src/player or movement / camera config change).
  Findings: SN08 and SN10 hold at 1.3 m/s only (10.8 s at SN10 for 1.5 m/s+); sight is one head ray (prompt) not three (S0); the ray helper is the public Ballistics.ray; the guard seat and guard mode (clear) wait for Part B; EMP and HUD arcs not built.
- 2026-10-10 S0: docs/kestrel/S0-security-spec.md (264 lines, DRAFT). Six systems, 2+ counters each, numbers SN01-SN67 (proposals; detection times derived from PERCEPTION).
  Alerts only through existing functions: Enemy.notice / searchAt / alert, EnemyManager.lightsOut / hear / alarms -> onAlarm -> reinforce. No instant fail.
  Map file adds fields door2, enrolled, controls, responders, minPlayers and kind fault (reasons in section 6).
  6 ASK items (private alarm and ray helpers, civilian grab, closed InteractKind, HUD arcs, shot hook). 5 questions for Michael, answered the same day and applied to the draft (clone from a held guard, cards on takedown).
- 2026-10-10 P00: branch feature/kestrel made from ct-movement (e60c835). RULES.md saved word for word. 00-facts.md: 33 rows read from code and docs; 4 notes under NOT FOUND (nav ladder standoff, drainpipe climb speed, lighting doc numbers, F28 key is "type"). Coordinates: north +Z, east +X, up +Y. Three scripts/e2e-dead-line*.mjs files are not covered by RULES section 4.

## Decisions by Michael
- 2026-10-10 P03B approval: add a ground-floor staff WC (G27) in zone 3 off G20, P04 places it; depot facade 7.0 m, viaduct 9.0 m to its deck; the three A07 block-arch failures are accepted until P04's real doors.
- 2026-10-10 P03B questions: loading bay G07 sits under the first floor at 3.0 m clear (brief 4.0; P04 records it); carrier manhole X10 moves to the north service strip beside the vault (short duct), reached from G22's exit-only fire door along the strip, brief 02 updated (revision row P03B Q2); critical path 388 m accepted.
- 2026-10-10 P03 Part C questions: A07 corner rule applies to corridors and play-space rooms only (service rooms just need the door inside the wall); mantrap ring 4 and A29 steps 1-2-3-4-5 with 3+ beside 3 only; A11 takes dog-leg stairs and the stair cores go back to 6.0 m; fire stair stays 3.0 wide and the customer cage 3.5 deep (brief deviations for P04).
- 2026-10-10 P03 Part B questions: door end-clearance is measured from the opening's near edge; levels get an optional footprint rect for the first-floor-over-the-front-block-only shape (ground and roof use the full footprint, the first floor its own smaller rect).
- 2026-10-10 P01 questions: bible 5.8 triggers are assumed (zone trigger for objective 1; objective 6 starts the generator test); the carrier route passes a corner of S5; all 16 guards armed with sidearms; alarms never fail the mission (only killing the civilian); the four sleeping guards are chosen by P07.
- 2026-10-10 S0 questions: a shot camera makes a manned desk send a guard; cloning = hold a cloner to a grabbed guard's card; keycards are taken automatically on any takedown of the holder; the iris enrols the night duty engineer and the duty manager (no civilian system yet); cameras or beams switched off at the panel are noticed when the desk is next manned (a guard is sent).
- 2026-10-10: map first. Order: P01-P03, P03B block plan, B0 massing walk, P04-P05, early walk B1-B2 then BR, P04S, P06-P10, B3, B4, S1-S4, B4S, BR, S5, B5, B6, BR, B7. Designers use S0's SN numbers; the systems are built after the design. S1 Part A is already built; S1 Part B runs in its slot after B4.

## BLOCKED
