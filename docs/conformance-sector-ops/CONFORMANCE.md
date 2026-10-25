# Conformance review: Sector Ops (plan only)

Owner: Night Shift | Sector Ops Build. Brief: `docs/orchestrator/review-briefs/sector-ops.md` (origin/feature/menu).
Base: origin/master 829a9332 (4.102.0). Plan only (G355): no src, test, map, script or config change.
Citations: `path:line` is master 829a9332; branch files are `feature/<b>@<sha> path:line`. feature/light-realism is cited at
4879884e, its tip; the brief's bd8b843e is its parent (the same scripts, without s1-grid.json).

Scope: Saltmarsh Park S1-S5 (`campusOps`) and the old `warehouseOps` as maps (rows C); the Sector Ops mode rules and
stars (rows M); lighting on every map and the meter (rows L); the visual gate and performance (rows V).

Master is still the v1 campus. v2 is the signed-off re-plan (G328, ~08:50 2026-10-25) on feature/campus-greybox
@c2f1f131 (P0 and lane briefs S1-S3 only), whose sign-off plans (feature/sector-redesign-signoff@9eb7b9c6) were written
before G331 / G333 (~09:45) and G362 (~11:55). A v1 gap that v2 already fixes says "planned in campus-greybox".

Size: S under 2 h, M 2-6 h, L over 6 h or its own job. Owners follow ROADMAP "Now" on origin/feature/menu.

## 1. Gap table

Totals: 13 hard-rule breaks (VISION 4; two of them measured on GPU) plus 1 parity-coverage gap (section 1a); 52 other gaps (section 1c); 12 questions for Michael (section 1b).

### 1a. Hard-rule breaks (VISION 4)

