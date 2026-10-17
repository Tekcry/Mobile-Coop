Stage P03B Part 1g-a - critical path and traversal coverage.
Model: Opus, medium effort.
Decisions: 15 (insertion point, legs P01-P12, extraction point, routes.md CP row and coverage update)

## Rules for this session
- One deliverable: section 8 "Critical path" of docs/kestrel/03B-block-plan.md (8.1 legs, 8.2 notes), at most 40 lines, plus a CP row and two coverage updates in docs/kestrel/routes.md. The check script is ready (section 5); do not change it unless it has a bug, and say so.
- Zones only (Michael, 2026-10-11): a leg is a polyline of waypoints inside zones, not a door-to-door route. P04 places the doors; P04's real path can only be longer.
- Critical path (RULES 2 line 33): insertion to extraction along the shortest stealth route, visiting the objectives in order, 450-650 m. Ghost rule (RULES 1 line 19): every leg has a no-contact way; the mantrap is not on it (mission brief 4.1 TB4).
- Adjacency (brief 7) and questions are Part 1g-b. Do not start them.
- Candidate-first (RULES 7): write the candidate in your first reply, run the check, fix failures one at a time, rerun after each fix, commit after each improvement. A failure you cannot fix: write it as ASK with options (recommended first, RULES 9 4a) and stop.
- Realism first: would a real intruder take this line through this campus, and does it flow for stealth play. Do not ask Michael about sizes.
- Budget about 15 tool calls. Commit and push after the table.

## 0. Start
1. Run: git checkout feature/kestrel && git pull && git branch --show-current
   If the branch is not feature/kestrel, stop and report.
2. Preconditions: progress.md P03B row shows "DRAFT (parts 1a-1f)"; 03B-block-plan.md has section 7 (7.1, 7.2) and no section 8; scripts/kestrel/p03b-path-check-g.mjs exists. If not, stop and report.
3. Read docs/kestrel/RULES.md sections 1 (lines 8-19), 2 (line 33), 7 ("Task size" and "Reading and checking") and 9 only.

## 1. Read only these
- docs/kestrel/03B-block-plan.md: 1 (site table), 3.3, 4.3, 5.2, 6.1 (grep -n '^##' for line numbers).
- docs/kestrel/01-mission-brief.md: section 4 table and 4.1 (lines 62-102), section 6 beats B1 and B10 (lines 150 and 159).
- docs/kestrel/02-building-brief.md: section 4 lines 85 and 90; brief 5 rows AG05, AG06, AG12, AG13, AF04, BG29, BG30, BG31 only.
- docs/kestrel/routes.md (whole file, 39 lines).

