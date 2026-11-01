# Coverage check: old catalogue (A1-L1) vs the six area audits

Scope: `docs/research/ct-movement/ct-footage-catalogue.md` as corrected by `docs/ct-prototype/FOOTAGE-CATALOGUE.md` Part 2 (lines 690-end, per-clip corrections, every "Missed" move, action menu notes). Text only, no images or video opened.
Audit files read in full (2026-10-20 00:37): LOC = AUDIT-LOCOMOTION (38 rows; it was still being edited, rows 21-38 appeared during this check), CAM = AUDIT-CAMERA (18), AIM = AUDIT-AIM (19), WALLS = AUDIT-WALLS (30), TRAV = AUDIT-TRAVERSAL (22), MENU = AUDIT-ACTIONMENU (10).
Clip names are HHMMSS (old clips of 2026-10-17). Times are tile times (+-1 s) as in the catalogue.

Audit column key:
- `FILE #n` = a delta row covers it.
- `FILE Missing-list` = named only in that file's "Missing entirely" list (a plan, no measured delta row).
- `FILE (matches)` = only in the file's "Matches CT, no change" line.
- `PARTIAL` = a row touches it but not the specific move; see note.
- `MISSING` = no audit row or list entry.
- `NO FOOTAGE` = the old catalogue has no clip for it (audit says so or is silent).
- `NOT A MOVE` = UI / HUD / visual item the catalogue notes; listed so nothing is dropped.

## 1. Coverage table