| # | Item | Rule (doc + section / G) | Current state (file:line) | Gap | Fix | Size | Needs Michael? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | Compass and objective blip | VISION 4 rule 5 "No maps, minimap, compass or objective blip in any mode"; G339; bible 5.10 | `SectorMode.blips()` puts every live objective / exit item in as an `objective` blip (src/game/modes/sectorMode.ts:1355-1359); gameState turns them into compass marks (src/game/gameState.ts:3633-3635); the compass strip is built and drawn every frame (src/ui/hud/hud.ts:32-35, :141-143, :159, :257-271) | Rule 5 break: the compass and the objective blip are on in Sector Ops | Remove the compass element and `HudFrame.markers`; `SectorMode.blips()` returns nothing (or drop `GameMode.blips`). Owner: Campaign Build (ROADMAP row 7) | S | no |
| M2 | Minimap, partner and enemy blips | VISION 4 rule 5; G339; bible 5.10 "no live partner position (G135)" | Minimap built for every mode (src/game/gameState.ts:639-640, drawn :3639; src/ui/hud/hud.ts:152, :160, :175-177); co-op partner `ally` blips (src/net/coopHost.ts:1939-1945, src/net/coopClient.ts:1320-1324); HQ-radar enemy blips in stealth modes incl. Sector Ops (src/game/gameState.ts:3617-3628; src/progression/suit.ts:115) | Rule 5 break: a minimap with the partner's live position | Remove `Minimap` from the game HUD and the `blips()` paths (mode, pickups, net); retire the HQ radar upgrade. Owner: Campaign Build (row 7) | M | no |
| M3 | Exit beacon in the world | VISION 4 rule 5 "no markers in the campaign and Sector Ops"; bible 5.10 "no world waypoints"; level-design 6.4 (G290) | Every connector and the extraction gets an `extract` interactable (src/game/modes/sectorMode.ts:771) whose default visual is a 2.6 m green disc and a 3.2 m lit green pole (src/game/interactables.ts:134-136; colour :14) | Rule 5 break: a glowing pole marks every way out | `extract` has no visual in Sector Ops (keep the zone); the connector door, signs and light guide. Owner: Sector Ops | S | no |
| M4 | Objective lines without "where" | VISION 4 rule 5: objectives "must name what and where"; G336, G343, G351; bible 5.8 | Campus S1 (src/world/maps/campusSectors.ts:315), S3 (:406), S4 (src/world/maps/campusS4Data.ts:180), S5 (src/world/maps/campusS5Data.ts:169); warehouse (src/world/maps/warehouseSectors.ts:30, :157). S2 (campusSectors.ts:361) and the exit labels name a place | Rule 5 break: 4 of 5 campus and 2 warehouse objectives give no place; S1's line is not short (G343) | Rewrite each as a short what-and-where line; a data test that every `objective.label` names a place word of its section within a length cap (as `INTEL_LINE_MAX`, src/game/sectors.ts:194). Owner: Sector Ops | S | no |
| L1 | Character shadows in the meter and guard perception | VISION 4 rule 1; bible P1, L11 "the meter and guard perception read the same darkness"; G352 | `LightField.bodyLevel` has no character term (src/world/lightField.ts:240-248); meter src/game/gameState.ts:1690; perception src/ai/enemy.ts:2447; character shadows render only (docs/systems/lighting.md:240-246; capsules for the picture, src/game/gameState.ts:908-913) | Rule 1 break (known, VISION says not built): where a body's real-time shadow darkens the player on screen, meter and guards read the lamp in full | Own job (ROADMAP row 11): a host-side gameplay occlusion term at the meter's 10 Hz from one fixed lamp set per body whatever the preset (bible L11), not `LampSlotPicker`'s per-machine pick (lighting.md:223-226); no per-frame per-lamp loop (L13); picture-vs-meter test inside a silhouette at Low and Epic | L | no |
| L2 | Off-screen guard whose shadow is in view | VISION 4 rule 10; bible 8 "one whose shadow falls in view counts as seen"; G327 | `seen` comes only from the body mesh passing culling (src/ai/animTierView.ts:5-10, :89); unseen runs every 4th frame (src/ai/animTier.ts:65); docs/systems/ai.md:42-43 "Not built yet"; WIP only on origin/wip/guard-ai-t1-shadow e285501c | Rule 10 break: an off-screen guard's shadow in view animates at quarter rate | Mark `seen` when the guard casts in an active char- or torch-shadow slot or a lamp reach whose pool is in the frustum; allocation-free. Owner: Guard AI (row 14) | M | no |
| L3 | S1 staff car park lit level | VISION 4 rule 2; bible L17; level-design 5.5 interim rule; G329 ("car parks are generally well lit") | 14 column lamps r 12, i 0.9 at y 6.0 on 6.0 m poles (src/world/maps/campusS1.ts:230-238). Desktop probe (feature/light-realism@4879884e scripts/light-realism/s1Grid.ts; output docs/light-realism/measure/s1-grid.json): at y 1.0 mean 0.282, 52% of the floor dark, 0% lit; the lamps add mean 0.033 (max 0.12) where the formula without visibility gives 0.39-0.50 under and beside the columns (0.27-0.33 between rows) | Rule 2 break: the car park Michael flagged is still mostly in the dark band; the lamps' baked visibility almost cancels them. Cause not isolated (candidate: the light point inside its own pole head, accepted in tests/lampBoxAlign.test.ts:206-207) | Run s1-shots.mjs (GPU meter vs pixels) to confirm; lift the light point clear of the pole head and re-bake; then set the columns from the car-park band (L10). Owner: Sector Ops (light-realism, row 10) | M | no (values via L10) |
| L4 | Base Warehouse: unlit strips as the stealth source | VISION 4 rule 2 "never from leaving places unlit"; bible L17; G329 "then every map" | Only 14 of the strip grid are lights (src/world/maps/warehouse.ts:27-31, `LAMPS_ON`); "only some are on (pools of light, dark aisles between)" (:430); the unlit strips are plain boxes, not switchable or shootable | Rule 2 break: the dark aisles come from fittings left unlit by design | light-realism every-map phase: every strip a real light on its circuit, lit to the warehouse band; stealth from racks, cut circuits, shot strips; re-run tests/warehouseLamps.test.ts and the darkness cards | M | no |
| L5 | warehouseOps: dead fittings over dark pockets | VISION 4 rule 2; bible L17; G329's real gaps ("between poles, under carports, behind cars, cut circuits, shot lamps") | "dead fittings (intensity 0) keep the grids regular over the dark pockets" (src/world/maps/warehouseS1.ts:62; warehouseS3.ts:124-125); 7 of 10 deck strips dead (warehouseS3.ts:131); tests keep the pockets <= 0.3 (tests/warehouseS1Light.test.ts:77-78, :203-210) | Rule 2 break, or a missing decision: dead fittings are not among G329's gaps | Per Michael's answer (1b L5): re-light the pockets to band with live fittings, pockets moved to occluders or cut circuits; pocket tests become band tests | M | yes |
| L6 | Campus S1 boost point kept dark by lamp placement | VISION 4 rule 2; G329 "never from leaving lit places unlit" | Canopy downlights moved to x -18.5, r 4.5 so the boost point (-13.5, -38) reads under 0.28 (tests/campusS1.test.ts:473-476, :666-671, A65); bike-shelter fitting tagged out (src/world/maps/campusS1.ts:249-254; test :469-470) | Rule 2 break: light chosen for the stealth beat, not the forecourt's real lighting (the tagged-out shelter fitting follows Michael's answer to 1b L5) | At greybox exit measure the forecourt against its band; if the band needs light at the kerb end, light it and give the boost a real gap (canopy edge, a column's shadow); dark-assert tests become band tests. Owner: Sector Ops (campus-greybox S1) | S | no |
| L7 | Co-op light parity: section-bake late join, failed lamps | VISION 4 rule 1; bible L10 | A late join into section k > 0 lacks k's lamps in picture and meter "for k's share of the bake (seconds; the host's guards are right)" (docs/sector-redesign/checks/section-bake-build.md:80-82); the client learns the live section only from `ls` (src/net/coopClient.ts:993); a lamp that fails every way "lands dark for this match only" (docs/systems/lighting.md:178-179) | Rule 1 break for seconds after a late join, and for the whole match on a per-machine lamp failure | A start-section hint on `start` (wire change; the train bumps the protocol); a failed lamp's id goes to the host, which retries or treats it dark for everyone | M | no |
| L8 | Parity test coverage | Bible L5 "samples a grid of points per map ... Any mismatch fails"; P1 "any map at any graphics preset" | scripts/e2e-darkness.mjs:1-18: four grey cards on the Warehouse at Epic only; feature/light-realism s1-shots.mjs (Low + Epic) unmerged, no output | Coverage gap behind rule 1: campusOps, warehouseOps, ctcourse and Low / Medium have no picture-vs-meter test | Generalise s1-shots.mjs into a per-map grid parity run (field band vs pixel band, Low and Epic) on the laptop queue, failing on mismatch (see also V rows) | M | no |
| V1 | Campus S1 moonlit parity break (measured) | VISION 4 rule 1; bible L5 "Any mismatch fails" (docs/design-bible.md:257-258) | VG7 GPU runs 1-3 on master 6c3f4a87 (laptop RTX 4090 D3D11): `card-cp-s1-f-1` field level 0.324 (mid band) renders luma 0.085 vs 0.10-0.37 (shots/visual-gate-vg7@e323a119 6c3f4a87/run2/result.json, identical in run1 / run3); a similar miss parked on another map, provingGrounds ("proving moonlit ground card 0.29 vs band 0.42 (parked mode)", feature/sector-redesign-polish@f87c37d8 docs/sector-redesign/STATE.md:339); master's only blocking parity test is Warehouse only (scripts/e2e-darkness.mjs:10) | Rule 1 break, measured: open moonlit ground the meter and guards treat as mid renders dark, so the player looks hidden and is not; no failing test covers campusOps | GPU triage of which side is wrong (moon display vs field; G316 "meter and perception follow the picture", docs/DECISIONS.md:1775); campus cards as a blocking assert (V6). Owner: Sector Ops (lighting) | M | no |
| V2 | warehouseOps mid-band card too bright (measured) | VISION 4 rule 1; bible L5 table, 0.40 row (docs/design-bible.md:257-266) | `card-so-s2-aisle-1` level 0.466 renders 0.417 vs 0.10-0.37, all 3 VG7 runs (run2/result.json) | Rule 1 break, measured, on the old Sector Ops map: the picture reads near-lit where the meter says mid | GPU check of the S2 aisle lamp pool, display vs field. Owner: Sector Ops (lighting) | S | no |

### 1b. Questions for Michael (native multiple choice; recommended first)

- C3: At 3-4 players S5 has no room under the 32 cap for both its tagged extras and the alarm reinforcements (v2 S5 is
  26 + 6 = 32). Which way?
  - Keep the 32 cap; extras spawn, reinforcements fill the room left (the runtime clamp does this) (Recommended)
  - No 3-4 player extras in S5; its reinforcements still grow with the players
  - Raise the Sector Ops live cap above 32 (perf pass; the snapshot carries at most 32)
- C4: Can a solo player open the S2 team doors (both keys within 8 s), as the signed S2 page shows?
  - No: team doors stay two-player; solo uses the comms door and the exec route around them (Recommended)
  - Yes: a G280 exception for one-player sessions only, written into VISION 2 and level-design 11.10
- C13: Which rules bind warehouseOps, the old map?
  - Hard rules, players 1-4 with 3-4 tags, team doors with a solo route, a validator audit; campus-only items
    (counts, dogs, armour ramp, unavoidable guards) exempt (Recommended)
  - The full Sector Ops profile, as the campus
  - Freeze it as is: selectable, no further revision
- M10: What penalty does killing a Sector Ops dog carry (G348)?
  - It counts as a kill (breaks No kills and Perfect) and takes score off instead of adding it (Recommended)
  - The section restarts, as for a civilian (G353)
  - Only the kill mark: an ordinary kill, no score
- M12: In Sector Ops co-op, what happens to a downed operator who cannot be revived (no syringe left, or no one reaches
  them)?
  - No bleed-out window: they wait downed until a syringe or the connector; only the whole team down restarts
    (Recommended)
  - The coop4 rule: 1-2 players restart the section at once; 3-4 players wait for the next connector
  - Keep master: the campaign's 30 s window, then the section restarts for everyone
- L5: Are dead or tagged-out fittings a legitimate "real gap" under G329?
  - Only where a real site has one (a failed tube, a tagged-out shelter lamp), logged in the element register with its
    reason, never a section's main stealth source (Recommended)
  - No: a fitting that exists is live; darkness only from occluders, cut circuits and shot lamps
  - Yes, freely, as today
- L10 (for L9): How are the lux bands set and approved?
  - light-realism fills scale sheet 9 from AS/NZS 1158.3.1 (car parks, roads, yards) and AS/NZS 1680 / EN 12464-1
    (interiors) after one engine-to-lux calibration; you approve the table and the S1 lux grid together (Recommended)
  - Approve the S1 car park values first, other space types per map as each is relit
  - Keep hand-tuned engine levels, drop the lux calibration (loosens G329)
- V6: Should a light-parity miss or a visual-gate flag hold a release?
  - Parity misses fail: the cards move into a required GPU suite (as e2e-darkness); picture-drift flags stay advisory
    until ~10 clean trains (Recommended)
  - Every visual-gate flag and parity miss holds the release
  - Keep A1 / A2: flag and comment only, never hold
- V10: Which frame budget binds campusOps at the signed-off guard counts?
  - A Sector Ops line in performance.md: 60 Hz floor (CPU p95 <= 12 ms, GPU p95 <= 15 ms) plus a shadow-pass GPU ms
    line; the Warehouse lines unchanged (Recommended)
  - The current lines (main p95 5.5 ms, GPU 5.5 ms at 165 Hz): a campus perf job
  - A 120 Hz line (GPU 7.5 ms)
- V11: What load budget does campusOps get?
  - Cold first load <= 2x Warehouse Ops (job A20), cached <= 2x the Warehouse cached line, measured on the laptop
    (Recommended)
  - Fixed caps, e.g. cold <= 30 s, cached <= 5 s
  - No campus load budget
- V12: Must cold shader compiles finish on the loading screen?
  - Yes: the loading screen waits for body effects up to a written cold cap, and the held body-shader slice cuts the
    compile (Recommended)
  - No: compiles may finish in play, with a written "characters drawn within N s of match start" budget
  - Keep the 6 s warm-up cap and the 90 s watchdog, documented as is
- V16: Who may accept a deliberate look change into the visual-gate baseline?
  - The orchestrator, only with Michael's G288 sign-off or his words on record (Recommended)
  - Only Michael
  - The orchestrator citing any job BRIEF (A9 as written)

### 1c. Other gaps

| # | Item | Rule (doc + section / G) | Current state (file:line) | Gap | Fix | Size | Needs Michael? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | Guard counts S1-S5 (v1) | G328, G362; level-design 4.9 "Signed-off counts: S1 15, S2 18, S3 20, S4 25, S5 26 ... for two players" | Master: S1 8 (src/world/maps/campusSectors.ts:33-77), S2 12 (:84-138), S3 16 (:148-209), S4 20 (src/world/maps/campusS4Data.ts:35-75), S5 24 (src/world/maps/campusS5Data.ts:33-75) | v1 is 7 / 6 / 4 / 5 / 2 guards short | Planned in campus-greybox: S1 G2-G5 (feature/campus-greybox@c2f1f131 docs/campus-greybox/briefs/S1.md:314, :418, :491), S2-G6a (briefs/S2.md:377), S3-R5 (briefs/S3.md:239), S4 G4.6 (PLAN.md:97), S5-P3 (PLAN.md:104) | L | no |
| C2 | 3-4 player tagged extras | G331 "guards tagged by team size"; G362 "three or four players add the guards tagged for them"; VISION 2 Guards row | `SectorGuard` has no team-size tag (src/game/sectors.ts:81-102); tags and `guardForTeam` only on unmerged feature/coop4@24ba2e51 (src/game/sectors.ts:549-551), on the v1 lists. The v2 sign-off plans say "campus guards do not scale" (feature/sector-redesign-signoff@9eb7b9c6 docs/sector-redesign/signoff/S5-detail.md:216 AS3, S2-detail.md:348 AS13, S3-detail.md:250 AS13) | Master spawns the same guards for 3-4 players; v2 plans carry no extras; coop4's tags sit on `campusSectors.ts`, which campus-greybox P0 splits (BRIEF A5, docs/campus-greybox/BRIEF.md:50-53), so they will not carry to v2 | Retire AS3 / AS13 in the campus-greybox plan; each v2 lane tags its extras (`minPlayers` 3 / 4, coop4's pattern) in `S<N>_PARTS`; land coop4's `guardForTeam` first. Not planned anywhere yet | M | no |
| C3 | S5 live cap at 3-4 players | G328 S5 "26 guards, inside the 32 cap"; G331 "alarm reinforcements ... grow with the players"; G362 | v2 S5 "26 + 6 reinforcements = 32" (feature/sector-redesign-signoff@9eb7b9c6 docs/sector-redesign/signoff/checks-signoff.md:100); lane assert "26 + 6 <= 32" (feature/campus-greybox@c2f1f131 docs/campus-greybox/PLAN.md:104); runtime clamps reinforcements to the room left (src/ai/gear.ts:187, src/ai/enemyManager.ts:1966) | Any S5 extra leaves less room for reinforcements than at 2 players, against "grow with the players"; the lane's assert fails once tags are added | Michael picks (1b C3) | S | yes |
| C4 | Team door solo window (S2 v2) | G280 "true 2-player pathways that cannot be used solo"; level-design 11.10 "Team doors stay two-player, with a solo route past them" (docs/level-design.md:283); VISION 2 Co-op need | v2 S2 C18 "one player turns both keys within 8 s" (feature/sector-redesign-signoff@9eb7b9c6 docs/sector-redesign/signoff/S2-detail.md:105; signed page S2.md:17); ENG-1 `soloWindow` (feature/campus-greybox@c2f1f131 docs/campus-greybox/briefs/S2.md:342-343, :447); solo routes past both doors exist without it (briefs/S2.md:532) | Doc conflict: the signed S2 page (G328, newer) lets one player use a team door; G280, VISION 2 and level-design 11.10 forbid it | Michael picks (1b C4) | S | yes |
| C5 | S5 co-op rope works solo (v1) | G280; level-design 11.6 [SectorOps] no co-op move a solo player makes anyway | docs/level-validator/campus-run/REPORT.md:230 (CR7, 4.2 m sill drop, no rail); run.txt:319 | The "co-op only" CR7 rope is a solo route on master | Planned in campus-greybox S5-P4 "CR7 solo-cannot" (PLAN.md:105) | M | no |
| C6 | S3 one route, blocked corridor (v1) | level-design 11.2 "at least 2 independent (edge-disjoint) routes" (docs/level-design.md:241-242); 4.9; VISION 4 rule 9 "with room to manoeuvre" | run.txt:147 (S3: 1 independent route); REPORT.md:238, :244 (viewing-corridor pair leaves a 0.2 m gap) | S3 has one entry-to-exit chain and a guard-blocked corridor | Planned in campus-greybox S3 re-plan R1-R5 (PLAN.md:78-86); plan graphs 0 errors (checks-signoff.md:97) | L | no |
| C7 | Three routes plus a secret, co-op coverage (v1) | level-design 3.2 (docs/level-design.md:80); 11.9 "Co-op routes are in at least half of the encounter spaces" (:278-279) | Rule-of-three ERRs S1 3, S2 6, S3 5, S4 14, S5 13 (REPORT.md:102-106); a secret in 2 of 25 (run.txt:318); co-op links reach 6 of 25 (run.txt:148) | v1 fails 3.2 and 11.9 on every section | Planned in all five sign-off plans (plan graphs 0 errors, checks-signoff.md:97; the reviewer's own count from the plan JSON: co-op links touch 21 of 28 encounter spaces, not yet reproduced with the validator's rule); built by the lanes | L | no |
| C8 | Graph player counts and keys | level-design 11.1 "The graph lists the counts in `meta.players`" (docs/level-design.md:236-237); 4.9 "per player count in the graphs" | Master graphs `"players": [2]` (docs/sector-redesign/graph/campusOps-S1.json:2, S2.json:2, S3.json:2, S4.json:6, S5.json:2; docs/level-validator/campus-run/CONVENTIONS.md:15-16). Plan graphs `[1,2,3,4]` with mixed keys: "1".."4" (S1, S3), "2" only (S2, S4), "1" only (S5) (checks-signoff.md:85) | Master graphs are two-player only; in v2 S2 / S4 have no key at or below 1, so the alive check sums 0 at one player (scripts/level-validate.mjs:753-763); no graph has 3 / 4 keys above the 2-player count | One convention: keys "1".."4" on every space, 3 / 4 including C2's extras. Partly planned (BRIEF A13 BRIEF.md:79-81; briefs/S2.md:433-434) | S | no |
| C9 | Graph guard totals | level-design 4.9 "The graph records the count per player count"; G332 alive ceiling | Graph sums vs code: S2 5 / 12, S3 7 / 16, S4 14 / 20, S5 14 / 24 (REPORT.md:367-371); plan graphs S2 15 / 18, S3 10 / 20, S4 23 / 25, S5 17 / 26. Off-route and connector-choke guards sit in `note` (REPORT.md:58-65) while docs/level-validator/campus-run/CONVENTIONS.md:13-14 says chokes "count in their space's `guards`" | The per-section alive ceiling (scripts/level-validate.mjs:748-766) sums only `guards`, so it cannot see S5's 26 (+ extras); convention conflict | Count every spawned guard in some space's `guards` (chokes included), or a section total the ceiling check reads. Validator owner: Marlow Build | S | no |
| C10 | Unavoidable guards not tagged | level-design 4.12 "The graph tags his space `unavoidable`" (docs/level-design.md:152-153); G303 | K1-K4 built (src/world/maps/campusSectors.ts:70, :135; campusS4Data.ts:69; campusS5Data.ts:47-48; docs/sector-redesign/SPEC.md:499-511); no master or plan graph has the tag; the validator WARNs (scripts/level-validate.mjs:807-808); lane briefs keep `meta` unchanged (briefs/S1.md:614) | The 4.12 check cannot pass on master or v2 | Tag `s5-ante` (K4) and the K1-K3 spaces in the v2 graphs | S | no |
| C11 | Measured pass, route-runs | VISION 5 build gates; level-design 14 greybox exit (docs/level-design.md:484-488), 15 | `--require-measured` not on master (scripts/level-validate.mjs:13, :1187); feature/level-validator-v6@8f551e18 and feature/route-runs unmerged; no campus graph has a measured value; run.txt is from 2026-10-24 (1423a6d8), before the unavoidable and alive checks (12a6e91e) | No campus section can reach greybox exit; the last campus run is stale | Merge V6 and route-runs (Marlow Build), then re-run all five graphs; campus-greybox waits for it (BRIEF A3, BRIEF.md:44-46) | L | no |
| C13 | warehouseOps against the Sector Ops profile | VISION 2 Maps lists `warehouseOps`; the level-design Sector Ops profile names only `campusOps` (docs/level-design.md:25); level-design 14 "A map already greyboxed runs it as an audit" (:480), 15 | No warehouse graph anywhere; 8 / 8 / 9 guards (src/world/maps/warehouseSectors.ts:40-59, :104-124, :161-182); no 3-4 tags (coop4@24ba2e51 tags 6, 2 per section, unmerged); no unavoidable guard, dogs or armour ramp | Never validated; which Sector Ops rules bind the old map is undecided (doc gap) | Michael picks (1b C13); at minimum write its graph and run the validator as an audit | M | yes |
| C14 | Splits, assist, overwatch, room for two (v1) | level-design 11.3 Splits, 11.4 Assist, 11.5 Overwatch, 11.7 Room for two (Rule index docs/level-design.md:661-665: `checkCoop`, `checkDimensions`) | Master graphs have no split: "No section has a split" (docs/level-validator/campus-run/REPORT.md:33-34); "Not reached in this run: split timing, partner reach, parity, overwatch and assist" (:135, :290); "corridor width 1" WARN on S4 (REPORT.md:102-106). The v2 plan graphs tag one split per section (`split:s1:a/b` ... `split:s5-k4:a/b`, feature/sector-redesign-signoff@9eb7b9c6 docs/sector-redesign/graph/plan/campusOps-S<N>.json) | On master the split, assist, overwatch and shared-width rules never run on the campus; v2 declares them but they are unproven until V6 | Planned in campus-greybox (the plan graphs); measured at greybox exit with V6 (C11) | L | no |
| C15 | v1 validator errors beyond rule of three | level-design Rule index (docs/level-design.md, end: one check per rule) | v1 campus: 147 ERR in all, incl. dead ends, class min size, targets, camera floor, fire-stair width, pacing (docs/level-validator/campus-run/REPORT.md:102-106) | v1 fails the Rule index checks on every section, not only rule of three (C7) | Plan graphs 0 errors (feature/sector-redesign-signoff@9eb7b9c6 docs/sector-redesign/signoff/checks-signoff.md:97); planned in campus-greybox; re-run at greybox exit (C11) | L | no |
| C16 | Section 15 acceptance tests for campusOps | level-design 15 "Acceptance tests every map has" (docs/level-design.md:492-512): `e2e-anchors.mjs` covers the map (:500); darkness at each vantage / pocket (:503-505); noise (:506); a ghost run earns every section-rating bonus and a body left on a route is found (:508-509); co-op revive on each co-op surface, solo past every team door (:510-512) | scripts/e2e-anchors.mjs:12 runs `proving` only (`MAPS = [['proving', 'sandbox'], ...]`) while the campus places ladders (src/world/maps/campusS3.ts:403, campusS4.ts:456-457, :473). The other section 15 items were not checked per campus section in this review | Verified gap: the campus anchors are not in e2e-anchors. The rest of section 15 is unproven for campusOps | Add campusOps to e2e-anchors; at greybox exit audit each section 15 line against e2e-sectorops and the unit tests, one row per missing line. Owner: Sector Ops (campus-greybox exit) | M | no |
| M5 | Objective popup | G343 "View (Select) + O ... shows the current objective for ~5 s", also on every update; G351; bible 5.10; level-design 6.4 | Always-on HUD line (src/ui/hud/hud.ts:144, :159, :302-304), hidden only when empty (src/styles.css:1028); Sector Ops writes it every step (src/game/modes/sectorMode.ts:775, :795) and in the banner (:756); no View / O binding (no `KeyO` outside the editor) | No ~5 s fade-in, no View / Select or O recall | HUD popup: fade in ~5 s on change and on a View / O tap. Owner: Campaign Build (row 7, menu / HUD) | M | no |
| M6 | Field menu objective list | G343 "the menu keeps the full list"; bible 5.10 | For any mode but Infiltration the pause menu's list is the HUD's current text (src/game/gameState.ts:1255-1262) | One line, no done / to-do; once M5 fades the line, the list reads empty or stale | `SectorMode` gives `objectiveLines()` from `run.defs`. Owner: Campaign Build with M5 (Sector Ops supplies the lines) | S | no |
| M7 | Stars: a higher clear fills the lower | G331 "a clear on tier N fills every star below N"; bible 5.8 Difficulty; ROADMAP row 12 | `markCompletedIn` adds only the cleared preset (src/save/sectorRecord.ts:52-58); `starsOf` reads `done` as is (:68-71). ROADMAP row 12's pointer :14-16 is the `done` field | A Perfectionist clear shows one star, not four | Fill every `DIFFICULTIES` entry up to the cleared index (or derive the fill in `starsOf` so old saves get it); best times stay per preset. Owner: Sector Ops (row 12) | S | no |
| M8 | Helmets by difficulty | G350 "On Realistic and Perfectionist every guard has a helmet; on Perfectionist it cannot be shot off"; Rookie / Normal only at alarm stages; bible 5.6; VISION 2 | Helmets follow the alarm stage only (src/ai/gear.ts:30-35) and always come off at the first head shot (:139-143); no gear code reads difficulty; S4 / S5 give every guard a helmet on every difficulty (`gear: 'helmet'`, src/world/maps/campusS4Data.ts:191-192, src/world/maps/campusS5Data.ts:175); three S4 officers `gear: 'both'` (campusS4Data.ts:47, :61, :62) | No helmets from the start on Realistic / Perfectionist; Perfectionist helmets can be shot off; S4 / S5 helmet Rookie and Normal outside the alarm stages | Gear takes the difficulty (Realistic and Perfectionist: every human guard; Perfectionist: no knock-off); drop the S4 / S5 section helmet tags (armour may stay as G307 late armour). Owner: Guard AI (row 14); S4 / S5 data: Sector Ops | M | no |
| M9 | Dogs can be taken down | G348 "A dog cannot be taken down (no palm strike, no grab)"; level-design 4.10; bible 5.8 Dogs | Only the grab and the palm strike exclude dogs (src/game/takedownController.ts:228; src/game/strikeController.ts:92, :231); dogs stay takedown candidates (src/game/gameState.ts:540; src/game/takedownController.ts:275-279); campus dog rows carry a `takedownSpot` (campusS4Data.ts:39; campusS5Data.ts:43, :45) | A dog can be taken down from behind | Skip `def.quadruped` in the takedown scan and the co-op host's takedown check; drop the dog `takedownSpot` need in the M8 data check. Owner: Guard AI (row 14) with Player | S | no |
| M10 | Killing a dog is rewarded | G348 "killing one carries a penalty" | A dog kill scores +120 base (`KILL_BASE.dog`, src/game/modes/score.ts:3; +10% per tier above 1) through `killScore` (src/game/modes/sectorMode.ts:1312), counted as an ordinary kill (:1317) | A reward, not a penalty; the penalty's form is undecided | Michael picks (1b M10). Owner: Sector Ops (score), Guard AI (dog) | S | yes |
| M11 | 1-4 players and scaling | VISION 2 "1-4 (G308)"; G331 "Keep scaling (coop4 as built)"; G362; level-design 11.1 | Master caps Sector Ops rooms at 2 (`COURSE_MAX`, src/net/protocol.ts:39-41); syringes by difficulty only (src/game/sectors.ts:510, :877-879; src/net/coopHost.ts:206); flat `perStage` reinforcements (src/game/sectors.ts:841). #317 adds `SECTOR_MAX` 4 (feature/coop4@24ba2e51 src/net/protocol.ts:42-44), `syringeExtra`, `reinforcePerExtra`, `guardForTeam`, `outWaitsMin` 3 | Master is 1-2 players, no scaling | Land #317; then the campus data tags the 3-4 player guards (C2). Owner: Guard AI / Player (row 16) | L | no |
| M12 | Downed with no syringe; the 30 s window | bible 5.9 C6: Sector Ops "no lives ... in solo, or with the whole team down, the run restarts"; G188. Neither gives a window | Sector Ops uses the campaign `ReviveClock` 30 s window (src/game/reviveClock.ts:8, :18-21; G126 is the campaign rule); an operator past it or with no syringe goes out (src/net/coopHost.ts:563, :572-580), which restarts the section for everyone (src/game/modes/sectorMode.ts:1333-1336); the briefing says "Go down and the section restarts" (src/ui/screens/briefingScreen.ts:57) | Doc gap: no doc gives Sector Ops a bleed-out window or says what an out operator does; code restarts on one out while C6 says only the whole team down | Michael picks (1b M12); then bible 5.9 C6, level-design 9.4 and the briefing line. Owner: Sector Ops | S | yes |
| M13 | Strict rules | G291 "strict rules allowed globally, per team or per split"; VISION 2; bible 5.8; level-design 9.3 | `SectorDef` has no rule fields (src/game/sectors.ts:104-154); rules exist only for Infiltration (src/game/missions.ts:35, :271-278); feature/mission-framework@dd5d3bb7 has no src change (docs plus scripts/graph-svg.mjs) | Sector Ops cannot run a strict rule, so Split Shift and Code Relay (G291) cannot be built | Mission-framework rule nodes with a section restart, scoped global / team / split, read by `SectorMode`. Owner: Campaign Build | L | no |
| M14 | Parallel objectives | VISION 2 Routes "parallel objectives (G190, G291)"; bible 5.8 | One objective per section (`objective: SectorObjective`, src/game/sectors.ts:111; header :12-14); objective then exit (`SectorPhase`, :694) | No parallel tracks for two teams | Objective chains with parallel tracks (mission framework). Owner: Campaign Build (framework), Sector Ops (campus use) | L | no |
| M15 | Op result has no perfect rating | VISION 4 rule 3 "no kills, no alarms, every primary objective" (G146); bible 5.8 Results | The op result's only top label is Ghost: no kills and never spotted (src/game/sectors.ts:862-866); results stars only for Infiltration (src/ui/screens/resultsScreen.ts:82-88) | A G146-perfect run (seen, no alarm, no kill) gets no perfect mark (perfect stays possible; it is not shown) | "Perfect" beside Ghost on the op result and banner; a unit test that a run can be perfect. Owner: Sector Ops | S | no |
| M16 | Main-menu stars read the old map | G328 (campus is the Sector Ops map), G331 | The main menu counter reads `starsFor('warehouseOps')` (src/main.ts:164-166); text "the Warehouse in sections" (:257) | The stars shown are not the campus op's | Show campusOps (or the best op's) stars; fix the line. Owner: Sector Ops | S | no |
| M17 | No data check of the solo route past team doors | G280 "solo play keeps a working route past them"; level-design 11.6, 11.10 | `checkSectors` checks a bolt's side and a pair gate's switches, not a solo route past each (src/game/sectors.ts:548-571); `SectorRoute` has no solo flag (:73-78); keypad codes get a solo-reach check (:207-211) | Only the validator graph proves the solo route, and only once a graph exists | `solo: true` routes in `SectorDef.routes` plus a nav-grid test that each section has one avoiding every pair gate and far-side bolt (as `checkStageActions`). Owner: Marlow (validator) with Sector Ops | M | no |
| M18 | Riot shields "later" (doc conflict) | G307 (3) "riot-shield enemies only in alert response teams"; bible 5.7 lists shields under "Later Sector Ops sections" | Every response team from S1 is led by a shield guard (src/ai/gear.ts:155-163; src/game/modes/sectorMode.ts:951); no section list places an enforcer | Soft doc conflict: G307 is themed "as sections get harder" (docs/DECISIONS.md:1696-1701) and its (1) and (2) say later, but (3) has no section limit; bible 5.7 narrows (3) to later sections; the code follows G307 (3) | Orchestrator reads G307 (3) and aligns bible 5.7 one way or the other. Owner: Orchestrator (docs) | S | no |
| L9 | Lux calibration and band values | Bible L17; level-design 5.5; G329 "engine light is calibrated to lux once and measured from the bake at greybox exit" | Every cell TBD (docs/design/scale-sheet.md:167-190); no lux conversion in src; feature/light-realism has engine-unit scripts only (s1Grid.ts:118, :193) | No band to light or measure against on any map; every map is hand-tuned (section 3) | One engine-to-lux calibration; fill scale sheet 9 per space type; measure each map's spaces. Values need Michael (1b L10; the scale sheet is the level standard). Owner: Sector Ops (light-realism, row 10) | L | yes |
| L12 | Campus SPEC lighting rules predate G329 | Doc conflict: G329 (DECISIONS) above SPEC (job doc) | docs/sector-redesign/SPEC.md:145-148 (a 0.14 standby fill in encounter spaces; its "Dark only where nobody works" matches level-design 5.1, docs/level-design.md:158); :571 A23 "Each occlusion vantage gets a dark pocket"; no G329 / lux / band reference in SPEC, STATE or PLAN | A23 makes darkness per vantage, the "leave it dark" source G329 forbids | Rewrite the SPEC lighting rules to the band (level-design 5.5) and retire A23; each vantage gets a real occluder or a cuttable circuit | S | no |
| L13 | Validator campus run treats 40-60% as a target | Doc conflict: G329 / G284 "yields to the real-world light band" above the job reports | docs/level-validator/campus-run/REPORT.md:30 ("22 of 25 encounter spaces miss the 40-60% shadow target"); S1.md:73 lists it as ERR (2026-10-24, before G329); the validator itself is INFO (scripts/level-validate.mjs:684-689) | Stale reports read as failures | Header note on both, or re-run (C11) | S | no |
| L14 | light-realism job docs missing | RULES "Intake" 2-4 (BRIEF, PLAN, plan checker); G329 "measured from the bake" | feature/light-realism@4879884e holds scripts/light-realism/{s1-grid.mjs, s1-shots.mjs, s1Grid.ts} and, since this review, docs/light-realism/measure/s1-grid.json; no BRIEF, PLAN, research/bands.md, measure/S1-carpark.md or signoff/level-design-5.5.md on any branch (the 09:08 save's planner output was lost) | The job has no plan for "every map" and the S1 result has no write-up | Rewrite BRIEF and PLAN (S1, then every map in section 3), the bands research and the S1 write-up; fresh plan checker. Owner: Sector Ops | S | no |
| L15 | Door light threshold | Bible L12; G41 "one 15% threshold for light, sound and sight" (docs/DECISIONS.md:205) | `DOOR_SHUT` 0.05 (src/world/lightField.ts:29); docs/systems/lighting.md:24 "a door past 15% open passes light ... Decided, not built yet" | Light passes at 5%; a 0.12 peek crack that counts as closed is near it, against one 15% threshold | One shared 0.15 threshold for light, sound and sight; re-run shadowAccuracy and the door tests. Owner: Sector Ops (lighting) with Guard AI | S | no |
| L16 | Char-shadow tier docs and UI text | Bible L18 "1 on Low / Medium, 2-4 on High+"; G315 | Code: Low and Medium 1 lamp (src/world/charShadowSet.ts:48-49); docs/systems/lighting.md:221 says "off / Low / Medium 0 lamps" (contradicts :46); settings text "Auto: on from High shadows" (src/ui/screens/settingsScreen.ts:340) | Docs and player-facing text misstate the shipped behaviour | Fix lighting.md:221 and the settings description | S | no |
| L17 | Glass note stale | Bible L15 (light half) | Glass is never a light shape (src/voxel/lightShapes.ts:23-24); docs/systems/lighting.md:27 "No glass rule exists in the light field yet" | Doc drift | Update lighting.md:26-27 | S | no |
| L18 | Volumetric haze: campus fix unverified, Marlow floods | G316; lighting.md:274 "a beam is not seen in clean air" | Campus fix built (src/world/maps/campusOps.ts:106 `lampBeams: false`; src/vfx/volLights.ts:28-30); GPU after-shots "Findings: pending" (docs/sector-redesign/checks/fog-triage.md:52); Marlow's 12 floods still beam (fog-triage.md:81) | Michael's fog complaint has no GPU sign-off; Marlow is out of line with the clean-air rule | Re-shoot (no shots/fog-4813dbf2 branch exists on origin; fog-triage.md:51 named it) and record the result, queued only when the PR queue is empty; Marlow Build decides its floods | S | no |
| V3 | Parity never checked at Low | Bible P1 "any map at any graphics preset" (docs/design-bible.md:85); level-design 5.4 "at the Low preset: lit and dark areas match the light meter" (docs/level-design.md:166) | Cards only at Epic: feature/visual-gate@07eefea0 scripts/e2e-visual.mjs:84, :367; scripts/visual-gate/viewpoints.mjs:26; docs/visual-gate/PLAN.md:88; master scripts/e2e-darkness.mjs:9-11 | No test compares picture to field at Low | Shoot the cards in the Low browser too (+12 renders) | S | no |
| V4 | Parity is 3 points, not a grid; campus S2-S5 have none | Bible L5 "samples a grid of points per map" (docs/design-bible.md:257); feature/visual-gate@07eefea0 docs/visual-gate/BRIEF.md:15 | Campus: 3 cards, all on the S1 forecourt (viewpoints.mjs:292), one always skipped (V5); every other campus view `parity: null` | Four of five campus sections have no picture-vs-field check | >= 3 cards per campus section in a required GPU suite (V6) so the gate's 180 s target holds (V17); see L8 | M | no |
| V5 | Bible L5 0.27 row never checked | Bible L5 "0.27 / dark / 9% or less" (docs/design-bible.md:265) | `parityRange` skips any level within 0.03 of 0.28 (feature/visual-gate@07eefea0 scripts/visual-gate/metrics.mjs:581); left open in docs/visual-gate/checks/vg5-check.md:65-67; VG7 skipped `card-cp-s1-f-2` (0.273); master e2e-darkness checks 0.27 (scripts/e2e-darkness.mjs:15) | The band just under the stealth threshold is a blind spot | A DARK row match wins over the edge skip (vg5-check.md:67) | S | no |
| V6 | Parity misses and GPU flags never hold a release | Bible L5 "Any mismatch fails" (docs/design-bible.md:258); RULES "a GPU failure counts" (docs/RULES.md:144); RULES Intake 2 (a loosening is a one-click question) | BRIEF A1 / A2 flag only (feature/visual-gate@07eefea0 BRIEF.md:55-59); master policy docs/systems/auto-train.md:161, docs/laptop-queue/visual-gate.md:23, :39; "Michael's answers: None yet" (BRIEF.md:51-52); PLAN Q1 not asked (PLAN.md:228-229) | Doc conflict: the bible (higher) says a mismatch fails, the gate docs say never block; the loosening of rule 1's test was never put to Michael | Michael picks (1b V6) | S | yes |
| V7 | No real-lux check; no "lit places stay lit" rule on campus | VISION 4 rule 2 (G329); bible L17 (docs/design-bible.md:299-303) and 7 "each space's light measured against its real-world band" (:1054-1055); level-design 5.5 (docs/level-design.md:167-172) | No lux / band tool on master; S1 probes only on feature/light-realism; gate BRIEF / PLAN predate G329 and never cite it; campus S1 views have no darkness rule (viewpoints.mjs:271, :290); `whole.mean` min only on Marlow views | Michael's G329 find (the dark S1 car park, L3) passes every gate row; campus greybox exit cannot meet bible 7 | light-realism ships the bake lux-band measure per space (L9); after VG8 the gate adds floor / whole-mean minimums on campus lit spaces | L | no |
| V8 | Flicker exemption hides a stable meter / field split | VISION 4 rule 1; bible P1 "The light meter never lies" (docs/design-bible.md:80) | `meter-cp-s3-c` meter 0.415 vs field 0.352 (d 0.063) in all 3 runs at Low and Epic, "not counted" by A22 (feature/visual-gate@07eefea0 BRIEF.md:121-124); G323 puts a stuttering tube on every main map (docs/design-bible.md:307) | A 3x-tolerance split, stable across runs, is never a miss; possibly a real meter error in campus S3 | Pin flicker before the meter / field read, then apply 0.02; triage cp-s3-c | S | no |
| V9 | Character shadows not in the gate | VISION 4 rule 1 "character shadows included"; bible L11 (docs/design-bible.md:286-290, G352) | Characters hidden and guards parked for every shot (feature/visual-gate@07eefea0 BRIEF.md:68-71) | When L1 lands nothing checks picture vs meter for a character shadow | A character-shadow card rig (High+ and Low lamp sets, L18) with the G352 job (row 11) | M | no |
| V10 | Campus frame time vs the written budget | docs/systems/performance.md "Epic p95 <= 5.5 ms" main thread (:16-17), GPU "165 Hz 5.5 ms" (:14-15); bible 8; level-design 15 (docs/level-design.md:513) | Laptop campus Epic, 24 guards: CPU p95 13.4 ms start, 13.1 ms S5 worst (docs/sector-redesign/checks/perfg-build.md:4-5, 2026-10-23); GPU p95 8.27-9.42 ms (docs/sector-redesign/checks/campus-perf-fix.md:9-11); job docs use their own "CPU p95 < 12 ms" (campus-perf-fix.md:3) and "60 Hz line 12 / 15" (docs/sector-redesign/BRIEF.md:256); no budget for char- or torch-shadow maps (src/world/charShadowSet.ts:46-53) | Campus is ~2.4x the main-thread line and over the GPU line; the 12 ms bar is in no performance.md line (perf is Michael-only); numbers predate the G328 counts | Michael picks (1b V10); performance.md gets the line (plus a shadow-pass GPU ms line); laptop rerun at the G328 counts (a laptop run) | S | yes |
| V11 | Campus load has no budget | performance.md "Warehouse load <= 4 s cold, <= 1.5 s cached", pending a PC run (docs/systems/performance.md:25-26) | No campus line; S1 bake wait 22.2 s at 4 workers, 103 s single-thread, node only (docs/sector-redesign/checks/section-bake-build.md:61-68, "laptop GPU run needed" :75-77); "+22 s campus cold first load" only a STATE note (feature/sector-redesign-polish@f87c37d8 docs/sector-redesign/STATE.md:339); a dead worker can hold the load ~90 s (src/voxel/sectionJobs.ts:32); job A20 "under 2x Warehouse Ops" (docs/sector-redesign/BRIEF.md:97-98) never measured | No written, measured load budget for the current Sector Ops map | Michael picks (1b V11); Test Runner measures cold / cached campus load on the laptop; performance.md line | S | yes |
| V12 | Cold shader compile runs past the loading screen | performance.md "shaders compile on the loading screen (... <= `WARMUP_MAX_MS`)" (docs/systems/performance.md:80); `WARMUP_MAX_MS = 6000` (src/game/gameState.ts:337) | Cold Epic body compile 29.3 s solo, 43.5 s with 3 browsers (feature/sector-redesign-polish@f87c37d8 docs/sector-redesign/STATE.md:335); 36.7 / 43.5 / 38.8 s on campus (src/player/bodyEffectRecovery.ts:24-25); only cap the 90 s watchdog `STUCK_MS` (:27); an unready body is not drawn (:7-9) | Compiles end 23-37 s into play, 5-7x the warm-up cap; no budget covers it | Michael picks (1b V12); then the held body-shader cost slice and a performance.md line | M | yes |
| V13 | F5b rig does not reproduce F5b | G316 "guard torches stop at walls and shut doors" (docs/DECISIONS.md:1775); PLAN P7 "rig so-corner on master: red, kept known" (feature/visual-gate@07eefea0 PLAN.md:214) | `so-corner` leak mean 0 / p95 0 at Low and Epic in all 3 VG7 runs while F5b is "UNFIXED" (BRIEF.md:35); the change is outside the leak quad (viewpoints.mjs:689) | With `known` set (A10) the gate will report F5b as passing: a false "fixed" | Move the quad onto the wedge seen in the run PNGs; P7 must read red before VG8 | S | no |
| V14 | Campus has no active absolute rule | G316 "no hard bright arcs on nearby walls" (docs/DECISIONS.md:1765-1775); PLAN F7 / F8 (PLAN.md:69-70) | No campus view has a `wall` region (viewpoints.mjs:256-450); F8 bounds null until VG8 (:311, :331, :349); P1 (F8) not run: shots/visual-gate-proofs@0cb0de94 (13:34) has 6 tag folders incl. the fixed build v4.88.0 for P2-P6; P1's v4.96.0 / v4.97.0 still unrun | On the current Sector Ops map only parity cards and meter rows can go red | Campus wall regions (>= 60 px) per section; run P1 and VG8 | M | no |
| V15 | Initial baseline is an error run | BRIEF A25 "An error run or one with shots not run is never accepted" (feature/visual-gate@07eefea0 BRIEF.md:137-140) | VG7 run 3 verdict `error` (wh-flood-workshop@low "browser has been closed") is the run recorded on visual-baselines@f3682c92; runs 1-2 not recorded; no `accepted/` record | The planned baseline cannot be accepted; every train run would be error "no baseline" | One more `--rules-only --record` run on master, then the initial accept (when the PR queue is empty) | S | no |
| V16 | Look-change accept can skip G288's sign-off | G288 (4): before a big look change Michael approves with one click (docs/DECISIONS.md:1554-1555) | A9: the orchestrator may accept "citing ... the job BRIEF that names the look change as its aim" (feature/visual-gate@07eefea0 BRIEF.md:81-83; master docs/laptop-queue/visual-gate.md:36-38) | A BRIEF's assumed A entry could re-baseline a big look change | Michael picks (1b V16); tie A9 to the G288 sign-off record | S | yes |
| V17 | Gate runtime over its target | BRIEF Limits "target <= 180 s wall per train, hard cap 300 s" (feature/visual-gate@07eefea0 BRIEF.md:48) | M0 244 s (shots/visual-gate-m0@1956c219 README.md:3); VG7 196.1 / 176.9 / 183.2 s (summary.wallS) | 2 of 3 runs over target before V3-V4 add renders | V3-V4 in a separate required parity suite; then the PLAN 7 ladder | S | no |

Unused numbers: C12 merged into M8 (helmets); L10 is the band question (1b) for L9; L11 (lighting cost budgets) merged into V10-V12.

## 2. Checked, conforms

Campus and warehouseOps as maps:
- Spine, reach, no softlock (level-design 11.2, 11.6 [SectorOps]): sections join in order, no space reached only by a
  co-op move - docs/level-validator/campus-run/REPORT.md:110-116.
- 2-3 routes per section in data (VISION 2): three named routes each - src/world/maps/campusSectors.ts:330, :375,
  :231; campusS4Data.ts:81; campusS5Data.ts:100.
- Team doors with a solo route on master (G280): S4 pg-cage (src/world/maps/campusS4Data.ts:203; `s4-cage` also
  reached by door and drop in docs/sector-redesign/graph/campusOps-S4.json), S5 pg-arch (campusS5Data.ts:183; solo
  stealth route :102).
- Unavoidable guards exist in data (G303, level-design 4.12): K1-K4 posted chokes - campusSectors.ts:70, :135;
  campusS4Data.ts:69; campusS5Data.ts:47-48 (graph tag: C10).
- One player uses the full counts (G362): no scale-down code - src/game/sectors.ts:81-102;
  src/game/modes/sectorMode.ts:704-705.
- Alive cap 32 and screen cap on v1 (G332): S5 24 + 6 <= 32 asserted - tests/campusS5.test.ts:201;
  `CAMPUS_SCREEN_CAP` 12 - campusSectors.ts:19; ceiling src/game/sectors.ts:508.
- Dogs with handlers (G297, G298): S4 one, S5 two - campusS4Data.ts:39; campusS5Data.ts:43, :45; src/game/sectors.ts:581-598.
- Late armour, shields only in response (G307 (2)(3), level-design 4.10): armour on S4 supervisor / NOC
  (campusS4Data.ts:47, :61-62) and S5 response team / keyholders (campusS5Data.ts:36-48); shields only in response
  teams (src/ai/gear.ts:155-163); no enforcer in any section list.
- Bulletproof cameras later, armoured routes with a quiet bypass (G307 (1)(10), level-design 4.11):
  campusSectors.ts:257; campusS4Data.ts:105-107, :144, :147; campusS5Data.ts:124-144.
- Security devices have reasons (level-design 4.11): every camera has a `reason` (campusSectors.ts:269-286);
  registers docs/sector-redesign/SPEC.md:235, :309, :364.
- No markers in map data (VISION 4 rule 5): no marker / blip / waypoint in any campus or warehouse map file (the
  mode-side markers are M1-M3).
- Fixed patrols (VISION 4 rule 8): fixed points, waits or a shared clock - campusSectors.ts:38-51; campusS5Data.ts:23.
- Paired patrols and a high-route lookout (G335, level-design 3.6): campusSectors.ts:51, :66, :107; S5 roof
  marksman campusS5Data.ts:63-64.
- Hardened lit choke points (G333): none declared on master or in the plans (allowed, not required).
- Sign-off recorded verbatim (G328): feature/campus-greybox@c2f1f131 docs/campus-greybox/BRIEF.md:12-18.
- warehouseOps routes (VISION 2): three routes per section - src/world/maps/warehouseSectors.ts:61-63, :125-127,
  :183-185; solo tests tests/warehouseCoopS1.test.ts..S3. Its team doors are plain bolts, which sector-redesign BRIEF A21
  says one player can unbolt (docs/sector-redesign/BRIEF.md:99): folded into C13 (which rules bind the old map).
- Patrols in separate pockets, each with a takedown spot out of the other guards' sight (level-design 4.4, Sector Ops
  profile docs/level-design.md:31): every `SectorGuard` has a `takedownSpot` (src/game/sectors.ts:82), checked by the M8
  isolation-in-time test per section, except the recorded overlap pairs (src/game/sectorCheck.ts:5-8; tests/campusS1.test.ts:568, campusS2.test.ts:673-680,
  campusS3.test.ts:548, campusS4.test.ts:693, campusS5.test.ts:710). Recorded overlap pairs, allowed as paired patrols (level-design 4.4, docs/level-design.md:114-117;
  G335): S1 2 (campusS1.test.ts:571-574), S2 1 (campusS2.test.ts:679, :683), S3 1 (campusS3.test.ts:551-553), S4 3
  (campusS4.test.ts:696-697), S5 4 (campusS5.test.ts:713-715): 11 pairs, 22 of 80 guards.
