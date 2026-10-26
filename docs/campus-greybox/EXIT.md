# campus-greybox - EXIT (greybox exit inputs, S1-S5)

Opus plan, 2026-10-25 ~22:45, docs only. Michael's pick 2026-10-25 ~22:25 (native multiple choice, ROADMAP "Decided"
walk plan (2)): "Drop old, walk new" - the campus v1 walk is dropped; he walks v2 S1-S5 at greybox exit. Gate: RULES
Intake 5, VISION 5, LD 14 phase 3 "Greybox exit gate", G289, G330, G372, Q7 "Never stuck". Per section: EXIT-<N> (PLAN 5, 8).

## 1. Order to exit (per section N; nothing is skipped or reordered)
1. **Lanes merged dark.** The section's lane PRs (PLAN 5) on master with `CAMPUS_V2_ON` unchanged; validator 0 ERR naming
   S<N> on every lane PR: `node scripts/level-validate.mjs docs/sector-redesign/graph/v2/campusOps-S1.json
   docs/sector-redesign/graph/v2/campusOps-S2.json docs/sector-redesign/graph/v2/campusOps-S3.json
   docs/sector-redesign/graph/v2/campusOps-S4.json docs/sector-redesign/graph/v2/campusOps-S5.json`.
2. **Laptop e2e.** Flag off, every lane PR head: `node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --suites
   "e2e-sectorops:1 e2e-sectorops:2 e2e-sectorops:3 e2e-sectorops:4 e2e-sectorops:5 e2e-sectorops:6" --set s<N>-<slice>
   --requester "Night Shift | Sector Ops Build"` (proves v1 unchanged). Flag on: E2E-1 (anchors, `?campusv2=1,2,3,4,5`),
   then E2E-2a part 7 (S1-S3) or E2E-2b part 8 (S4-S5): same line with `--suites "e2e-sectorops:7 e2e-sectorops:6"`
   or `--suites "e2e-sectorops:8 e2e-sectorops:6"`. Pass = green; they cover PLAN 7 rows 4-12 for the section.
3. **Measured validator pass (V6).** Desktop, after J12 PR A (`--require-measured`, `checkMeasured`) and B2
   (`level-measure.mjs` with `--flags`) are on master: `node scripts/level-measure.mjs
   docs/sector-redesign/graph/v2/campusOps-S<N>.json --flags campusV2=<N> --write`, then the step 1 command plus
   `--require-measured`. PASS = exit 0 for S<N>: 0 ERR naming S<N> (other v2 files not yet measured may ERR; they are
   not this exit). Every WARN justified in the graph note. A measured miss is the lead's Opus fix round, never a target
   edit. **INFO until V6 is on master** (validator today): shadow share (`shadow_pct`, INFO for good: the light band is
   the target, G329); every measured target (vantage `sees_pct`, `los_break_s`, partner reach, split legs `a_s` / `b_s`
   / `reach_s`, patrol cycles) is only checked as *declared*; after J12 S3 they print "pending V6" INFO without the flag
   and ERR with it. Nothing exits on INFO: LD 14 says exit waits for V6 (BRIEF A3).
4. **Bot route-runs (J13).** Laptop alone slot, `E2E_GPU=1`, one step per section, after J13 R4a, R4b, R5, R6 are on
   master: `node scripts/laptop-queue/request.mjs --sha <EXIT-<N> head> --pr <n> --alone --step "serve
   scripts/route-run.mjs http://127.0.0.1:4189/?campusv2=<N> --graph <the five v2 files> --section S<N> --routes graph
   --players 2 --publish" --set route-run-campus-s<N> --requester "Night Shift | Sector Ops Build"`, then on the desktop
   `node scripts/route-run.mjs --merge campusOps <sha> --out docs/sector-redesign/graph/v2/route-run/` and a copy of
   `REPORT.md` to `docs/campus-greybox/exit/S<N>/`. PASS (Q7) = no run has a dead stop. Detections never fail it; each
   one goes on the walk card. An `unplannable` run is not a pass. Co-op moves are stubs until Michael answers J13 Q1.