| # | code | clips @ s | movement / action | audit row | note |
| --- | --- | --- | --- | --- | --- |
| 1 | A1 | 145526, 145524, 145515 etc (stills) | stand idle, weapon away, side / front / behind / high | LOC #20 | stills only, breathing from 043858 |
| 2 | A1 | 035847 0-23, 31-41 | camera orbit round the standing hero (front, side, behind) | CAM #18 | PARTIAL: look rate only; no row for orbit freedom or the top-down limit |
| 3 | A1 | 035847 19-23 | camera almost straight above the standing hero (top-down view) | CAM #18 | PARTIAL: view only, no row for the pitch limit |
| 4 | A1 | 035847 24-30 | slow repositioning walk with small steps, then stop | LOC #25, #33 | low value |
| 5 | A1 | 035847 3-8 | hero leans or steps while the camera tilts (dutch angle at 5) | MISSING | unresolved in Part 2 ("frame-step before using as idle"); check whether it is a real idle weight shift |
| 6 | A2 | 145602, 145605 | rifle aim over the shoulder, left and right | AIM #6, CAM #2 | |
| 7 | A3 | 145628, 145631 | pistol aim over the shoulder, left and right | AIM #5, #6 | |
| 8 | A4 | 145708, 145726, 145730, 145718, 145701... | crouched idle stills (side, front, behind) | LOC #24, #3, #4 | kneel is the crouched rest |
| 9 | A4 / C5 | 050933 21-25, 42-47 | crouched idle wait (about 5 s) | LOC #24 | |
| 10 | C5 | 050933 43-46 | crouched idle, hand drops to the floor | LOC #24, LOC Missing-list | audit says not frame-stepped |
| 11 | A5, B3, C6 | none | rifle out but not aiming | AIM #17 | CT has no such state; audit agrees |
| 12 | A6 | 043832 0-13, 043858 3-12.5 | standing idle breathing, fixed camera | LOC #20 | |
| 13 | A6 / C2 | 043858 0-3, 043841 0-1.6 | walk in and stop to idle | LOC #33 | PARTIAL: row is stop per gear, no separate walk-in |
| 14 | A "(other)" / I6 | 034747 0-2, 034803 0-3 | human shield: pistol one-handed over the held guard's shoulder | AIM Missing-list (4), WALLS #19 | no AIM delta row |
| 15 | A "(other)" / I6 | 034747 0-2, 034803 0-2 | INTERROGATE prompt shown while holding | MENU option sets, WALLS Missing-list (interrogate) | |
| 16 | B1 | 050259 0-11 | standing walk through the gears, slow to fast | LOC #14, #21, #22 | |
| 17 | B1 | 050259 11-17 | standing run (cadence, posture, flight, heel kick) | LOC #7, #8, #23 | |
| 18 | B1 / C1 / D5 | 050259 12-14, 050649 5-8, 19-21, 050827 22 | run-speed reversal (180 at pace) | LOC #11, #10 | |
| 19 | B1 / C4 | 050259 11-12, 050649 10, 050827 11, 28 | stop from run | LOC #9, #33 | |
| 20 | B1 | 050259 17-18, 050827 19-21 | run or jog slowing to a walk (deceleration, not a stop) | LOC #33 | PARTIAL: only stop-to-still is measured |
| 21 | B2 | 050330 0-9 | crouch walk through the gears | LOC #15, #28 | |
| 22 | B2 / C5 | 050330 12.5-17, 050933 7, 13, 20, 26, 32, 053816 2-4 | crouch run (bursts, deep lunge) | LOC #16 | |
| 23 | B2 / D6 | 050330 12-14, 050933 20, 26 | crouch-run reversal | LOC #11, #10 | PARTIAL: row measures the standing run reversal only |
| 24 | B2 / C5 | 050330 18, 050933 | crouch run slowing to a crouch walk | LOC #33 | PARTIAL: as row 20 |
| 25 | B2 | 050330 10-12 | crouched and stationary at a door | LOC #24 | |
| 26 | B4 | 050541 7-10, 38-42, 051709 8 | aim walk forward and back (small steps while aiming) | AIM #18, LOC #31 | legs out of frame |
| 27 | B4 | 050541 1-45 | aim strafe | AIM #18, LOC #31 | NO FOOTAGE in any clip, audits say so |
| 28 | B4 / D7 | 050541 17-35, 051543 1-14 | aim turning with the camera (rigid upper body) | AIM #12, #4, #9 | |
| 29 | B4 / F5 | 050541 45-58 | rifle shoulder swaps, lowered between | AIM #10, CAM #9 | |
| 30 | B4 / F3 | 050541 0-1, 50, 55, 58 | rifle raise and lower (repeated) | AIM #1, #2, CAM #13 | |
| 31 | B4 | 050541 58 | walk away right after lowering the aim | AIM #2 | |
| 32 | B4 | 050541 3, 13, 15-16, 26, 32, 34-35, 46 | small ring reticle visible on a distant door while aiming | AIM #5 | PARTIAL: reticle position only, no row for the ring itself |
| 33 | C1 | 050649 9, 14-15, 050827 10, 18, 27, 32 | start from stand or walk to a full run (burst) | LOC #13, #34 | |
| 34 | C2 | 050649 22-26, 050718 3-6 | stop from a walk | LOC #33 | 050718 shows no confirmed stop (Part 2) |
| 35 | C3 / C4 | 050827 10-11, 18-21, 27-28, 32-33 | repeated full-speed burst and stop cycle at middle and top gear | LOC #13, #33, #14 | |
| 36 | C4 | 050827 22 | burst with a hard lean-in turn at the door | LOC #11, #12 | |
| 37 | C5 | 050933 7-19, 26-41 | crouched starts and stops (crouch run bursts, slow crouch walk between) | LOC #15, #16, #33 | PARTIAL: LOC #34 says no clean crouch start from rest |
| 38 | C5 | 050933 20-25 | arrive at a door crouched, wait with the door menu showing | LOC #24, MENU #3 | |
| 39 | C1..C5 | 050259 11, 050649 9, 15-17, 20-21, 050933 20, 26 | passive menu while passing: HACK RETINAL SCANNER, BODY (single row, not used) | MENU #3, option sets | |
| 40 | D1 | 051044 0-35 | standing turn on the spot, slow stick circle (about 5 rotations) | LOC #1, #2, #10 | |
| 41 | D1 | 051044 32-35 | standing front-view idle | LOC #20 | |
| 42 | D2 / D3 | 051250 0-28 | 180 flick and fast spins | LOC #10, #30 | |
| 43 | D2 | 051250 0-5.75, 12.5-18 | slowest stick speed walks backwards without turning | LOC #19 | |
| 44 | D4 | 051401, 051339 2-16, 053437 26-28, 34-35, 053525 23-27, 054237 4 | walking curves and 90 deg turns while moving | LOC #1, #10, #21 | |
| 45 | D5 | 051339 17-32, 051421 1-8 | fast turns and reversals at run | LOC #11, #10 | |
| 46 | D5 | 051339 17-32 | body bank (lean into fast turns) | LOC #12, #30 | |
| 47 | D5 / C4 | 051339 33, 051421 12-13 | run slows to a near stop after a turn | LOC #33 | PARTIAL: as row 20 |
| 48 | D6 | 051501 0-16 | crouched turn on the spot, slow | LOC #1, #29 | |
| 49 | D6 | 051501 17-27 | crouched fast spins | LOC #10, #29 | PARTIAL: row 29 is the slow crouched turn; fast crouched spin has no own row |
| 50 | D6 / E1 | 051501 28 | stand up out of the crouch after the spin (unconfirmed) | LOC #35 | |
| 51 | D7 | 051543 15-32 | aim pitched fully down and back up | AIM #4 | PARTIAL: AIM row 4 reads rigid pitch to 60-65 deg; limits not a row |
| 52 | D7 / F3 | 051543 0-1 | rifle raise to start the aim | AIM #1 | |
| 53 | E1 | 053800 0-15 | stand to crouch and back, still and on the move | LOC #17, #35 | |
| 54 | E1 | 053800 4-7, 10-11, 14-15 | standing walk between toggles | LOC #21 | |
| 55 | E2 | 053816 2-4 | roll from full speed (Part 2: roll one tile at most) | LOC #36 | row 36 gives 0.75 s, 2.3 m |
| 56 | E3 | 053849 1 | standing jump | MISSING | LOC header lists no jump; TRAV #8 is jump-grab only |
| 57 | E3 | 053849 5 | walking jump | MISSING | as row 56 |
| 58 | E3 | 053849 12-13 | run jump | MISSING | as row 56 |
| 59 | E4 | 054103 20-21, 054411 33-34, 055649 38-40 | drop from a hang, land crouched | LOC #18, TRAV #9 | |
| 60 | E4 | 054021 15-16 | drop from the inner rail to the floor (about 1 m), land crouched | TRAV #9, #18 | |
| 61 | E4 | 054502 21, 055717 7 | step off the bottom of a ladder, land crouched | TRAV #12 | |
| 62 | O3-6 | 054802 0-2, 055717 0-1, 055649 41, 052704 25-37 | walk on fire-escape grating and up or down stairs | LOC #38 | PARTIAL: row 38 cites 054702 @ 0-2 and says nothing usable; the catalogue's stair clips are 054802, 055717, 055649 and 052704 (stairwell carry) |
| 63 | F1 | 051606 0-9 | default follow camera: walk, stop 6.5, settle, no recentre | CAM #1, #4, #5, #6, CAM (matches) | |
| 64 | F1 / F2 | 051636 0-10 | camera swings away from travel while walking | CAM #8 | |
| 65 | F1 / F2 | 051636 11-22 | stand and look around (centre, left, right) | CAM #18, CAM (matches) | |
| 66 | F1 extra | 053525 0-4, 8-14 | long walk, default framing | CAM #1 | |
| 67 | F2 | 053525 17-26 | camera orbits round the walking hero | CAM #18 | PARTIAL: rate only |
| 68 | O3-1 | 053437 9-10, 36-37, 053525 5-7, 33-34, 054237 3, 054021 7-10 | camera pulled hard against a doorway or wall | CAM (matches) | N1 pull-in is listed as matching, no delta row |
| 69 | F3 | 051709 0-8 | rifle idle, raise, aim, lower | AIM #1, #2, #6, CAM #2, #4 | |
| 70 | F4 | 051739 0-3.4 | pistol raise, aim, lower | AIM #7, #2, #5 | |
| 71 | F5 | 051812 1-6, 11-15 | pistol and rifle shoulder swap | AIM #10, CAM #9 | |
| 72 | F5 | 051812 7-10 | weapon swap from the wheel while holstered | AIM #13 | |
| 73 | F5 | 051812 10 | hero turns and steps right after the swap | AIM #13 | PARTIAL: AIM says no body motion; clip shows a turn at 10, check whether it is the camera |
| 74 | F6 / F7 | none (105845 31-33 new) | crouched aim | AIM #19, CAM #7 | no old clip |
| 75 | other | 054237 9-14 | aim and fire a rifle outdoors (fire about 11.5-13.5) | AIM #11, #18 | |
| 76 | other | 054237 13-14 | HUD swaps to the pistol and the view goes dark | AIM #13 | unclear in Part 2 |
| 77 | H4 | 052901 8 | rifle shot at a door, ammo count drops | AIM #11, #16 | muzzle flash and ammo HUD are not rows |
| 78 | O3-3 | 053525 17-19, 053709 14, 054411 48-52 | rifle slung on the back (carry) | AIM #3 and "Correction to the catalogue" | |
| 79 | G1 | 161921, 161923, 161926, 161932, 161940 | standing on the wall (stills) | WALLS #3 | |
| 80 | G2 | 161937, 161944, 161947 | crouched on the wall (stills) | WALLS #1 | |
| 81 | G1 | 051917 9-12, 052059 6-7, 14 | turn about 180 deg to put the back on the wall | WALLS #15 | |
| 82 | G1 | 051917 0-8 | walk up to a wall and stop facing it | WALLS #15, #12 | PARTIAL: approach not its own row |
| 83 | G3 | 051917 13-20, 052021 0-8, 052059 7-9 | standing wall slide | WALLS #2, #3 | |
| 84 | G3 | 051917 18, 052021 4-5 | direction reversal at a wall end | WALLS #3, #1 | |
| 85 | G4 | 051917 28-37, 052021 9-16 | crouched wall slide | WALLS #1, #2 | |
| 86 | G4 | 051917 29-34, 161947 | hand on the knee while crouched on a wall | WALLS #18 | |
| 87 | G5 | 051917 21-25, 052021 3-5 | stand at a wall end, edge peek (body) | WALLS #9, #25 | |
| 88 | G5 | 051917 21, 052021 3.5 | peek camera swing in and out | WALLS #10, CAM #11 | |
| 89 | G5 | 051917 25-28, 052021 13-16 | stand up at a corner from the crouch, crouch again | WALLS #16, #10 | |
| 90 | G1 | 051917 25-26, 37-38 | stand / crouch toggle while on the wall | WALLS #16, LOC #35 | |
| 91 | G6 | 051917 5, 11, 052059 1-5, 12, 18-19 | aim tap near or leaving the wall (about 1 s) | WALLS #12, #24, CAM #13 | |
| 92 | G6 / G7 | 052059 16-17 | walk off the wall | WALLS (not measurable list) | PARTIAL: no row, the audit says it was never cleanly shown |
| 93 | G8 / G9 | 052206 0-20 | crouch walk beside a waist-high counter | WALLS #23 | |
| 94 | G8 / G9 | 052206 1, 3 | brief stand-ups during the crouch walk | WALLS #23 | |
| 95 | G8 / G9 | 052206 21-35 | standing walk along the counter | WALLS #23 | PARTIAL: not described as its own pose |
| 96 | G8 / G9 | 052206 27-29, 35-37 | lean round the counter end, stand to crouch at the end | WALLS #23 | |
| 97 | H1 | 052349 5-7 (picked about 5.15) | normal door open | WALLS #4 | audit swaps the old labels, see its note |
| 98 | H1 | 052349 14-18 | stealth open | WALLS #14 | |
| 99 | H1 | 052349 9-10, 052752 5-6 | close door | WALLS #17 | |
| 100 | H1 | 052349 15-17 | camera close to the door while it opens | WALLS #14, #10 | |
| 101 | H2 | 052752 0-12 | walk to door, open, walk through, second open and close cycle | WALLS #4, #17 | |
| 102 | H2 | 053525 27-32, 053709 29-32 | open a door and walk through (outdoor exit) | WALLS #4 | |
| 103 | H3 | 052832 2-17 | a guard paces by a door, steps into the doorway, walks through | MISSING | AI behaviour at doors, no door audit row |
| 104 | H3 | 052832 17-18 | door closes by itself behind the guard | MISSING | |
| 105 | H4 | 053114 1-6 | break lock: crouched at the lock about 2.5 s, door opens | WALLS Missing-list (lock pick / break lock) | no delta row |
| 106 | H4 | 050330 12, 050933 21-25, 053709 29, 052349 | bash door offered, never picked | WALLS #29 | no CT reference by design |
| 107 | H5 | 052952 11-24 | cable-camera view under a door: crouch at the door, pick, floor-level view, pan, exit | WALLS Missing-list (optic cable) | no delta row |
| 108 | H5 | 052952 12, 17-20, 24 | hero crouches at the door before each cable use | WALLS Missing-list | |
| 109 | H6 | 053049 12-24 | lockpick close-up view | WALLS Missing-list (lock pick) | |
| 110 | H1..H6 | 052349 0-14, 052527 1, 052607 2, 052952 0-19, 053437 0-3, 053709 0, 29 | context menu content and behaviour by object (door states, locked, body, grab) | MENU #1-#9, option sets | |
| 111 | I1 | 052527 2-3 | palm strike to the head at a door | WALLS #13 | |
| 112 | I1 | 054824 0-2 | stealth takedown from behind out of a crouch run | WALLS #13 | |
| 113 | I2 / I3 | 052502 0-6 | run-up and strike on a guard facing the hero | WALLS #22 | |
| 114 | I1 / I2 | 055600 0-3 | grab from behind then knock-out by a car (arm and leg extended) | WALLS #5, #20 | |
| 115 | I1 | 052527 3, 054824 3-4 | hero bends or crouches over the body after the strike | MISSING | |
| 116 | I1 / I6 | 052441 12-17 | walk up and grab from behind | WALLS #5 | |
| 117 | I6 | 052607 2-3 | GRAB CHARACTER prompt and grab at a door | WALLS #5, MENU option sets | |
| 118 | I6 | 052441 18-29, 052607 4-6 | hold idle, guard struggles | WALLS #19 | |
| 119 | I6 | 052441 18-29 | walk with the held guard | WALLS #11 | |
| 120 | I6 | 052607 7-8 | INTERROGATE: free hand to the guard's face | WALLS Missing-list (interrogate) | no delta row |
| 121 | I6 | 052607 9-10, 052441 29-30 | knock out from the hold | WALLS #20 | |
| 122 | I6 | 034803 2 | camera swings behind and high during the hold | WALLS #26 | |
| 123 | I4, I5 | none | strike with no guard; lethal attack | WALLS #21 | NO FOOTAGE (WALLS #21 says kill not in footage); I4 has no row |
| 124 | I7 | 052704 0-1, 053849 14-15, 052704 40 | body pick-up (crouch, hoist) | WALLS #6 | |
| 125 | I6 / I7 | 052607 11-19, 052704 2-24, 053049 1-5 | carry the body (fireman carry) | WALLS #7 | |
| 126 | I7 | 052704 38, 053049 5-6, 052607 20 | body drop / put down | WALLS #8 | |
| 127 | I7 | 052704 9, 21-24 | open and close doors while carrying | WALLS Missing-list (doors while carrying), MENU option sets | no delta row |
| 128 | I7 | 052704 25-37 | carry along stairs and a railing | WALLS #7, LOC #38 | stairs gait PARTIAL (row 62) |
| 129 | I7 | 052704 26-40 | tip the body over the railing | WALLS (not measurable list) | unproven, body ends on the landing |
| 130 | I7 / F3 | 052704 39, 053049 7-8 | rifle raise straight after dropping a body | AIM #1 | |
| 131 | J1 | 054021 4-6 | jump onto a counter and mantle (about 1 m) | TRAV #7, #8 | |
| 132 | J1 | 054021 13-15, 054103 2-3 | climb over a rail (inner rail, crouched) | TRAV #19, #21 | |
| 133 | J1 / J2 | 054103 8, 054021 19, 055649 2 | jump and grab an edge or pipe | TRAV #8 | |
| 134 | J2 | 054103 9-19, 054021 20-21 | hang from an edge | TRAV #4, #5 | |
| 135 | J2 | 054103 11-19 | short shimmy along the counter | TRAV #4, #5 | |
| 136 | J2 | 054021 22, 054802 6-9 | pull up from a hang | TRAV #6, #21 | |
| 137 | J1 / J2 | 054802 3-5 | lower into a hang from a platform edge | TRAV #20 | |
| 138 | J2 / J4 | 055649 20-37 | hand-over-hand along a ledge or pipe | TRAV #4, #5 | |
| 139 | J2 / J4 | 055649 3-19 | climb a pipe, then transfer from the pipe to the hang (camera odd angle) | TRAV #1, #2, #3 | PARTIAL: pipe to ledge transition has no row |
| 140 | J3 | 054411 2-12, 18-26 | drainpipe climb up and down | TRAV #1, #2, #3 | |
| 141 | J3 | 054502 3-21 | ladder mount, climb up, climb down | TRAV #10, #11, #12 | |
| 142 | J3 | 055717 2-6 | fire-escape ladder down | TRAV #10, #12 | |
| 143 | J4 | 054411 27-32 | hang from a horizontal pipe, small hand-over-hand | TRAV #4, #5 | |
| 144 | J4 / E4 | 054411 33-34 | drop from the pipe onto a platform | TRAV #9 | |
| 145 | J5 | 164437 (still) | split jump in a narrow corridor | TRAV (not measurable list) | NO FOOTAGE, audit says not in any clip |
| 146 | J6 | 054702 0-30 | wall jump (not achieved; clip is a dumpster hide) | MISSING | NO FOOTAGE; no audit mention of wall jump |
| 147 | J7, J8, J10 | none | skipped or not attempted in the old session (shotlist items not listed in the catalogue text) | MISSING | NO FOOTAGE; cannot name the moves from these files |
| 148 | J9 | 054411 35-47 | enter a vent, crawl on hands and knees, exit | TRAV #16, CAM #17 | PARTIAL: crawl camera and speed only; enter and exit animation not a row |
| 149 | J9 | 054411 36, 45 | EXIT BACK / EXIT FRONT prompts, exit without a press | MENU option sets | |
| 150 | J9 | 054411 48-52 | stooped walk in a larger duct, then crouch | TRAV #16 | PARTIAL: no row for the stooped duct walk |
| 151 | O3-2 | 054702 3-9, 24-30 | pick up an object (bag), carry it, drop it | MENU option sets | MISSING as an animation; menu provider only |
| 152 | O3-5 | 053816 4-5, 050259 11, 050649 9, 15-17, 050933 20, 26 | crouch at a retinal scanner and hack it | MENU Missing-list (stub) | animation MISSING; stub provider only |
| 153 | other | 054021 11-12 | hero at a drawer unit inside the counter (no prompt) | MISSING | unlisted action, check clip |
| 154 | K1 | 053251 3, 4-44, 053200 0, 053323 0-2 | thermal view (guard close then far), switch into it | MISSING | no vision audit among the six |
| 155 | K1..K4 | 053251 3, 052901 3, 9, 16, 053437 1 | vision switch passes through one black frame | MISSING | |
| 156 | K2 | 053437 2-44, 052901 4-15 | thermal walk and thermal through a door, hot window and lamps | MISSING | |
| 157 | K3 | 053525 0-36, 14-16 | night-vision walk, white-out bloom at a bright window | MISSING | |
| 158 | K4 | 053617 0-37 | EMF view, devices visible 31-36 | MISSING | |
| 159 | K3 / K4 | 054201 0-3.35 | vision-mode cycle (thermal, EMF, NV, normal) | MISSING | |
| 160 | other | 053709 0-38 | normal-vision light and shadow walk (window shaft, courtyard lamps) | MISSING | lighting / light parity area |
| 161 | other | 052901 4-7, 10-11 | aim while in thermal | MISSING | AIM does not cover vision-mode aim |
| 162 | L1 | none | co-op moves | NO FOOTAGE | skipped in the old session |
| 163 | all | HUD, many | noise / visibility bar fills on run, crouch run, jump, fire | NOT A MOVE | LOC uses it as method only, no HUD row |
| 164 | all | 051917 21-27, 052021 4, 14, 052059 10-11, 15, 051044 | goggle lights show lit green when the hero faces the camera | NOT A MOVE | visual, no row |
| 165 | UI | 052441 7-11, 052901 0, 053200 1-2, 054702 15-20 | pause menu and save screens | NOT A MOVE | UI, no row |