- Campus art is render only (VISION 4 rule 10, bible L1): "render side only, gameplay never reads it", lit by the
  baked lamps (src/world/campusArt/campusArtRender.ts:2-5).

Sector Ops mode:
- Soft windows only (G334, level-design 6.3): no countdown, deadline or time limit in the Sector Ops code or data; a
  lockdown door is "never the only way" (src/game/sectorStage.ts:12-16, checked by `checkStageActions`); the desk
  camera loop is a 30 s window the players open (src/game/sectorDesks.ts:5-6, :34); the 1 s pair-gate key window is a
  co-op timing (src/game/sectors.ts:403-416).
- No lives; solo or whole team down restarts at the section checkpoint (G188): src/game/modes/sectorMode.ts:1325-1330;
  src/game/sectors.ts:794-796 (the one-out case: M12).
- Syringes by difficulty, co-op only (G188, bible C6, level-design 9.4): src/game/sectors.ts:510;
  src/net/coopHost.ts:206; the solo HUD shows none (src/game/modes/sectorMode.ts:1302-1308).
- Difficulty fixed per op, host picks, stars per op (G189, G331, bible C7): src/ui/screens/briefingScreen.ts:92-93,
  :112; src/ui/screens/missionsScreen.ts:70-105; src/save/sectorRecord.ts:10 (fill-lower: M7).