## 2. Plan and why (planner, 2026-10-11)
Solo ghost order (mission brief 4, 4.1): Track A first so the cameras are looped before B; the roof-shaft entry (roof key from the key safe plus B's roof); out by the carrier route. The B credential (TB3) and the mantrap are not needed on this line.
- P01 obj 1: over the lane fence at its east end, x 96, far from the gatehouse (X02 at the west end, brief 4 line 85) and dark. Feasibility: a west insertion near A (x about 20) makes P02 about 20 instead of 75.5 and the total about 417, under 450. East it is.
- P02 TA1: across the yard to AG06's south window, left ajar (brief 5 AG06), at x 25 on A's south wall (G-SOFF).
- P03 TA1: AG06 to the spine, west link, north corridor, AG05 the duty manager's office in G-NW (master card in the drawer, brief 5 AG05).
- P04 TA2: back to the spine and AG12 the CCTV equipment room in G-SEC (panel: loop cameras, beams off).
- P05 TA3: main stair V-ASTAIR to F, AF04 records in F-BW (cage number, key safe PIN).
- P06 TA4: back down to AG13 the key safe in G-SEC (B-tier card, roof key).
- P07 TB1: fire stair V-AFS to A's roof, across AR01 south of R-PLANT to V-LAD1.
- P08 TB1, TB4: down V-LAD1 to the bridge roof LF02, up V-LAD2, across BR01 to V-LAD3, down to the hall roof BR03 and the grille at V-BR05.
- P09 obj 5: rappel 6.0 down V-BR05 into BG20 (route R04).
- P10 obj 6: across the hall to BG29 and the meet-me room BG30 in B-GHCAR.
- P11 obj 7: BG31 riser room, down BG32, west along TB04, through the vault TB01, up the manhole TB02.
- P12 obj 7: across the yard under the generator test noise to the extraction point (question 1). Candidate: the east service gate beside the loading apron X12 (brief 4 line 85), at x 73 on the lane fence.
- Vertical metres (6.1): one floor of main or fire stair 9.0 (2 flights of 12 x 0.285 = 3.42, plus a 2.0 landing, rounded up); ladders their height (V-LAD1 / V-LAD2 0.6, V-LAD3 1.8, BG32 and TB02 3.6); rappel 6.0. Fence climbs count as 0.

## 3. Sums (planner, 2026-10-11)
- Planner test run on a copy of 03B with this table: `path legs 12, total 472.8`, `coverage moves 14, placed 4, open 9`, `fails 0`. A negative test (a waypoint outside G-SEC, a broken chain, a wrong zone, objective 6 missing) gave 5 fails, so the script catches them.
- 472.8 is 22.8 above the 450 floor and 177 under 650. With the main vehicle gate (x 8, z 9) instead, P12 is 43.69 and the total 487.6. Straight lines between zone points are a lower bound; P04's doors only add.
- After the routes.md update (CP for fences and windows) the coverage line must read `placed 6, open 7`.

## 4. Candidate to verify (correct any leg that breaks the brief or a zone and say why)
### 8.1 Legs
| Leg | Objective | Waypoints | Vertical | Length | Source |
| --- | --- | --- | --- | --- | --- |
| P01 | 1 | S-LANE 96,4 > S-YARDB 96,10 | 0 (lane fence) | 6.0 | MB 4 obj 1, 4.1; brief 4 (gatehouse west) |
| P02 | TA1 | S-YARDB 96,10 > S-YARDB 70,20 > S-YARDA 40,28 > S-YARDA 25,29.5 > G-SOFF 25,31 | 0 (window) | 75.48 | MB 4.1 TA1; brief 5 AG06 |
| P03 | TA1 | G-SOFF 25,31 > G-SPINE 25,41.75 > G-SPINE 5.75,41.75 > G-WLINK 5.75,47 > G-NCOR 5.75,52.25 > G-NCOR 15,52.25 > G-NW 15,56 | 0 | 53.5 | MB 4 TA1; brief 5 AG05; 3.3 |
| P04 | TA2 | G-NW 15,56 > G-NCOR 15,52.25 > G-NCOR 5.75,52.25 > G-SPINE 5.75,41.75 > G-SPINE 13.5,41.75 > G-SEC 13.5,45 | 0 | 34.5 | MB 4 TA2; brief 5 AG12 |
| P05 | TA3 | G-SEC 13.5,45 > G-SPINE 13.5,41.75 > G-SPINE 23.5,41.75 > F-SPINE 23.5,41.75 > F-SPINE 13.5,41.75 > F-BW 13.5,45 | 9.0 (V-ASTAIR G to F) | 35.5 | MB 4 TA3; brief 5 AF04; 6.1 |
| P06 | TA4 | F-BW 13.5,45 > F-SPINE 13.5,41.75 > F-SPINE 23.5,41.75 > G-SPINE 23.5,41.75 > G-SPINE 13.5,41.75 > G-SEC 13.5,45 | 9.0 (V-ASTAIR F to G) | 35.5 | MB 4 TA4; brief 5 AG13 |
| P07 | TB1 | G-SEC 13.5,45 > G-SPINE 13.5,41.75 > G-SPINE 5.75,41.75 > G-NCOR 5.75,52.25 > V-AFS 7.25,55.75 > RF-A 10.5,55.75 > RF-A 27,42 > RF-A 39.5,41.75 | 18.0 (V-AFS G to R) | 80.54 | MB 4.1 TB1; 6.1 V-AFS, V-LAD1; 3.3 R-PLANT |
| P08 | TB1, TB4 | RF-A 39.5,41.75 > L-ROOF 40,41.75 > L-ROOF 52,41.75 > RF-BS 52.5,41.75 > RF-BS 69.75,57.75 > RF-BH 70.5,57.75 > V-BR05 81,49 | 3.0 (V-LAD1 0.6, V-LAD2 0.6, V-LAD3 1.8) | 53.95 | MB 4.1 TB4; 6.1; routes R03 |
| P09 | 5 | V-BR05 81,49 > B-GHALL 81,49 | 6.0 (rappel) | 6.0 | MB 4.1 TB4, 5; routes R04 |
| P10 | 6 | B-GHALL 81,49 > B-GHALL 78,36.5 > B-GHCAR 78,33 | 0 | 16.35 | MB 4 obj 6; brief 5 BG29, BG30 |
| P11 | 7 | B-GHCAR 78,33 > T-RISER 73,31 > T-TUNB 73,28.5 > T-TUNB 49,28.5 > T-VAULT 47,28.5 > T-VAULT 47,24.75 > T-MH 48.75,24.75 | 7.2 (BG32 3.6 down, TB02 3.6 up) | 46.59 | MB 4.1 obj 7; routes R08; 5.2 |
| P12 | 7 | T-MH 48.75,24.75 > S-YARDB 73,9 | 0 (service gate) | 28.92 | MB 4 obj 7; brief 4 line 85; question 1 |

## 5. Check scripts
- `timeout 60 node scripts/kestrel/p03b-path-check-g.mjs docs/kestrel/03B-block-plan.md docs/kestrel/routes.md` (must say `fails 0`, a total in 450-650, and after the routes.md update `placed 6, open 7`). Run it from the repo root (it reads src/world/anchors.ts, src/player/moveState.ts, src/player/attach.ts, src/game/teamController.ts).
- Rerun, all must say fails 0: `timeout 60 node scripts/kestrel/p03b-ring-check-f.mjs docs/kestrel/03B-block-plan.md` (F), `timeout 60 node scripts/kestrel/p03b-vert-check-e.mjs docs/kestrel/03B-block-plan.md` (E), `timeout 60 node scripts/kestrel/p03b-zones-check.mjs docs/kestrel/03B-block-plan.md` (A), `timeout 60 node scripts/kestrel/p03b-zones-check-b.mjs docs/kestrel/03B-block-plan.md` (B), `timeout 60 node scripts/kestrel/p03b-zones-check-d.mjs docs/kestrel/03B-block-plan.md docs/kestrel/02-building-brief.md` (D).
- Never write that a check passed unless you ran it on the real files.

## 6. Write
03B: add "## 8. Critical path" after 7.2's notes, before Appendix A (the path script stops reading zones at "## 8."):
- One line: "Solo ghost line, roof-shaft entry, carrier exit (mission brief 4.1). Waypoints are zone points, not doors; P04's path is longer. Vertical: stair floor 9.0, ladders their height, rappel 6.0 (6.1)."
- "### 8.1 Legs": the table (verified, with question 1's answer in P12), then "Total: <n> m (RULES 2: 450-650)."
- "### 8.2 Notes for P04, P06 and 1g-b": insertion at the lane fence's east end (a west insertion fails the 450 floor); P04 keeps AG06's window, AG05's door, the west link and the fire stair door on these lines or records the added metres; P06 places the fence anchor at P01 and the window anchor at AG06; the mantrap, the bridge doors and TB3 are off this line (other tracks and co-op).
- "Self-check (this session):" path, F, E, A, B and D summary lines. "Deviations:" anything changed from the candidate, or "none".
- Line 2 of the file: "Status: DRAFT (Part 1g-a done: critical path; Part 1g-b next)".
routes.md:
- Section 1: add a row "| CP Critical path | Lane fence, AG06 window, A fire stair, roof ladders, shaft BR05, riser BG32, tunnel, manhole | fence, window, ladder, rappel, crawl space (tunnel) | X01 (lane fence, east end) | extraction point (P12) | 03B 8.1 |".
- Section 2: Fences "CP (lane fence, P01)"; Windows "CP (AG06 south window, P02)". Other rows unchanged.

## 7. Self-check (all from commands; paste the summary lines)
- Path: `path legs 12, total <450-650>`, `coverage moves 14, placed 6, open 7`, `fails 0`; F, E, A, B and D 0 fails.
- Every leg has a source; objectives in order 1, TA1-TA4, TB1, 5, 6, 7 (the script checks); every leg has a no-contact way (state the one line per leg where it is not obvious).

## 8. Question for Michael (ask with the multiple-choice tool before writing P12; RULES 9 4a)
Question 1: Where does the player leave the site?
- East service gate beside the loading apron (Recommended): unmanned, chained double gate about 60 m from the gatehouse, 29 m from the manhole; the generator test on that side covers the climb. Total about 473 m.
- Main vehicle gate by the gatehouse: past the manned gatehouse, a tenser finish but a ghost exit through a watched, closed gate is less believable. Total about 488 m.
Write the question, options and answer in 8.2.

## 9. End (RULES 9)
- progress.md: P03B row "DRAFT (parts 1a-1g-a)", commit, date; one log entry of at most 6 lines.
- lessons.md: one line.
- Commit "kestrel P03B 1g-a: critical path and coverage" and push.
- Report in at most 8 lines, then the Next step block:
Next step:
1. Type /clear.
2. Stay on Opus, medium.
3. Send the prompt below:
```
Planner: next
```