5. **Light.** S1: J10 L1 (car park columns, band 14-35 lx) lands after Michael's click on `docs/light-realism/SIGNOFF.md`;
   S2-S5: J10 L2-S<N>, not started. Both edit the live `campusS<N>.ts`; the v2 `S<N>_LIGHTS` blocks stay PROVISIONAL
   (A19) until the lead carries J10's values in. Then `node scripts/light-realism/lux-grid.mjs --map campusOps --section
   <N>` with the v2 flag (see section 3): every space in band; dark cells only from cover, cut or shot lamps.
6. **Walk card inputs** (section 4) to the orchestrator: route-run detections, measured misses, the lines below.

## 2. Per section (route kinds walked: `shadow`, `high`, `loud`; `secret` is not run, J13 A7)
Menu path for every section: open `/preview/?campusv2=<N>` (co-op: every player opens the same link, or a client sees
v1 walls under v2 guards) > Main menu > Sector Ops > Saltmarsh Park > Normal > Start, then play to section N.

**S1 gatehouse, car park, forecourt - 15 guards** (1-2 players; 16 / 17 at 3 / 4 after TAG-1). Routes: entry `s1-verge`
-> objective `s1-gatehouse` -> exit `s1-forecourt`; shadow, high and loud through gatehouse, car park, service yard,
forecourt and lawn (15 space-kind pairs); split `s1` (yard roofs / lawn) walked by the pair at once. No team doors.
Co-op: four leg-ups (CR1 canopy east and south, CR1-yard plant roof, CR1-east pavilion). K1 unavoidable: forecourt.
- The car park should look like a real lit car park now; dark only under the carport, behind cars, or after you cut
  the feeder pillar board.
- From the pavilion top and the car park, how many guards can you see at once? Tell us if every guard seems to see you.
- The canopy and plant roof need a partner's leg-up; alone you should not get up.
- Leaving S1 means getting past the forecourt guard: does that feel fair?
- Try to stand on the west fence from a bin, and to jump the south fence from the gatehouse condenser: neither should work.

**S2 HQ atrium and offices (Split Shift) - 18 guards** (19 / 20). Routes: entry `s2-foyer` -> objective
`s2-l1-facilities` -> exit `s2-l1-landing`; three kinds through foyer, mail room, L1 and L2 open plan, east wing (18
pairs); split `s2-hack`. Team doors (two players, keys within 1 s, Q21): bridge door `pg-brg` and executive south door
`pg-exec`; solo goes round by the comms door. Co-op: CR2 leg-up / human ladder at the cafe slab. K2: L1 landing.
- Stand at the 14.5 m void: can you read all three floors, and do guards across the void spot you?
- The two team doors need both of you; alone, take the comms door past the bridge officer instead.
- Split Shift props are placed (comms camera desk, east-wing power board, facilities keypad, kitchen chat, post-room
  note); the mission steps come later.
- Cut a room's lights: it goes dark and a guard comes to look.
- The leg-up at the cafe slab onto L1.

**S3 lab block (re-plan) - 20 guards** (21 / 22). Routes: entry `s3-c2` -> objective `s3-store` -> exit `s3-dock`;
three kinds through the hall and the dock (6 pairs) plus the store side; split `s3-obj` (store / control and plant).
No team doors, no K guard (by plan). Co-op: CR3 leg-up onto the chamber's west face, CR3b dock pad into the hoist hatch.
- The lab block is rebuilt: can you find your way, and do all three fire stairs go where you expect?
- The gallery under the high bays was planned dark and may now be lit: tell us how it plays.
- The two leg-ups (chamber face, hoist hatch) work with a partner and not alone.
- The split: one player at the store, one in the control room and plant room.

**S4 data hall (Code Relay) - 25 guards** (26 / 27; cap 32 with reinforcements, A15). Routes: entry `s4-dock` ->
objective `s4-cage` -> exit `s4-cc`; three kinds through dock, lobby, battery room, yard, deck, NOC, security and hall
(24 pairs); split `s4r`. Team doors: CR9 mantrap interlock (lobby), CR5 cage rear gate (two-key). Co-op: CR8 / CR8-west
plenum leg-ups, CR10 plant ladder, CR4 / CR4-west cable baskets (about 25 s for a partner to reach you: accepted). K3: `s4-cc`.
- The one 6 m goods-in lobby and the mantrap: the outer door only opens with your partner's help.
- The dark north strip and the two-key cage gate; alone, find the way round.
- Leg-ups into the air plenum from the dock and the battery room: do the climbs work?
- The dock floodlights may light the dock doors that were planned dark.
- Code Relay props (NOC console, roster board, deck radio) are placed; the code steps come later.

**S5 Old House and extraction - 26 guards** (27 / 28; 32 alive cap, Q10). Routes: entry `s5-lobby` -> objective
`s5-strong` -> exit `s5-lawn`; three kinds through kitchen, archive, hall, anteroom, garden, roof and lawn (21 pairs);
split `s5-k4`. Team doors: CR6 archive cage gate `pg-arch` (two key switches about 9 m apart), CR7 hoist door (pair
gate, A24) with the rope back up. Co-op: CR8 lawn to low roof, CR9 low roof to main roof, CR10 kitchen smoke hatch. K4: `s5-ante`.
- The two keyholders in the anteroom: can you take them together through the window without being seen?
- The archive gate and the hoist door need two; the 4.2 m drop into the light well, and the rope back up.
- Boost to the low roof, then the main roof; watch the roof marksman.
- The hall chandelier and garden lamps may light the planned dark passage and garden: tell us how it plays.
- Extraction to the lawn with an alarm on: reinforcements come but never more than 32 guards.

## 3. What blocks exit today (2026-10-25 ~22:45)
| Item | Owner | Status |
| --- | --- | --- |
| P0 to master (waits J15 guard-rules PR1, A27) | lead / Guard AI | P0 done on branch, no PR; PR1 not on master |
| S1 lane | cloud | built G1-G6 (6731993b0), no PR; screen-cap test still `it.fails` (worst spot sees all 15) |
| S2 lane | cloud | G1-G4, G6a, G5a, G5c in (3877ede76); G6b open |
| S3 lane | cloud | r1 done; r2, r3 building; r4, r5 queued; r6 (lips, graph, keys) not queued |
| S4 lane | cloud | G4.1-G4.6 data in (41e52722f); graph keys, totals, K3 tag, tests open |
| S5 lane | cloud | P1 in (3c600cc1b); P2-P4 open |
| E2E-1, E2E-2a (part 7), E2E-2b (part 8) | lead (Opus) | not started (need lanes on master) |
| J12: `--require-measured` + `checkMeasured` (PR A), `level-measure.mjs --flags` (B2), S10 | Marlow Build | S1 on master (train 104); A and B2 not on master |
| J13: `route-run.mjs` R4a, R4b, R5, R6 (points), R8 | Marlow Build | R1-R3 on master; R4a not started; R6 waits J12 B2 |
| Graph data route-runs and V6 need: link `at` on edges with 2+ gaps (S1 11, S2 23, S3 8, S4 13, S5 10 links), `vantage.at` on every encounter space (5 / 6 / 2 / 8 / 7) | lanes' graph slices, after J12 S10 | none yet in any v2 file |
| Guard keys "1".."4" (S2 and S4 have only "2", S5 only "1"); `meta.sections` five ids (S2, S5) | S2-d, S4-c, S5-c | open (S1, S3 done) |
| `route-run.mjs` keeps `?campusv2=<N>` on both robot pages | J13 (ask the lead) | not in J13's PLAN |
| `lux-grid.mjs` measures a v2 section (flag argument) | J10 (ask) | not in J10's PLAN |
| J10 L1 (Michael's SIGNOFF click), L2-S1 .. L2-S5 | J10 / Michael | L0 PASS; L1 brief written; L2 not started |
| J13 Q1 (co-op moves stubbed or real; R9) | Michael | open; default stubs |
| A start-at-section link for the walk (menu starts at S1; S5 is ~30 min in) | Sector Ops Build | none on master, unplanned |
| J21 perf line (LD 15 row 13, 60 fps, all five on) | J21 | open |

## 4. Walk card inputs for the orchestrator (paste)
```
Campus v2 greybox walk (Michael ~22:25 "Drop old, walk new"); one card per section as it exits, ~10 min each.
Build: /preview/?campusv2=<N> (co-op: same link for every player). Path: Main menu > Sector Ops > Saltmarsh Park > Normal > Start.
Order: S1, S2, S3, S4, S5 (the run is linear). Accept = switch-on SW-<N>; reject = a fix slice.
Each card adds: route-run detections (REPORT.md walk-card snippet), measured misses, look video path, the 4-5 lines in EXIT.md 2.
S1 15 guards | S2 18 | S3 20 | S4 25 | S5 26 (two players; 3-4 add tagged extras). Lights are provisional until J10.
Highest risks: S1 too many guards in view; S2 void sightlines; S4 mantrap and plenum climbs; S5 keyholder takedown seen.
```

## 5. Conflicts with higher sources
- **ROADMAP Decided ~09:05 vs PLAN 7 row 2 / A19.** Decided: light is "measured from the bake at greybox exit". J10's
  L2 lights the live v1 files and the v2 lights stay PROVISIONAL, so no v2 section has a light measure today. The
  higher source wins: a section does not exit until J10's band is in its v2 lights and `lux-grid` passes (step 5).
- **Michael ~22:25 vs BRIEF A10 / PLAN 8 step 5.** A10 offers at most 3 sections at a time, order S2, S4, S1, S5, S3. He
  now walks all five; the walk cap limits switch-on only (G355), so the lead updates A10 and PLAN 8 to "S1-S5 at exit".
- **RULES Intake 5 "10-minute walk card" vs the run length.** With no start-at-section link, S3-S5 cannot be reached in
  10 minutes; needs a small dev link or Michael's OK to play through.