- Stealth over shooting, mode side (G307 (5)(7)(12)): section marks and rewards
  (src/game/rating/sectionRating.ts:80-85, :123-133); a weapons crate per section (src/game/modes/sectorMode.ts:759);
  no ammo pickups on the campus (src/world/maps/campusS1.ts:112, campusS2.ts:170, campusS3.ts:193); synced takedowns
  counted (sectorMode.ts:1320-1322).
- Alarm stages add armour / helmets and a response team, never cameras (G307 (4)): src/ai/gear.ts:30-35;
  sectorMode.ts:938-941.
- Every guard armed, no heavies (G298, G155): src/game/sectors.ts:581-598.
- Dogs: no palm strike, gas knocks them out (G348, partial; takedown M9, penalty M10): src/game/elbowStrike.ts:63-65;
  src/game/strikeController.ts:92, :231; src/game/gadgetSystem.ts:400-413.
- No forced kill, perfect possible (VISION 4 rules 3-4, G127): a knock-out is not a kill
  (`knockoutsBreakNoKills: false`, src/game/rating/sectionRating.ts:73-77; sectorMode.ts:1311-1322); kills optional
  (src/game/sectors.ts:16-17).
- Team doors are two-player (G280): a pair gate needs two players (src/game/sectors.ts:440-465); a bolt opens from its
  own side (:255-257); every keypad code is reachable solo (:207-211).