## 2. MISSING from the audit

Moves with no row or list entry. Best clip is the old clip unless a note says otherwise.

| # | missing move | best clip @ s to measure | area file |
| --- | --- | --- | --- |
| M1 | Standing jump, walking jump, run jump (E3: take-off, flight, landing, speed carried) | 053849 @ 1, 5, 12-13 (frame-step at 60 fps) | AUDIT-LOCOMOTION (or TRAVERSAL if jump lives with anchors) |
| M2 | Guard walks to a door, pauses, steps through, door shuts by itself behind him | 052832 @ 2-19 (door close at 17-18) | AUDIT-WALLS (doors) plus an AI note |
| M3 | Hero bends or crouches over the body right after a takedown | 052527 @ 3-5, 054824 @ 3-4 | AUDIT-WALLS |
| M4 | Wall jump attempt (no footage; 054702 is not it) | no old clip: record new, or search the new batch | AUDIT-TRAVERSAL |
| M5 | Unlisted drawer-unit action inside the counter | 054021 @ 11-12 | AUDIT-TRAVERSAL (identify first) |
| M6 | Idle lean or step with a camera tilt (035847 @ 3-8) | 035847 @ 3-8 (frame-step) | AUDIT-LOCOMOTION |
| M7 | Vision modes: thermal, EMF, night vision, switch via one black frame, bloom at bright windows, cycle | 053251 @ 2-6, 054201 @ 0-3.35, 053525 @ 14-16, 053617 @ 31-36, 052901 @ 2-4, 9, 16 | new AUDIT-VISION (no file among the six) |
| M8 | Aim while in thermal | 052901 @ 4-11 | AUDIT-AIM (cross-ref vision) |
| M9 | Light and shadow reference walk in normal vision | 053709 @ 6-38 | lighting audit (not among the six) |
| M10 | Retinal scanner hack animation (crouch at scanner, hack) | 053816 @ 4-5, 050259 @ 11, 050933 @ 20-26 | AUDIT-ACTIONMENU (stub only now) plus WALLS for the pose |
| M11 | Pick up object (bag), carry, drop | 054702 @ 3-9, 24-30 | AUDIT-WALLS (reuse body pick-up rows) and ACTIONMENU provider |
| M12 | HUD noise / visibility bar behaviour (fills on run, crouch run, jump, fire) | 050541 / 050259 / 053816 @ 2-5 | HUD audit (not among the six) |
| M13 | Goggle lights lit when facing the camera | 051917 @ 21-27, 052021 @ 4, 14 | vision or lighting audit |
| M14 | Pause and save screens | 052441 @ 7-11, 054702 @ 15-20 | UI audit (not among the six) |
| M15 | Old shotlist items J7, J8, J10 (names not in these files) | none | AUDIT-TRAVERSAL: check `CT-SHOTLIST.md` |

