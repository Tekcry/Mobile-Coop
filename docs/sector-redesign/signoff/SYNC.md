# Sync nodes per section (Sector Ops, 2026-10-24)

Every entry of the top-level `syncs` array of `docs/sector-redesign/graph/plan/campusOps-S<N>.json`, copied from the graph. Contract: `README.md` in this folder (Sync-node contract, agreed with Marlow Build). S5 entries marked RESERVED SPARE are not used by Code Relay.

## S1

| id | kind | space | track | src | lead |
| --- | --- | --- | --- | --- | --- |
| sync-s1-gate-desk | camera_loop | s1-gatehouse | B | src/game/sectorDesks.ts:14 (E6 SecurityDesk, built); S1 entry planned in campusSectors.ts CAMPUS_SECURITY.desks: { id 'desk-gate', section 0, at [18.8,-73.2], cameras ['cam-gate','cam-walk'], operator 1 (#2) } | s1-gatehouse |
| sync-s1-yard-board | power_cut | s1-dyard | A | src/world/maps/campusS1.ts:131 (yard board, group fore: bollards + dock lamp, built); planned: the canopy breaker (campusS1.ts:133, now inside C1) moves onto this board at (-29.0,-40.3) | s1-dyard |

## S2

| id | kind | space | track | src | lead | solo |
| --- | --- | --- | --- | --- | --- | --- |
| sync-s2-comms | camera_loop | s2-l1-comms | A | planned: SecurityDesk as a patch panel (src/game/sectorDesks.ts:14, E6) at (3.6,4.4,-6.5), operator S2 guard #8 (src/world/maps/campusSectors.ts:129), cameras cam-turnstile, cam-lift, cam-bridge (campusSectors.ts:277-281) | s2-l1-wing | - |
| sync-s2-power | power_cut | s2-plant-g | B | planned: breaker BoardDef, no window (src/game/isolators.ts:25, E4) at (0.3,0,-22) on S2_GROUPS.facilities 55 + l1Cor 56 (src/world/maps/campusS2.ts:49) | s2-foyer | - |
| sync-s2-atrium | power_cut | s2-foyer | B | src/world/maps/campusS2.ts:192 (built: S2_BOARDS, group 50) | s2-foyer | - |
| sync-s2-kpfac | code_sink | s2-l1-facilities | A | planned: SectorKeypad, code s2-fac-code, on both facilities doors (src/game/sectors.ts:166, EW5; not built, campusSectors.ts:360) | s2-l1-plan | - |
| sync-s2-kitchen | code_source | s2-l1-plan | A | planned: SectorIntel overhear (src/game/sectors.ts:182), box 2 x 2 outside the kitchen west door (-31,-26), talkers #5-6, grants s2-fac-code | s2-l1-kitchen | - |
| sync-s2-plantlog | code_source | s2-mail | B | planned: SectorIntel board (src/game/sectors.ts:183) in parcel cage 3 (-41.5,0,-18.5), grants s2-board | s2-post | - |
| sync-s2-pairdoor | pair_door | s2-l1-landing | A | planned: SectorPairGate pg-brg (src/game/sectors.ts:410, E3) + solo window (PLAN C18) | s2-l1-wing | Solo window (PLAN C18, named in the briefing): one player turns key b in the comms room, then key a in the wing (11.8 m by the comms and wing doors) within 8 s; the gate's window rule is two players today (sectors.ts:443), so the solo window is an engine cost. Without it: the comms-room door into the landing, facing K2 (lure or take him first) |

## S3

| id | kind | space | track | src | lead |
| --- | --- | --- | --- | --- | --- |
| sync-s3-isolator | power_cut | s3-plant | B | planned (engine: src/game/isolators.ts:53 IsolatorBoards, a timed window) | s3-plant |
| sync-s3-code-src | code_source | s3-control | B | planned (engine: src/game/sectorKeypads.ts:10 SectorCodes, a SectorIntel board) | s3-writeup |
| sync-s3-camloop | camera_loop | s3-sec | A | planned (engine: src/game/sectorDesks.ts:14 SecurityDesk, DESK_LOOP_TIME 30 s :34) | s3-sec |
| sync-s3-code-sink | code_sink | s3-store | A | planned (engine: src/game/sectorKeypads.ts:10 SectorCodes; kp-store, SPEC S3 register) | s3-view |

## S4

| id | kind | space | track | src | lead |
| --- | --- | --- | --- | --- | --- |
| sync-s4-dockboard | code_source | s4-dock | B | campusS4Data.ts:202 (S4_SECTOR.intel board at (16, 1.5, 21.85), grants s4-codes) | s4-dock |
| sync-s4-desk | camera_loop | s4-sec | A | campusS4Data.ts:164-166 (S4_DESKS desk-sec4: cam-cage, cam-mantrap, cam-dock4; E6) | s4-nc |
| sync-s4-noc | code_source | s4-noc | A | planned (the NOC console release, issued by interrogating #14 Dunmore at the west seat; named-interrogation mechanic, Marlow) | s4-deck |
| sync-s4-cagekp | code_sink | s4-cage | B | planned (release prompt on the cage terminal (18, 0, 38.3), campusS4Data.ts:180 download; 30 s window, solo 90 s maintenance release, both named in the briefing) | s4-hall |
| sync-s4-ess-board | power_cut | s4-batt | B | planned (BoardDef pattern of S4_BOARDS, campusS4.ts:164): essential lighting board at (-5.5, 0, 27.3), groups noc 76 + sec 77, timed window 25 s | s4-batt |
| sync-s4-yard-board | power_cut | s4-dock | B | campusS4.ts:164 (S4_BOARDS compound board, window 20 s, group yard 75) | s4-dock |

## S5

| id | kind | space | track | src | lead |
| --- | --- | --- | --- | --- | --- |
| sync-s5-fob | code_source | s5-arch | A | RESERVED SPARE (Marlow picked S4 for Code Relay; no S5 route depends on it). planned: named officer #29 Ms Penhale (records officer) posted at the cage's west face (-42.2, 4.2, 39.5) with the strongroom time-lock fob; the 30 s rolling code and the interrogation read are Marlow's mission framework (S5_GUARDS list, campusS5Data.ts:33, gains the guard). NOT POSTED in this plan (fix round 2026-10-25, the 32 live cap: S5 posts 26): a mission that arms the spare posts her in place of #18 | s5-gal |
| sync-s5-strongkey | code_sink | s5-ante | B | RESERVED SPARE: the day gate stands OPEN by default (the ceremony); a later mission may arm it. E1 keypad (S5_SECTOR.keypads, campusS5Data.ts:181) on the strongroom's day gate (-43, 38.5); the 30 s rolling code is planned (Marlow) | s5-ante |
| sync-s5-rota | code_source | s5-kitchen | B | built: S5_SECTOR.intel rota board (campusS5Data.ts:182), 'archive keypad 1960 until Monday' | s5-kitchen |
| sync-s5-kparch | code_sink | s5-landing | A | built: kp-arch keypad (S5_SECTOR.keypads, campusS5Data.ts:181; S5_DOORS.kpArch campusS5.ts:79), moved from (-38, 41.0, 4.2) to (-38, 35.5, 4.2) | s5-landing |
| sync-s5-houseboard | power_cut | s5-landing | A | planned: an E4 timed board (BoardDef, the S5_BOARDS pattern campusS5.ts:221) on the back landing's east wall (-32.15, 4.2, 35), circuits 83 (anteroom) and 88 (hall wall lamps), window 45 s | s5-landing |
| sync-s5-gardenboard | power_cut | s5-kitchen | B | built: S5_BOARDS garden board (campusS5.ts:221), circuit 84 (garden uplights and terrace bollards), window 20 s -> 30 s; moves with the kitchen's west wall from (-31.85, 0, 40) to (-32.85, 0, 40) | s5-kitchen |

## Missions over these nodes

- S2 = Split Shift: L1-L2 offices are Team Ghost, the G plant / breaker is Team Shadow's power cut (S2 `tracks`, `exfil_note`).
- S4 = Code Relay (Marlow's pick): the code from a named officer, the vault keypad, a 30 s window named in the briefing.
- S5 code pair (sync-s5-fob, sync-s5-strongkey) = reserved spare, not used by Code Relay.
- Contract: Marlow owns the mission specs (objectives, rules, teams); Sector Ops owns the layout and reserves the hooks (README.md, Sync-node contract).