- Guard render freeze is render only (VISION 4 rule 10): src/game/sectorGuardFreeze.ts:9-17.
- The other Sector Ops modules hold no rule break found: sectorCheck.ts (the M8 layout check, test-time only,
  src/game/sectorCheck.ts:4-8), sectorKeypads.ts (codes are found in the level, never typed; a restart drops that
  section's codes, src/game/sectorKeypads.ts:3-8), sectorReset.ts (a restart puts lights and unlocked doors back,
  src/game/sectorReset.ts:3-8), sectorTeamDoors.ts (the bolt and pair-gate doors whose rules are checked above and in
  M17).

Lighting:
- One light function on every map (bible L1, L18, G316): LightField src/world/lightField.ts:114; photometric lampMath
  (docs/systems/lighting.md:47-57); no Classic path or falloff setting in src/world.
- The meter (bible L6): src/game/gameState.ts:1659-1701 at 10 Hz, thresholds 0.28 / 0.6 (src/world/lights.ts:87-94),
  chest and head with crouch and peek (src/world/lightField.ts:240-248).
- Guard perception reads only the field (bible L1): src/ai/enemy.ts:236-239, :2015, :2447; src/ai/perception.ts:179;
  src/ai/enemyManager.ts:1719, :3674.
- Gameplay never reads graphics for light (CLAUDE.md hard rule, bible L2 and 8, VISION 4 rule 10 first half): no
  quality, preset or governor import in lightField, lights, lightBake or lampMath; fixed light shapes
  (src/voxel/lightShapes.ts:19-33); the field is built on every path (src/world/world.ts:164), only the picture is
  skipped on `cheap` (:213).