## 3. PARTIAL: a row exists but not for the specific move

Needs a measured row or an explicit "not distinct" note.

| # | move | where | gap |
| --- | --- | --- | --- |
| P1 | Stairs and grating walk (row 62) | LOC #38 | cites the wrong clip (054702) and says nothing usable; 054802 @ 0-2, 055717 @ 0-1, 055649 @ 41, 052704 @ 25-37 show stairs |
| P2 | Run or jog slowing to a walk, and crouch run slowing to crouch walk (rows 20, 24, 47) | LOC #33 | only stops to still are measured; 050259 @ 17-18, 050330 @ 18, 051421 @ 12-13 |
| P3 | Crouched reversal and fast crouched spin (rows 23, 49) | LOC #11, #29 | only standing reversal and slow crouched turn; 050330 @ 12-14, 051501 @ 17-27 |
| P4 | Crouched starts and stops (row 37) | LOC #34 | no clean crouch start; 050933 @ 7, 13, 20, 26, 32 has five |
| P5 | Walk-in then stop at a fixed camera (row 13) | LOC #33 | 043858 @ 0-3 |
| P6 | Reticle ring while aiming (row 32) | AIM #5 | position only, ring behaviour not a row; 050541 @ 3, 13, 26, 46 |
| P7 | Aim pitch limits (row 51) | AIM #4 | 051543 @ 15-32 |
| P8 | Camera orbit and top-down limit (rows 2, 3, 67) | CAM #18 | rate only; 035847 @ 19-23, 053525 @ 17-26 |
| P9 | Camera pulled against geometry (row 68) | CAM matches line | no measured pull-in distances; 053437 @ 9-10, 36-37, 053525 @ 5-7 |
| P10 | Walk off the wall by button (row 92) | WALLS not-measurable | 052059 @ 16-17 |
| P11 | Pipe to ledge transfer (row 139) | TRAV #1-#3 | 055649 @ 13-19 |
| P12 | Vent enter and exit, stooped duct walk (rows 148, 150) | TRAV #16 | 054411 @ 35-37, 45-52 |
| P13 | Approach to the wall and standing facing it (row 82) | WALLS #15 | 051917 @ 0-8 |
| P14 | Weapon swap: hero turns and steps at 10 (row 73) | AIM #13 | 051812 @ 10 (camera or body?) |
| P15 | Crouched idle hand-to-floor (row 10) | LOC #24 and its Missing-list | not frame-stepped; 050933 @ 43-46 |

## 4. Counts
Table rows: 165. Distinct moves: 162 (3 rows are HUD / visual / UI items, not moves).
- MISSING (no entry anywhere): 18 table rows (5, 56-58, 103, 104, 115, 146, 147, 153, 154-161), grouped into 15 items M1-M15. Row 146 (wall jump) and 147 (J7, J8, J10) also have no old footage; the 8 vision rows (M7-M9) have no audit file among the six.
- Named only in a "Missing entirely" or "not measurable" list, no measured delta row: 13 rows (10, 14, 15, 92, 105, 107-109, 120, 127, 129, 145, 152).
- PARTIAL (a row touches the area, not the specific move): 21 table rows, grouped into P1-P15 (some overlap the list-only rows).
- Covered by a measured delta row or matches line: about 110.