- Section-bake parity inside the live section (bible L1): per-lamp bytes are job-independent and the tests are exact
  (docs/systems/lighting.md:171-173; src/world/maps/campusBake.ts).
- Per-section bake membership is pure and gameplay-safe: a lamp counts for every section its influence reaches
  (src/world/sectionBake.ts:1-8); the late-join gap is L7. PR #385 (merged, section-bake polish 4) added the retry cap
  and replaces a stalled worker (src/voxel/sectionJobs.ts:30-33; its ~90 s hold is in V11).
- Torch and character shadow maps are one formula each, in one atlas (src/world/torchShadows.ts:1-8,
  src/world/charShadows.ts:1-6); character shadows are "Rendering only" (src/world/charShadows.ts:7), which is the L1 gap.
- scripts/light-measure/ (master: lightProbe.test.ts, vitest.probe.config.ts) is the 2026-10-23 field-only probe
  (docs/sector-redesign/checks/light-measure.md:1-6, "No GPU run was made"); it measures engine levels, not lux, and is
  superseded for S1 by feature/light-realism's s1Grid / s1-shots (L3, L9). Kept as a field probe, no rule binds it.
- Hardened lit choke points (G333, bible L8, level-design 5.2): docs/level-design.md:159-161,
  docs/design-bible.md:280-283, docs/systems/lighting.md:21-23.
- Char-shadow lamp counts per tier (bible L18, G315): src/world/charShadowSet.ts:46-53.
- Darkness curve is rendering only (bible L5, L7): src/world/darkCurve.ts:1-6.
- Glass passes light (bible L15): src/voxel/lightShapes.ts:23-24.
- Campus fog cause fixed in render only (G316): src/vfx/volLights.ts:28-30; campusOps.ts:106 (GPU check: L18).
- Interim light rule and the 40-60% demotion (G329, G284): docs/level-design.md:167-174, docs/design-bible.md:299-303,
  docs/design/scale-sheet.md:172-176; the validator reports shadow share as INFO (scripts/level-validate.mjs:684-689,
  tests/levelValidate.test.ts:513-531).

Visual gate and performance:
- Gate measured on GPU (RULES Test tiers): every run is the laptop RTX 4090 ANGLE D3D11, baselines keyed by renderer
  (feature/visual-gate@07eefea0 BRIEF.md:46-47); the desktop lane posts error, never success
  (docs/laptop-queue/visual-gate.md:10-11).
- Tolerances: spec floors until `tolerances.mjs`; A13 / A24 derive them from GPU noise runs (BRIEF.md:90, :130-136);
  the 3 GPU noise runs exist (shots/visual-gate-vg7).
- Zero src diff on feature/visual-gate (BRIEF.md:42-43).
- Guard perception reads the meter's `bodyLevel` (src/game/gameState.ts:1699-1700, src/ai/perception.ts:179), so the
  gate's meter = field rows (all 52 passed or skipped in VG7) cover the perception input.
- Torches through doors on the campus (G316): rig `cp-door` leak mean 0.00006 / p95 0 at Epic, 0 at Low (VG7 run1)
  under the 0.004 / 0.02 rule (viewpoints.mjs:667).
- Gameplay never reads graphics settings (VISION 4 rule 10): every campus / warehouseOps field value is identical at
  Low and Epic in VG7 (e.g. meter-cp-s5-d 0.14118 both).
- Cloud work pending PC run (RULES Test tiers): VG2-VG7 cloud builds were followed by laptop runs before any GPU claim.
- Draw calls (docs/systems/performance.md:21, <= 600 draws): campus guard-cap alert draws 583-589
  (docs/sector-redesign/checks/perfg-build.md:5, campus-perf-fix.md:12): inside the cap, a watch line for the G328 counts
  (re-measure with V10).
- Slice status: on master VG6 only (inert train wiring: scripts/laptop-queue/visual.mjs, docs/laptop-queue/visual-gate.md);
  branch only VG1 + VG1p, VG2, VG3 + VG3p, VG4, VG5, VG7 phase 1; not done VG7 phase 2, P1-P7 (6 of 8 builds run),
  VG8, C1, VG9, the 6 stacked PRs.

## 3. Per-map lighting

Registry: src/world/maps/index.ts:20 (`MAPS`) plus DEV_MAPS :25 (studio). kestrelCampus is Kestrel's data model
(src/world/maps/kestrel.ts:8), not a separate map. No map is measured in lux yet (L9).

| Map | Band source | Measured or not | Gap |
| --- | --- | --- | --- |
| campusOps (Saltmarsh Park, Sector Ops) | hand-tuned (SPEC LR7 standby fill 0.14, src/world/maps/campusS1.ts:316-319); scale sheet 9 TBD | S1 car park only, engine units (feature/light-realism@4879884e s1Grid.ts, s1-grid.json); S2-S5 not measured | L3, L6, L7, L12, L18 |
| warehouseOps (Sector Ops, old map, G298) | hand-tuned to engine-unit test bands (tests/warehouseS{1,2,3}Light.test.ts; docs/systems/lighting.md:128-129) | engine units only (unit tests) | L5 |
| warehouse (base, every mode) | hand-tuned (`LAMPS_ON` subset, src/world/maps/warehouse.ts:27-31) | e2e-darkness 4 cards at Epic (scripts/e2e-darkness.mjs:10) | L4 |
| ctcourse (Marlow Yard) | hand-tuned `MARLOW_LEVEL` (src/world/lighting/levels.ts:24-43), lit by default (G279) | engine units (tests/marlowLightingLevels.test.ts, ctcourseLight.test.ts) | not on the band yet (G329 "then every map"); L18 floods |
| provingGrounds (test range) | none (ambient 0.7, src/world/maps/provingGrounds.ts:28) | not measured | none (lit range, no stealth) |
| kestrel (paused, G53) | hand-placed editor lights (src/world/maps/kestrel.ts:100-101, kestrelLights.ts) | not measured | out of scope while paused; band on resume |
| seclab, courselab (debug, unlisted) | none (seclab.ts:35, courselab.ts:24) | not measured | none (debug) |
| bunker (Fallow, parked, `?legacy=1`) | hand-tuned (bunker.ts:211) | not measured | parked: no work (bible 6) |

## 4. Notes

- Not verified: src/game/sectorGuardFreezeView.ts:19-24 picks which guard rigs freeze from the preset-dependent
  char- and torch-shadow slots; if a frozen rig changes a gameplay read (exposure points, bone hit tests), gameplay
  depends on the preset (rule 10). For the Guard AI review.
- Not verified: dog distraction (G348; the release stub src/game/sectorStage.ts:34-38) is Guard AI's; S5's exit dogs
  need gas or a distraction for a perfect run (not checked on the nav grid). #317's sectorMode / coopHost diff was read
  only for protocol.ts and sectors.ts.
- Risk for light-realism: torch slots exist only on maps with ambient < 0.5 (src/world/torches.ts:36); raising
  ambient fill instead of lamps would remove guard torches.
- Stale on master (lower authority, superseded by G328): "up to 24" / 24 S5 guards (docs/sector-redesign/BRIEF.md:44,
  SPEC.md:437, PLAN.md:95); the comment at src/world/maps/campusSectors.ts:21-25 still calls S3-S5 guardless stubs.
- campus-greybox has lane briefs for S1-S3 only; C2, C8 and C10 can go straight into the S4 / S5 briefs.
- The validator was not run (plan only); plan-graph figures are reads of the JSON.
- Optional hint layer (G290, off by default) is not built anywhere: conforms today.
