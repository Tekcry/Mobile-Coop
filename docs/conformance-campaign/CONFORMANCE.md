# Conformance review: Campaign Build (plan only)

Brief: `origin/feature/menu:docs/orchestrator/review-briefs/campaign.md` (G355: "All current maps/features should be
revised once documentation work has been completed"). Plan only: no src, test, map, script or config change here.

Status: complete for checking (2026-10-25 ~13:50). Section 1 is the summary; parts A, B, C hold the evidence.

**Refs read (2026-10-25).**
- Docs: origin/master 829a9332 (#407 and train 88 merged). Doc citations are line numbers in that ref.
- Code on master: 829a9332 unless marked.
- Mission engine and Tallow Wharf: origin/feature/mission-engine 00b6cde9 (`@00b6cde9`). Tallow Wharf is not on master.
- Mission specs: origin/feature/mission-framework 5181c9db (PR #372, `@5181c9db`).
- ROADMAP: origin/feature/menu 784d0217. Validators run: master 829a9332, origin/feature/mission-validator 0c62a921, origin/feature/level-validator-v6 8f551e18 (each extracted with `git show` and run with plain `node`).

Sizes: S under 2 h, M 2-6 h, L over 6 h or its own job. "Needs Michael" = a missing or conflicting decision, or a fix
that loosens a Michael-only rule; the questions with their options are in 1c. "Cap" (or "G355", "[cap-ok]" in the parts) marks a
rule fix allowed at the walk cap (G355).

## 1. Summary gap table (hard-rule breaks first)

One row per gap; the detail rows (TW = Tallow Wharf, part A; MF = mission framework and campaign rules, part B; HG = HUD
guidance, part C) carry the file:line evidence and the fix. Where two parts found the same gap, the summary names both.
"Cap" = a rule fix allowed at the walk cap (G355): a fix to a shipped feature (master), or a rule fix inside the dark
Tallow Wharf / engine build. The engine is not on master, so its fixes ship dark with it. "-" means not a rule fix
(new build work); dark builds are not limited by the walk cap either way (G355).

Cross-checks with the other reviews (orchestrator, 2026-10-25): Marlow #417 (dogs in W3 / W4; Course mode radar
`gameState.ts:3617-3618`; minimap, compass and blips in Marlow Yard) = S2, S1 (HG1); Player #416 R24 (View / O) = S11,
R37 (campaign revive cap 2, capacity 2) = S4, S5, H9 (partner minimap blip) = S1 (HG1).

### 1a. Hard-rule breaks

| # | Gap | Rule | Detail rows | Size | Cap | Needs Michael? |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Minimap, compass and objective blips drawn in every mode (master); Marlow Yard and free roam show every live guard; co-op shows the partner's live position (also G135); legacy HQ shop sells "Minimap radar" | VISION.md:59-61 rule 5; G339; G135 | HG1, HG2, HG3, HG4, MF1 | M | Cap | No |
| S2 | Two guard dogs in Mission 1 (W3, W4, both missions; a test locks it in) | VISION.md:29; G155 | TW1, MF4 | S-M | Cap | No |
| S3 | Engine rule kinds `oneChance` (ends the mission) and `window` (a countdown that restarts the section): A12 | G290, G334, G339, G353; VISION.md:62 rule 6 | MF2, MF3, TW24 | M | Cap | No |
| S4 | Campaign revives are Sector Ops syringes by difficulty (1-3) plus grants, not 30 s x 2 per mission | VISION.md:30; G126 | TW5, MF5 | M | Cap | No |
| S5 | Exactly two players not enforced at start; a campaign mission can start solo (sector rooms hold 2) | VISION.md:20, :63 rule 7; G2, G48 | TW6, MF9 | S | Cap | No |
| S6 | Missions and the kit are not dark at the engine head 00b6cde9; the FLG fix is only in an unpushed local merge; `?autostart=tallowWharf&mode=sector` still loads the map as plain Sector Ops | CLAUDE.md:52 (flags) | TW7, MF7 | S | Cap | No |
| S7 | Both shutters are closed stand-in panels: neither mission completes without a debug teleport | VISION.md:57 rule 3 (perfect always possible); G146 | TW2, MF18 | L | - | No |
| S8 | Protected character (Teale) killed or knocked out before he talks: no section restart, the step softlocks | G353 (replaces G145's mission fail) | MF6 | M | Cap | No |
| S9 | Three gate-reach validator ERRs: w2-reading-room 20.0 s, w2-clock-loft 28.2 s, w4-jetty 15.8 s (master's validator) | level-design.md:257-259 (11.6), :478-481 (14) | TW3 | M | Cap | No |
| S10 | Lighting basis is Marlow's "lit by default" (G279), not real-site light per space type | VISION.md:31, :55-56 rule 2; G329 | TW4 | M | Cap | No |
| S11 | No objective popup: the objective line is always on; View / O not bound; the engine adds an always-on list outside Marlow | VISION.md:48-49; G343, G351 | HG5, HG6, HG7, HG9, MF13 | M | Cap (HG5, HG6) | No |
| S12 | Objective text without "where": Mission 1 tgc-2; section banner shows the other mission's objective; three Sector Ops lines | G336, G351 | MF14, TW16, HG10 | S | Cap | No |

### 1b. Other gaps (standard, gates, docs)

| # | Gap | Detail rows | Size | Needs Michael? |
| --- | --- | --- | --- | --- |
| S13 | Greybox exit gate not met: no measured validator pass, no route-runs, no walk card; the three validator branches disagree (master: gate reach; mission-validator: kit dims; V6: rejects `shutter` / `team_pull` / `team_throw`) | TW10, TW11 | L | No |
| S14 | G157 level-standard review (12 changes) never done before the Tallow greybox; G293 waived only G288's sign-off | TW8 | S | Yes (Q1) |
| S15 | Four sign-off pages have no pick and are out of date (claim 0 ERR, omit dogs, lighting, stand-ins, present solo-jumpable throws as forced) | TW9 | S | Yes (Q2) |
| S16 | Throw gaps (2.5 m) are solo-jumpable; graph and sign-off treat them as forced | TW17 | S / L | Yes (Q3) |
| S17 | No Campaign mode entry: missions start by URL on an unlisted map; lobby "Campaign" label points at Marlow Yard; no briefing; no campaign save / rejoin (G147); a clear writes Sector Ops stars; no 0-100% rating | MF8, MF9, MF10, MF11, MF12 | L (own job) | Yes (Q4) |
| S18 | No civilian kind; clerks, porters, readers are armed guards, so G353's civilian restart cannot apply | TW20, MF16 | M | Yes (Q5) |
| S19 | Section-rating grants and optional rewards inherited from Sector Ops; alarm response leads with a riot shield | MF17, MF15 | S | Yes (Q6) for grants |
| S20 | Phase 1-2 map deliverables missing (element register, guard sheets, light / sound / checkpoint / medkit / civilian plans, 16.10 answers); SPEC not on the current template | TW12, TW23 | L | No |
| S21 | One restart point per section, not a checkpoint before each encounter space | TW13 | M-L | No |
| S22 | Map data gaps: hide spots (TW14), no medkit station (TW15), splits not declared (TW18), no high-route lookout yet (TW19, after Guard AI's G335), graph drift (TW21), roof ladder through a let loft (TW22) | TW14, TW15, TW18, TW19, TW21, TW22 | S-M each | No |
| S23 | Tests: level-design 15 acceptance tests not run for the map; no perfect-run check; tests that go red on the HUD removal | TW25, MF20, part C "Tests" | M | No |
| S24 | Docs: bible 5.8 strict-rule list differs from the engine's; SPEC plans a briefing map and field-menu Map; ROADMAP cites G134 for the briefing map; campaign cap 32 held only by riding SectorMode | MF19, HG12, HG13, MF21 | S | No |
| S25 | Marlow guidance mark: off-screen edge pointer with metres may be a waypoint (cross-check with the Marlow review) | HG11 | S | Yes (Q7) |

### 1c. Questions for Michael (native multiple choice; first option = recommendation)
- **Q1 (S14, TW8) G157 level-standard review before Tallow Wharf resumes.** "Review in parallel, greybox stays dark";
  "Review the 12 now, before row 8 resumes"; "Waive G157 for Tallow Wharf, review before Mission 2".
- **Q2 (S15, TW9) Sign-off pages, per page (campaign map, Three Grey Coats, Two-Key Ledger, co-op kit), asked only after
  the pages are corrected.** "Approve as specced"; "Approve with changes"; "Re-plan".
- **Q3 (S16, TW17) Throw gaps.** "Accept throws as optional co-op; C3 forces W2"; "Make the throws force co-op (engine
  work)"; "Replace C5 with another forced move".
- **Q4 (S17, MF9) Where the Campaign starts.** "Co-op lobby: Campaign, Marlow Yard (training), Sector Ops"; "Main menu
  gets a Campaign item"; "Lobby only, behind the missions flag until Mission 1 switch-on".
- **Q5 (S18, MF16) Civilians on Tallow Wharf.** "Only the named couriers are protected; everyone else stays an armed
  guard"; "Clerks, porters and couriers are civilians (unarmed, flee, a kill restarts the section)"; "No civilians on
  Mission 1".
- **Q6 (S19, MF17) Rewards in the campaign.** "No grants: optional objectives only raise the rating (CT way)"; "Keep
  section grants, but no revive syringes"; "Grants only for optional objectives".
- **Q7 (S25, HG11) Marlow guidance mark.** "Keep as built (edge pointer and metres)"; "On-screen mark only, no edge
  pointer or metres"; "Drop the mark, list only". Shared with the Marlow review.

### 1d. Proposed jobs after the row 6 sign-off (for the orchestrator's fold)
1. **hud-guidance** (ROADMAP Now 7, cap): PR A removal S1 (HG1-HG4 + test fixes), PR B popup and binding (HG5, HG6, HG9),
   docs HG12-HG13. Master code; lands before the engine rebases (HG3 conflicts with the engine's `sectorMode.ts` blip gate).
2. **mission-engine rule fixes** (ROADMAP Now 8): push FLG + GB6 (S6) after their checkers; A12 replacement (S3); dogs
   (S2); campaign revives and no shield lead (S4, MF15); protected-character break (S8); exactly-two gate (S5); objective
   text and banner (S12); cap naming (MF21); popup feed and field-menu list (HG7, HG8).
3. **tallow-wharf greybox fixes** (ROADMAP Now 8): gate reach (S9), lighting re-base (S10), map data (S22), graph drift,
   sign-off page corrections (S15) then Michael's picks.
4. **shutter wiring** (S7, L): `placeShutter`, world wiring, NET, guards' notice, e2e.
5. **campaign-mode** (S17, L, own job after Q4): lobby Campaign mode, mission in the session, briefing, campaign results,
   save / rejoin (G147).
6. **tallow-wharf design docs** (S20, L) and checkpoints (S21), then the greybox exit gate (S13): one validator on master
   (Marlow Build's V6 + mission-validator merge), GBM, route-runs, walk card.

## Part A. Tallow Wharf (map, graph, Three Grey Coats, Two-Key Ledger)

### A. Validator runs (outputs in `C:/NightShift/scratch/conformance-campaign/val/out-*.txt`)
Each ref's `scripts/level-validate.mjs` (+ `mission-validate.mjs`) and `docs/design/metrics.json` were extracted with `git show` into `val/<sha>/` and run with plain `node` (no deps), as STATE.md / SPEC.md:270 ran it (`node scripts/level-validate.mjs <abs graph.json> [mission graph.json]`).

| Validator | Graph | Result |
| --- | --- | --- |
| master 829a9332 (rule owner on master; has campaign gate reach) | map @5181c9db and @00b6cde9 (same output); also + TGC graph | **3 ERR, 6 WARN** |
| mission-validator 0c62a921 (kit dimensions) | map @5181c9db | 0 ERR, 6 WARN (the SPEC's "0 / 6") |
| mission-validator 0c62a921 | map @00b6cde9; + TGC; + TKL | 0 ERR, 8 WARN (+2: shutter `gap` missing) |
| mission-validator 0c62a921 `--require-measured` | map @00b6cde9 | 9 ERR (every encounter space: no measured values), 8 WARN |
| V6 8f551e18 (with or without `--require-measured`) | map @00b6cde9 | 7 ERR: kinds `shutter`, `team_pull`, `team_throw` unknown (it stops before the measured check) |
| master 829a9332 `--require-measured` | - | exit 2: unknown flag |

Full ERR list on master's validator (the current rule):
1. `link w2-pawn-loft -> w2-reading-room (team_throw): the way back from w2-reading-room to w2-pawn-loft takes 20.0 s, over the 15 s revive reach`
2. `link w2-pie-loft -> w2-clock-loft (team_throw): the way back from w2-clock-loft to w2-pie-loft takes 28.2 s, over the 15 s revive reach`
3. `link w4-canal-ledge -> w4-jetty (team_pull): the way back from w4-jetty to w4-canal-ledge takes 15.8 s, over the 15 s revive reach`

WARNs (all validators): `room_class custom` on w1-canal-steps, w2-arcade-roof, w3-roof, w3-chute, w4-boat; w3-chute 1.2 m off the 0.5 m grid (all six justified at SPEC.md:300-311). mission-validator on the engine graph adds: `link w1-fish-hall -> w1-service-passage (shutter): dimension missing (gap ...)` and the same for `w4-back-lane -> w4-shed-two`.

| # | Item | Rule (doc:line / G) | Current state (file:line @ref) | Gap | Fix | Size | Needs Michael? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TW1 | Guard dogs in a campaign map | VISION.md:29 (no heavies or dogs, G155); level-design.md:140 (4.10 [Campaign]); DECISIONS.md:803-806 (G155) | `tallowWharfSectors.ts:148` W3 guard 1 `'dog'`; `:167-168` W4 handler + `'dog'`; `:366`, `:390` `dogs: 1`; spawned by both missions (`:201-202`: TGC W4 `'all'`, TKL W3 `'all'`, TKL W4 slot 2) @00b6cde9; locked in by `tests/tallowWharf/sectors.test.ts:109-111`; specced at SPEC.md:45, :134, :141 and graph.json:333, :585 @5181c9db. The code's own note says G155 holds outside Sector Ops (`sectors.ts:132-133`) | Two dogs spawn in campaign missions | Replace each dog with an armed human (a second yard watchman in W3, a yard patrol in W4) so the floors hold (W3 east yard 3, W4 shed yard 6); `dogs: 0`; fix the test, SPEC and graph notes; add a campaign check (no quadruped in a `mode: 'campaign'` mission's guard list) to `checkMission` | S-M, G355 | No |
| TW2 | W1's only exit and the TKL W4 shutter are closed walls | VISION.md:57 rule 3 (every primary objective possible); level-design.md:268 (11.8: a locked door with no way to open it is a wall); 11.10 :280-282 | `tallowWharfW1.ts:135-137` and `tallowWharfW4.ts:157` `standIn(...)` (closed collide panels, no `placeShutter`) @00b6cde9; GB-briefs.md:39-40, :45-62 @5181c9db; GB6 e2e prints "SKIP: shutter ... is a stand-in" and teleports (`scripts/e2e-sectorops-wharf.mjs:5`, `:307` @HEAD) | TGC cannot leave W1 in the build (the hall back door is bolted from the passage side): the mission is not completable without debug teleport | The shutter wiring slice: delete the stand-ins by tag, `placeShutter` per spec, `ShutterDoors` world wiring, guards' notice, NET items (GB-briefs 0.2); then an e2e that walks both shutters | L (own slice) | No |
| TW3 | Gate reach: 3 validator ERRs | level-design.md:257-259 (11.6 [Campaign] gate reach, `reach_max_s` 15 s, G284 (4)); 14 :478-481 (0 errors before Phase 3); RULES.md:58-59 | graph links 28, 29, 69 (`w2-pawn-loft -> w2-reading-room`, `w2-pie-loft -> w2-clock-loft`, `w4-canal-ledge -> w4-jetty`) @00b6cde9; ways back 20.0 / 28.2 / 15.8 s (val/out-829a9332-map-00b6.txt) | 3 ERR on master's validator; SPEC.md:270-271 reports 0 ERR because mission-validator lacks the check | W2: give the reading room and the clock loft a solo way back to their launch lofts inside 15 s (e.g. the clock-mender's door bolted on the reading-room side only after Teale's bolt, or a short loft-to-loft door along the north row; whatever is built, time the links). W4: add a solo way down from the jetty to the ledge near the lip (a drop or the jetty's own ladder) or move the quay ladder closer. Re-run master's validator to 0 ERR; update the graph and geometry together | M | No |
| TW4 | Lighting basis is the training rule, not real-world bands | VISION.md:31 (Campaign: real-world lux bands, G329); VISION.md:55-56 rule 2; level-design.md:167-174 (5.5: G279 "never the fallback for the campaign"); scale-sheet.md:174-177 (interim rule) | SPEC.md:96-97 and graph.json:9 "lit by default ... (LR1 / G279)" @5181c9db; every section's lamps "lit by default" (`tallowWharfW1.ts:150`, `tallowWharfW2.ts:229`); theme `lightLevel 0.3` (`tallowWharf.ts:76-79`) @00b6cde9; no band per space anywhere | The map is lit by the Marlow Yard rule; no space has a space type or band; no light plan | Re-base each space on the interim rule (light like a real site of its type at night: market, arcade, offices after hours, wharf yard), name each space's scale-sheet 9 type in the graph, write the light plan (13 :381-384), then GBM measures against light-realism's bands when they land | M, G355 | No |
| TW5 | Downed rule is Sector Ops' syringes, not the campaign rule | VISION.md:30 (30 s revive, twice per mission, G126); level-design.md:218-220 (9.4 [Campaign]); DECISIONS.md:695-698 | Campaign missions run in `SectorMode`, which counts revives by `syringesFor(difficulty)` (`sectorMode.ts:1061`, `sectors.ts:510-511`: Rookie 3, Normal 2, Realistic 1, Perfectionist 1) @00b6cde9; TKL's optional pays `reward: 'syringe'` (`tallowWharfMissions.ts:190`; BEAT.md:35-36 @5181c9db) | Revive count varies by difficulty and can be earned; the campaign rule is a fixed 2 per mission, 30 s window, both down = last checkpoint | When `mission.mode === 'campaign'`, use `REVIVE_WINDOW` / `REVIVES_PER_MISSION` (`src/game/reviveClock.ts`) instead of syringes; change TKL's optional reward to one that exists in the campaign (e.g. `gadget`) and update BEAT / SIGNOFF | M, G355 | No |
| TW6 | Exactly two players is not enforced at runtime | VISION.md:20 (exactly 2, G2, G48); VISION.md:63 rule 7; level-design.md:235-236 (11.1 [Campaign]) | `MissionDef.players: [2]` is only checked as data (`missionDef.ts:185`); the run takes any count (`sectorMission.ts:323` `Math.max(1, players())`), a sector room holds 2 (`src/net/protocol.ts:47` @00b6cde9; `:26` is only the wire cap of 4) | A campaign mission starts solo; solo is blocked only by the forced gates partway in | Refuse to start (or hold at the lobby) a `campaign` mission unless exactly 2 players are present; cap the room at 2 for it; unit test | S, G355 | No |
| TW7 | Map not behind a flag | CLAUDE.md:52 (unfinished work ships dark behind its flag); G355 `DECISIONS.md:1998-1999` (Tallow Wharf resumes dark behind flags) | @00b6cde9: no flag at all; `tallowWharf.ts:65-66` is only `unlisted: true`. @HEAD (unpushed FLG): `flags.missions` gates the mission param (`sectorMission.ts:70-72` @HEAD) but `?autostart=tallowWharf&mode=sector` still runs the map as plain Sector Ops (no mission, dogs) | Without `?missions=1` the map still loads under Sector Ops rules | Push FLG; make `tallowWharf` autostart require `flags.missions` (or its own flag) and refuse `mode=sector` without a campaign mission | S, G355 | No |
| TW8 | G157 level-standard review not done before the Tallow greybox | level-design.md:470-471 (Open, G157: before Tallow Wharf the 12 changes go to Michael); level-design.md:677 (open item 3); design-bible.md:1062-1063; DECISIONS.md:811-812; ROADMAP.md:61 @784d0217 (blocks "Tallow Wharf greybox (row 8)") | GB0-GB5 are built (commits `533c02a6`, `09664eda` and earlier on mission-engine); ROADMAP lists G157 as waiting since 2026-10-18 | G293's exception (`DECISIONS.md:1591-1596`) waives only G288's sign-off, not G157; the greybox went ahead anyway | Put the 12 changes to Michael (one-click, item by item) before GB5 fixes / GB6 / GBM resume (ROADMAP row 8), or get a recorded waiver | S (pages exist in design-kit-digest) | Yes. Options (as 1c Q1): "Review in parallel, greybox stays dark"; "Review the 12 now, before row 8 resumes"; "Waive G157 for Tallow Wharf, review before Mission 2" |
| TW9 | Sign-off picks still owed; the pages are out of date | RULES.md:57-58 (one-page to-scale plan + 5-line intent check, G288); exception recorded: DECISIONS.md:1591-1596 (G293), level-design.md:467-468, ROADMAP.md:60 @784d0217 | `campaign-map/SIGNOFF.md:47-48`, `three-grey-coats/SIGNOFF.md:52-53`, `two-key-ledger/SIGNOFF.md:45-46`, `coop-kit/SIGNOFF.md:41-42`: "Michael's pick" empty. Campaign-map intent check has 4 items (`SIGNOFF.md:30-39`). Pages state "validator: 0 errors" (:6-7, TGC :44, TKL :35-37), list C5 as a forced exit (:17-18), and omit dogs, lit-by-default and the stand-in shutters @5181c9db | Greybox start was allowed (G293), but no plan is approved and the pages would ask Michael to approve a map that breaks TW1, TW3, TW4 | Fix TW1, TW3, TW4 in the spec, correct the pages (5-line intent check, current validator result, throws per TW17), then ask the four questions | S (pages) | Yes. Options: "Approve as specced"; "Approve with changes"; "Re-plan the map" (per page) |
| TW10 | Greybox exit gate not met | VISION.md:69 (measured validator, G289; route-runs then walk card, G330); RULES.md:59-61; level-design.md:484-488 (14 Phase 3 exit) | No `measured` on any of the 9 encounter spaces: 9 ERR under `--require-measured` (val/out-0c62-reqmeas.txt); GBM not run (SPEC.md:258-260 @5181c9db). GB6 e2e (@HEAD, unpushed) freezes guards and teleports past shutters (`scripts/e2e-sectorops-wharf.mjs:5-8`), so it is not a route-run | No measured pass, no bot route-runs over the declared routes (`tallowWharfSectors.ts:246-301`), no walk card | GBM (`level-measure --write`, then `--require-measured` 0 ERR) once V6 lands; route-runs over all 8 declared routes against live guards; then the 10-min walk card | L | No |
| TW11 | The three validator branches disagree; no single tool can pass the gate | level-design.md:478-480 (validator gate), :630-670 (rule index: one `scripts/level-validate.mjs`); G285 (b) | master 829a9332: gate reach, no kit dims, no `--require-measured`; mission-validator 0c62a921: kit dims, no gate reach; V6 8f551e18: `--require-measured`, rejects `shutter` / `team_pull` / `team_throw` (7 ERR) | The SPEC's 0 ERR and master's 3 ERR are both "the validator"; V6 cannot read this graph at all | Merge mission-validator (kit kinds, dims, mission nodes) and V6 onto master's validator; re-run Tallow (owner: level validator, Marlow Build) | M | No |
| TW12 | Phase 1-2 deliverables missing | level-design.md:344-462 (13), :603-610 (16.9 element register: "A missing row fails review"), :612-628 (16.10 checklist); :474-477 (14 Phases 1-2); design-bible.md:1070-1071 | SPEC.md:53, :115, :119-121, :154, :260-261 @5181c9db defer structural grid, hide spots, guard sheets, isolation moments, space sheets, element register and 16.10 to "greybox: pending (GB1-GB5)"; GB1-GB5 are built and none exists (no Tallow doc beyond SPEC / BEAT / SIGNOFF in `docs/missions/`) | No building brief beyond SPEC, per-storey floor plans, gameplay overlays, objective and lead plan for the map, space sheets, guard sheets (4.4 isolation), security register (W3 keypad), light, sound, checkpoint, co-op (gate way back per gate), medkit and civilian plans, coverage table, tool / problem matrix, metrics check, element register, self-critique, 16.10 answers | Write `<map>-design.md` from the built files (section files already list deviations), one SVG per storey + `*-gameplay.svg` (`scripts/plan-svg.mjs`) | L (own job) | No |
| TW13 | One restart point per section, not an encounter checkpoint before each encounter space | level-design.md:100-104 (3.9); DECISIONS.md:695-697 (G126 encounter checkpoints, ~10 min loss); 13 checkpoint plan :393-396 | 4 restart points (`tallowWharfSectors.ts:37-46`, `:316-317`, `:338-339`, `:360-361`) for 9 encounter spaces; graph tags `w3-east-yard` a checkpoint (graph.json:321) but the build restarts W3 at the roof bulkhead head (GB-briefs.md:41-44 @5181c9db: "TKL loses the SPEC's east-yard checkpoint") | No checkpoint before w1-fish-hall, w2-reading-room, w3-east-yard, w3-east-wing, w3-west-wing, w4-shed-three / shed-yard; graph and build disagree | Add encounter checkpoints (needs a per-encounter checkpoint list on `SectorDef`, engine slice), place each dark and out of view; fix the graph tag | M-L | No |
| TW14 | Hide spots too few | level-design.md:124-125 (4.7 a hide spot near the takedown spots), :126-127 (4.8) | 8 hide spots for 9 encounter spaces: `tallowWharfW3.ts:303` has two (west wing, coal yard): none in w3-east-yard or w3-east-wing; W1 :172, W2 :252, W4 :207 two each for 9-12 guards @00b6cde9 | Two encounter spaces have none; most takedown spots have no hide spot near | Place hide spots per encounter space near its takedown spots (real objects: lodge bench, press aisles, stall backs, tea chests); list them in the space sheets | S, G355 | No |
| TW15 | No medkit station | level-design.md:333 (12.2, G98: a medkit station in every map), :403-405 (13); DECISIONS.md:454-456 | `tallowWharf.ts:88-104` @00b6cde9: no `medkitWalls` | Missing | Add wall medkit stations with real reasons (fish hall first-aid box, counting house lodge, shed office) and a medkit plan | S, G355 | No |
| TW16 | Section banner shows another mission's objective | level-design.md:188-193 (6.4: objectives name what and where, guide without markers); DECISIONS.md:1894-1898 (G336), G343, G351 | `sectorMode.ts:771` shows `s.objective.label` at every section start; Tallow's labels (`tallowWharfSectors.ts:310, :332, :354, :385`) are one per section, so TGC entering W3 reads "Take the ledger from the strongroom" and TKL entering W4 reads "Take the packet from the candle chest in shed three"; W1's "Take the warden's tally book" names no place @00b6cde9 | Wrong or placeless objective text in both missions | While a mission runs, show the mission's open step text (or a per-mission section label) in the banner; give W1's label a place | S, G355 | No |
| TW17 | Throw gaps are solo-jumpable; the graph and sign-off treat them as co-op only | level-design.md:268-271 (11.8: every reachable co-op target is planned), :280-282 (11.10); G292 | GB-briefs.md:23-30 @5181c9db: the 2.5 m gaps (C4 x2, C5 the W2 -> W3 spine) can be crossed by a running jump; W2 stays forced only through C3. graph links 28, 29, 33 are `team_throw` with no solo twin; `campaign-map/SIGNOFF.md:17-18` presents C5 as the forced exit | The validator's forced-gate and gate-reach results rest on links a solo player can bypass; Michael is told the throw is forced | Add the solo `gap_jump` twins to the graph (re-validate), and say on the sign-off that the throws are optional co-op; or make the throws force (engine work, e.g. the `throwGateway` IR band the brief names) | S (graph + page) / L (engine) | Yes. Options: "Accept throws as optional co-op; C3 forces W2"; "Make the throws force co-op (engine work)"; "Replace C5 with another forced move" |
| TW18 | Splits not declared, so 11.3-11.5 are unchecked | level-design.md:244-252 (11.3 splits, 11.4 assist, 11.5 overwatch); 13 co-op plan :398-401 | The graph has no `split:` / `overwatch:` tags (grep of graph.json @5181c9db); TGC splits Eyes / Ears (TGC BEAT.md:41-42), TKL splits Ears / Hands, one player per wing (TKL BEAT.md:39-44) | Leg times, parity (20%), assist and overwatch of the designed splits are never tested | Tag both missions' splits in the graph (legs, merge point, overwatch spot, assist) and re-run `checkCoop` | S-M | No |
| TW19 | No static lookout on any high route | level-design.md:93-95 (3.6, G335 "Add both"); 4.2 :110-111 (mix includes a high-route lookout); DECISIONS.md:1890-1892 | High routes (W1 gallery, W2 walkway, arcade roof, W3 roof, W4 gantry) carry no posted guard; the crane watchman is at the ground leg (`tallowWharfSectors.ts:169`) @00b6cde9 | G335 lookouts absent | After Guard AI's G335 build, post a lookout on one or two high routes (e.g. the W3 roof turret, the gantry) and give each a guard sheet | S (data, after Guard AI) | No |
| TW20 | Civilians modelled as armed guards | level-design.md:107-109 (4.1 jobs and employers); :403-405 (13 civilian plan, G353); VISION.md:41 (every guard is armed, G298) | `tallowWharfSectors.ts:133` (night reader), `:137-138` (decoys Fenn, Garrow), `:140` (night clerk), `:152-153`, `:158` (desk clerks) are `grunt` guards @00b6cde9 | A reading-room reader or a desk clerk is an armed guard who raises alarms; killing one does not restart the section as a civilian would (G353) | Decide per person: armed staff (with a reason) or a civilian (a civilian kind, G353 restart); write the civilian plan; adjust counts so 4.9 floors hold | M | Yes: Q5 (1c) |
| TW21 | Graph does not match the build | level-design.md:493-494 (15: the graph matches the built map); 4.9 :128-132 (the graph records the count) | Graph counts W1 7, W2 6 (graph.json spaces) vs spawned 9, 10 (`tallowWharfSectors.ts:105-141`; extras `:187-194`); engine graph dropped `"gap": 0.9` on both shutters (2 new WARN on 0c62a921); w3-east-yard checkpoint (TW13) | Drift between graph, SPEC (:147-149 "35") and code | Update counts, restore `gap`, fix checkpoint tags, re-run; after TW1 the dog rows change too | S, G355 | No |
| TW22 | Roof reached by a loft ladder through a hatch in a let loft | level-design.md:533-542 (16.2.1 only stairs or plant / shaft ladders; 16.2.3 no ladder in a hole in an occupied floor; 16.2.5 roof access by bulkhead or fire stair); 16.10 Q3, Q5, Q10 :617, :619, :624 | `tallowWharfW2.ts:200-204` @00b6cde9 (`b.ladder(72, 66.15, LOFT, ROOF, 0)` up a hatch in the "empty corner loft"); SPEC.md:110 lists it as a plant ladder @5181c9db | The corner loft is a let loft, not a plant space or shaft | Make it a real plant space (a tank room with a caged ladder and hatch cover) or a roof bulkhead stair; record it in the element register | S-M | No |
| TW23 | SPEC not on the current template; stale references | DECISIONS.md:2017-2018 (G360: template follows current rules); docs/templates/map-spec.md:103-111 (Players; light bands per space type), :97-101 (way back per forced gate); G55 (one folder per map) | SPEC.md:17-18 cites "LD Open items 1" for co-op only (now the co-op lip item, level-design.md:674-675); Theme says lit by default (:207); co-op table has no way back column (:161-171); docs live under `docs/missions/prototypes/campaign-map/` @5181c9db | Spec loosens by omission | Re-sync SPEC to the template (players line, bands, way back per gate), fix references, move map docs to a Tallow Wharf folder | S | No |
| TW24 | Engine still offers rule kinds G339 voids for the campaign | DECISIONS.md:1914-1917 (G339: A12 one-chance and window kinds conflict with G290 / G334); VISION.md:62 rule 6; ROADMAP.md:33 @784d0217 (row 8 "A10 void, A12 re-plan") | `missionDef.ts:68`, `:128` keep `'oneChance'` and `'window'` @00b6cde9; Tallow's missions use neither (`tallowWharfMissions.ts:112`, `:203`) | Latent: a later campaign mission could use them | Remove or re-plan in the mission-framework review (cross-reference; not a Tallow geometry fix) | S | No |
| TW25 | Acceptance tests not run for the map | level-design.md:492-513 (15: e2e-anchors covers the map, darkness, noise, patrols, every guard alive at start, ghost run earns every bonus, perf budgets) | `scripts/e2e-anchors.mjs` has no tallowWharf entry (git grep @00b6cde9); no darkness / noise / patrol e2e; GB6 runs with frozen guards | Most of 15 unproven | Add Tallow to e2e-anchors; darkness / noise / patrol checks per the light and sound plans; ghost run per mission; perf pass on the 12-guard sections | M | No |

### A. Checked, conforms
- Scope notes (no gap found): `tallowWharfKit.ts` holds the kit pieces; its only rule-relevant piece is `standIn` (:238 @00b6cde9), covered by TW2. level-design 4.11 (security devices): the W3 keypad, in the security register TW12 asks for. G138 (both players extract): a sector exit and the extract complete only with every player, a downed one too, inside the zone (`sectorMode.ts:836-849` @00b6cde9, `all = players > 0 && inside === players`).
- Mission 1 is Tallow Wharf (G340, `DECISIONS.md:1919-1923`): `tallowWharf.ts:57-63` registers both missions; graph `meta.mode` `campaign`, `players [2]` (graph.json meta @5181c9db).
- Greybox before sign-off: allowed for this map by G293 (`DECISIONS.md:1591-1596`: "greybox may proceed overnight before his sign-off; the sign-off page is still made"), recorded in level-design.md:467-468 and ROADMAP.md:60 @784d0217; the four sign-off pages exist (TW9 covers the picks).
- One-page to-scale plan exists: `campaign-map/PLAN.svg`, 1 m = 10 px, north up (SIGNOFF.md:4-5 @5181c9db) (RULES.md:57, G288).
- Forced co-op traversal in every section (VISION.md:23, G292; level-design.md:280-282): master's validator forced-gate check passes on all four sections (no forced-gate ERR); the declared gates are at graph `section_info.*.forced_coop` (subject to TW2 in the build and TW17 for the throws).
- Spine plus 2+ routes per section (VISION.md:24, G285; level-design.md:239-243): `checkSpine` and `checkRedundancy` pass on master's validator; the build declares 2 routes per section (`tallowWharfSectors.ts:246-301`).
- Three routes plus a secret, routes cross, dead ends, LOS targets, pacing (level-design 3.2-3.4, 6.2): no `checkEncounters` / `checkPacing` finding on any validator.
- All six approved kit moves used (G293, VISION.md:46-47; level-design.md:272-279): boost, throw, pull-up (for the human ladder, which reaches only 4.1 m, open item 1, level-design.md:674-675), shutter, rope (climb up), vent unlock (`coop-kit/SIGNOFF.md:9-16`); lip bands tested (`tests/tallowWharf/w1.test.ts:62-88`, `w2.test.ts:52-163`, `w3.test.ts:89-98`); kit dimensions pass on 0c62a921 (0 ERR).
- Strict rules up to 2, signposted, section restart (VISION.md:26, G290; level-design.md:213-216): TGC one `namedTarget`, TKL one `noKills`, each in the briefing's last line and the objective list (`tallowWharfMissions.ts:40`, `:112`, `:132`, `:203`); `checkMission` requires mission scope for campaign rules (`missionDef.ts:318`).
- No forced kill, perfect rating designed (VISION.md:57-58 rules 3-4): both missions allow knock-outs and a ghost route (TGC BEAT.md:139-140, TKL BEAT.md:17-18 @5181c9db); proof waits on TW2 and TW10.
- Soft windows only (VISION.md:27, :62 rule 6, G334): no mission budget or countdown in the built `MissionDef`s; the key turn's `window: 1.0` (`tallowWharfMissions.ts:163`, `tallowWharfSectors.ts:375`) is a sync tolerance that resets with no penalty (TKL BEAT.md:19-20); the porter twist is a walking guard (BEAT.md:31-34).
- Guidance in-world, hints off by default (VISION.md:25, :59-61 rule 5, G290, G336): every step text names what and where (`tallowWharfMissions.ts:48-106`, `:140-198`); landmarks (clocks, the crane's red lamp) and leads per step (BEAT.md); `gameplay.hints: false` default (`src/core/settings.ts:163` @00b6cde9). Exception: the section banner (TW16).
- Guard ceiling 32 alive (VISION.md:29, G359; level-design.md:133-134): per-section spawns at most 12 (+ 3 stages x 2 reinforcements = 18), TGC 30 / TKL 27 over the mission (`tests/tallowWharf/sectors.test.ts:202-208`; `sectors.ts:494-509`); each mission spawns only its own guards (`tallowWharfSectors.ts:200-203`).
- Guard floor (VISION.md:65 rule 9, G289; level-design.md:128-132): every encounter space is at or above its band (early 3-6, late 6-10; graph guards 3-6), with jobs and reasons on every guard (`tallowWharfSectors.ts:105-181`). TW1 / TW20 change some of them.
- No heavies (G155): `checkSectorGuards` rejects `heavy` (`sectors.ts:587`); none on the map.
- Hardened lit chokepoints allowed with a route around (G333): unswitchable lamps carry reasons (clockwork, photocell, emergency, aviation: SPEC.md:98-101; `tallowWharfW3.ts:282-287`, `tallowWharfW4.ts:179-184`); the per-choke check belongs to the light plan (TW4, TW12).
- Real duct systems and crouch sizes (level-design 16.3.4, 16.7): ice-melt drain, coal passage, heating duct, coal chute, culvert at 1.2 x 1.5 (SPEC.md:111; WARN 5 justified at :309-310); the crouch height stands until G54's re-measure (open item 2, level-design.md:676).
- No accidental split gaps (level-design 12.1, 15): every throw gap is 2.5 m, over the 1.95 m band (SPEC.md:106); drop guards stop free drops that would skip a forced move (GB-briefs.md:31-34; `tests/tallowWharf/shell.test.ts:201`).
- Story and radio lines written to be voiced (G82): every radio line <= 90 characters, intel lines <= 60 (`tallowWharfSectors.ts:230-243`); story decided with the missions (G354) through the TGC / TKL sign-offs.
- Hot paths and imports (CLAUDE.md hard rules): the map files import Babylon only via `core/babylon` and use `hyp2` (`tallowWharf.ts:1`, `tallowWharfSectors.ts:2`, `:59`); no runtime network dependency.
- RULES Intake 2: BRIEF.md keeps "Michael said / picked" apart from assumptions with undo lines (BRIEF.md A1-A18, M1-M5 @5181c9db).

## Part B. Mission framework / engine and the campaign rules

Refs: as above; validator rule kinds read on origin/feature/mission-validator 0c62a921. The brief's `enemyManager.ts:135-136` is `:143-144` on 829a9332 (`maxAlive = MAX_ALIVE`) and `:126-127` on 00b6cde9. `[cap-ok]` = a rule fix to a shipped feature, allowed at the walk cap (G355).

| # | Item | Rule (doc:line / G) | Current state (file:line @ref) | Gap | Fix | Size | Needs Michael? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MF1 | Compass and minimap still drawn in a mission (A10 hid the blip only) [cap-ok] | VISION.md:59-61 rule 5; G339 DECISIONS.md:1914; design-bible.md:730 | hud.ts:32-38, :57-58, :136-143, :159 compass; :86, :152, :160, :175-176 minimap slot @829a9332; gameState.ts:639-640 `new Minimap` for every mode, :750 / :767 `extraBlips` @829a9332; sectorMode.ts:1391-1393 `blips()` returns [] only while a mission runs @00b6cde9 | A Tallow Wharf mission shows the compass strip and the minimap; every other mode shows the blip too. Hard rule 5 break in every mode. | HUD owner: delete the compass strip, the minimap slot, `ui/hud/minimap.ts`, `GameMode.blips()` in every mode and the net blips; keep Marlow's course markers (guidance marks, G292). Engine: its `blips()` branch goes with it; asserts in scripts/e2e-sectorops-mission.mjs:43-44, tests/mission/sectorMission.test.ts:540 and the wharf e2e (bc9e6981 scripts/e2e-sectorops-wharf.mjs:257) become "no `.hud-compass` / `.hud-minimap` element". See "A10 / A12 replacements". | M | No |
| MF2 | `oneChance` rule ends the mission (A12) | G290 DECISIONS.md:1566 (a break restarts the section, the mission continues); G353 :1988 (replaces mission fail); G126 :695 (both down reloads the checkpoint); level-design.md:213 | missionDef.ts:68, :128 kind; ruleTracker.ts:35-36 `RULE_END`, :84-85, :97, :110-118, :254-262 `onFail`, :292-299; sectorMission.ts:150-151 `fail`, :169 `MISSION FAILED`, :209 / :266, :339-356 (an everyone-down restart counts as a failure), :465-468, :540-543, :636 `g.endSession(false, ...)`; missionText.ts:20, :58-60 @00b6cde9 | A mission can end on a rule break, and with a step-less one-chance rule an everyone-down restart ends it too. No mission data uses it (tallowWharfMissions.ts:112, :203). | Remove the kind and the mission-end path; every break is RULE_RESTART. Validator branch: scripts/mission-validate.mjs:18, :405, docs/level-validator/mission-schema.md:54, :87 @0c62a921. Docs: BRIEF.md:67-68, PLAN.md:37, :78, :217. Tests: ruleTracker.test.ts:196-210, sectorMission.test.ts:433-437. | M | No |
| MF3 | `window` rule kind: a step not done in N s restarts the section (A12) | G334 DECISIONS.md:1885; VISION.md:62 rule 6; VISION.md:27; level-design.md:182-186 (no forced timers in stealth) | missionDef.ts:68, :76-79 (`seconds`), :128, :326-329; ruleTracker.ts:286-290 (reads `runner.openedAt`); missionText.ts:21, :27 @00b6cde9 | A countdown with a penalty. No mission data uses it; tests do (missionDef.test.ts:134, missionText.test.ts:23, ruleTracker.test.ts:129). | Remove the kind and `MissionRule.seconds`; soft windows become world data (see A12 replacement). Validator: mission-validate.mjs:18, :229 @0c62a921. Ship with MF2 (one slice). | S | No |
| MF4 | Dogs on Tallow Wharf | G155 DECISIONS.md:803; VISION.md:29 (campaign: no heavies or dogs); level-design.md:140; design-bible.md:688 | tallowWharfSectors.ts:148 W3 dog, :366 `dogs: 1`; :168 W4 dog, :390 `dogs: 1` @00b6cde9; campaign-map SPEC.md:45, :134, :141 @5181c9db | Campaign Mission 1 has two dogs. | Replace each dog with a human post (W3 yard: a second watchman at the lodge; W4: a yard patrol, as TW1), `dogs: 0`; renumber guard slots (`<section>:<k>` ids) in `WHARF_GUARD_MISSIONS` (tallowWharfSectors.ts:200), the TKL / TGC events and tests; SPEC and graph.json counts. | S-M | No |
| MF5 | Campaign revives are Sector Ops syringes per difficulty | G126 DECISIONS.md:695; VISION.md:30; design-bible.md:681 C6; level-design.md:218-221 | coopHost.ts:203 `if (mode === 'sector') this.reviveClock.cap = syringesFor(difficulty)` (Rookie 3, Normal 2, Realistic 1, Perfectionist 1, sectors.ts:511) @00b6cde9 (:206 @829a9332); rating grants add syringes sectorMode.ts:1151-1152; TKL optional reward `syringe` tallowWharfMissions.ts:190 | A campaign mission gets 1-3 revives by difficulty, plus grants; the rule is 2 per mission. | A campaign profile (MissionDef.mode === 'campaign'): cap `REVIVES_PER_MISSION` (reviveClock.ts:10), no syringe grants (medkits instead, as solo does), TKL reward to `medkit` or `gadget`. Touches src/net: two checkers. | M | No |
| MF6 | A protected character's death or knock-out does not restart the section; the step softlocks | G145 DECISIONS.md:764 + G353 :1988; design-bible.md:585-591; TGC BEAT.md:17-22 @5181c9db (knock-out basis: BEAT.md:22) ("killing Teale before he talks breaks the rule"; no knock-out on Teale) | ruleTracker.ts:244-247 breaks `namedTarget` on a decoy read only; sectorMission.ts:416-419 `kill(ko, attackerId)` has no victim; sectorMode.ts:1341-1343 drops `e.id` @00b6cde9 | Killing or knocking out Teale (W2:6) before tgc-3 leaves tgc-3 never done: the mission cannot finish without a pause-menu restart. No civilian handling exists anywhere (no civilian kind on master). | Built-in break, not one of the 2 strict rules: an open interrogate step's target (later: a `protected` tag on a guard) killed or knocked out restarts the section with a radio line. `kill(ko, attackerId, victimId)`; sectorMode passes `e.id`; a `RuleTracker.onProtected()` that returns RULE_RESTART. Civilians: MF16. | M | No (civilians: MF16) |
| MF7 | Missions not dark at the PR C ref [hard rule, code] | CLAUDE.md:52 (unfinished work ships dark behind its flag) | sectorMission.ts:69-72 `missionParam()` returns `flags.mission` with no gate @00b6cde9; the kit's pull offer shows on Marlow lips (the FLG fix). Fixed only in the unpushed local merge bc9e6981 (flags.ts `missions`, `coopKit`, `?missions=1` / `?coopkit=1`) | PR C at 00b6cde9 would ship the mission path and the kit moves live (the map is unlisted, the kit is not). | Push bc9e6981 (FLG + GB6 merges) to origin/feature/mission-engine before PR C; checker on the flag gates. | S | No |
| MF8 | Menu and lobby call Marlow Yard "the campaign" [cap-ok] | G292 DECISIONS.md:1581; G340 :1919; G184 note :1010; VISION.md:21 | `src/net/coopUi.ts`:376 `{ value: 'course', label: 'Campaign' }`, :383 `CAMPAIGN_MAP = 'ctcourse'`, :393-398; main.ts:332 "The campaign starts at Marlow Yard" @829a9332 | Shipped text contradicts G340 (Mission 1 is Tallow Wharf; Marlow is training). | Label the lobby mode "Marlow Yard (training)", fix the Co-op line; the real Campaign entry is MF9. | S | No |
| MF9 | No Campaign mode entry: missions start only by URL on an unlisted map | VISION.md:18-30 (Campaign column); G2 :42; G48 :234; VISION.md:63 rule 7; design-bible.md:618-621 (the lobby lists every mission) | tallowWharf.ts:55, :61 `modes: ['sector']`, :65-66 `unlisted: true`; sectorMission.ts:69-72 reads `?mission=` (shared with Infiltration's autostart); coopUi.ts:395 filters unlisted maps @00b6cde9; protocol.ts:39-41 sector takes 2 @829a9332 | No menu or lobby path to a mission; the mission id is not in the session, so a resumed room loses it; nothing stops a solo start (the forced gates and the pair gate stop a solo finish). | Campaign profile on the Sector runtime (keep A6, level-design.md:17): a lobby "Campaign" mode that lists `MapDef.missions` with mode 'campaign' (TGC, TKL), puts the mission id in the session / `GameOptions` (not the URL), starts only with 2 players, host picks the difficulty (the lobby row exists), applies MF5 / MF11 / MF15. Own job with MF10-MF13. See "Campaign entry size". | L | Yes: Q4 (1c) |
| MF10 | No campaign save: no checkpoint autosave, Continue, saved-mission rejoin or progress record; a clear writes Sector Ops stars | G147 DECISIONS.md:772; VISION.md:38; design-bible.md:606-608, :618-621, :665 C2 | sectorMode.ts:1033 `markCompleted(map.id, ...)` writes `sector:ops` stars for `tallowWharf` @00b6cde9; master rejoin is a 10-min in-session hold (main.ts:341-357, coopUi.ts:184 `RejoinRecord`, course bay only) @829a9332 | Bible 5.8 progress (per player, per mission: completed, best rating, intel) and G147 (host's saved mission, any partner joins) do not exist. | New kv record `campaign:missions` (the `sectorRecord.ts` C9 pattern, no SAVE_VERSION bump); host autosave at each section begin: mission id, section index, runner done / fact bits, rule breaks, revives used, loadout; lobby Resume on the host's save; skip `markCompleted` for campaign missions. | L | No |
| MF11 | No campaign rating 0-100% | G146 DECISIONS.md:768; VISION.md:57 rule 3; design-bible.md:613-617 | sectorMode.ts:1043 `sectorResult(...)` (Sector Ops marks and stars) @00b6cde9 | A perfect run is possible by design (ghost routes, no forced kill) but the game cannot show "100%: no kills, no alarms, every primary objective". | Campaign results: the rating from the tracker's mission-scope stats + required steps done; rules kept row (`MissionWire.rk` exists). | M | No |
| MF12 | Briefing with the rule line is never shown | G290 DECISIONS.md:1566 (signposted in the briefing and the objective list); level-design.md:213 | missionText.ts:64-68 `briefingLines()` has no caller; `MissionDef.briefing` read only by checkMission (missionDef.ts:190) @00b6cde9 | Rules are signposted only in the HUD rules line ("Rules: Named target"), not in a briefing. | Campaign briefing screen before the mission (reuse `BriefingScreen`), text from `briefingLines`. Part of MF9. | M | No |
| MF13 | Always-on objective list instead of the objective popup | G343 DECISIONS.md:1933; G351 :1980; VISION.md:48-49; design-bible.md:724-727 (always-on list is Marlow only) | missionHud.ts:1-8, :56-72 (title, rules line, rows, shown for the whole mission); sectorMode.ts:366, :1328 @00b6cde9; no popup on master | The campaign shows a permanent list; the rule is a ~5 s fade-in on every update and on View / Select or O, full list in the field menu. | The popup (HUD owner, G343 "to assign") fed from `objectiveRows`; missionHud's list moves to the field menu. | M | No |
| MF14 | One objective line lacks the "where" | G336 DECISIONS.md:1894; G351 :1980; VISION.md:60 | tallowWharfMissions.ts:57 "Learn which grey coat is Pell's: the warden's tally book, the tea stall talk" @00b6cde9 (same text TGC graph.json:12, BEAT.md:28 @5181c9db); the place is only in the hint (off by default) | The tally book's place (the warden's gallery office) is not named. | e.g. "Learn which grey coat is Pell's: tally book in the gallery office, tea stall talk" (under 90); change BEAT, graph.json and the data together. Other 11 campaign lines pass. | S | No |
| MF15 | Alarm response teams lead with a riot shield in the campaign | G155 DECISIONS.md:803 (CT's way: armour and helmets with the alarm stages); VISION.md:29 (riot shields listed for Sector Ops only, G297 / G307); G1 default | `src/ai/gear.ts`:37-38 `RESPONSE.shieldLead: true` for every mode; gear.ts:156-163 `responseTeam` @829a9332 (same @00b6cde9) | A Tallow Wharf alarm sends a shield `enforcer`. | Campaign profile sets no shield lead (grunts only). | S | No (G1 default; say so in the fix report) |
| MF16 | Who is a civilian on Tallow Wharf | G353 DECISIONS.md:1988; design-bible.md:549-551 (civilians include night watchmen, unarmed, flee, kill = section restart) vs G298 (every guard is armed) | No civilian kind in code (829a9332, 00b6cde9); tallowWharfSectors.ts:114-120 (W1 porters), :135 (the courier Teale), :140-160 cast night clerks, porters, couriers, watchmen as armed `grunt`; TKL briefing calls the staff clerks on night rates (tallowWharfMissions.ts:131) | The G353 civilian restart cannot apply: nobody is a civilian. The bible's list and G298 overlap on watchmen. | Per the answer: a `civilian` archetype (unarmed, flees to a guard or alarm, kill = section restart through MF6's path) or none on Mission 1. | M after the answer | Yes: Q5 (1c) |
| MF17 | Section-rating grants and optional rewards in the campaign | Undecided; design-bible.md:613-617 (optional objectives are a rating bonus); G1 pure CT default | missionDef.ts:51-52 `optional.reward` paid through section-rating's Grant; tallowWharfMissions.ts:85 `gadget`, :190 `syringe`; sectorMode.ts:1132-1152 grants @00b6cde9 | The campaign inherits Sector Ops' per-section rewards; no decision says it should. | Per the answer; syringes are out either way (MF5). | S | Yes: Q6 (1c) |
| MF18 | Both missions need debug teleports: shutter stand-ins | G146 DECISIONS.md:768 (every mission testably 100%-able); G292 :1581 | BRIEF.md:94-95 A22; wharf e2e prints SKIP for w1-shutter and w4-shutter (bc9e6981 scripts/e2e-sectorops-wharf.mjs:307, :364) | TGC's W1 exit and TKL's shed two way are closed panels: neither mission completes in normal play. | The shutter wiring slice (GB-briefs 0.2: `placeShutter`, world wiring, NET) before Michael's walk. | L (own slice, as TW2) | No |
| MF19 | Bible's strict-rule list differs from the engine's | design-bible.md:585 (`noAlarms`, `noKills`, `noBodiesFound`, `maxAlarmLevel`; "the one owner of the strict rules") vs G290 ghost | missionDef.ts:68 (ghost, noKills, noAlarms, noBodies, namedTarget, noGadgets, plantNotTake; after MF2 / MF3) @00b6cde9; no `maxAlarmLevel` | Two lists for one rule set; ghost is missing from the owner list. | Bible 5.8 lists the engine's kinds after MF2 / MF3; drop or build `maxAlarmLevel`. Orchestrator doc fix. | S | No |
| MF20 | No perfect-run check | G146 DECISIONS.md:768 ("testably 100%-able") | Wharf e2e asserts the forced moves and the rule restarts, not a run with 0 kills, 0 alarms and every primary step (bc9e6981 scripts/e2e-sectorops-wharf.mjs:1-6, :338-344, :411-422) | The validator's ghost / pacifist paths (PLAN.md:166-167) prove the graph, not the build. | One perfect-run assert per mission once MF18 lands (results show 100% after MF11). | S | No |
| MF21 | Campaign cap 32 holds only by riding SectorMode | G359 DECISIONS.md:2013; G187 note :1028-1030; VISION.md:29; level-design.md:295-298 | sectorMode.ts:327-328 `em.maxAlive = SECTOR.maxAlive` (32, sectors.ts:509) for every sector run, mission or not @00b6cde9; enemyManager.ts:83 `MAX_ALIVE = 12`, :143-144 default and its comment "everywhere but Sector Ops" @829a9332; protocol.ts:25 `MAX_ENEMIES = 32` | Correct today. A Campaign entry that is not a sector run would fall back to 12; the comment hides the campaign. | Name the campaign in the cap (a `CAMPAIGN.maxAlive = 32` or a comment on `SECTOR.maxAlive`), fix the enemyManager comment. | S | No |

### B. Campaign entry size (scope item 3)
Today a mission is a Sector Ops run with `?autostart=tallowWharf&mode=sector&mission=<id>` on an unlisted map
(tallowWharf.ts:55, :65-66), the mission picked from the URL (sectorMission.ts:69-72). VISION.md:18-30 makes the Campaign
its own mode with its own players, guidance, downed, difficulty, guards and save rules. Keeping the Sector runtime (A6,
level-design.md:17) is fine; what is missing is the campaign profile and the front door:

| Part | Rows | Size |
| --- | --- | --- |
| Profile switch on `MissionDef.mode === 'campaign'`: revives 2, no syringe grants, no shield lead, no Sector stars, campaign results | MF5, MF11, MF15, MF10 (stars) | M |
| Lobby Campaign mode, mission list, mission id in the session and the start message (NET3 already sends `start.sm`), 2-player start gate, lobby wording | MF8, MF9 | M (src/net: two checkers) |
| Briefing screen and objective popup | MF12, MF13 | M |
| Save: autosave at section begin, Continue / Resume, any partner joins, progress record | MF10 | L |

Total: L, its own job ("campaign-mode", about 2-3 days with checkers), after Q4 (1c). MF1 is the HUD owner's job; MF2-MF7, MF14,
MF18-MF21 stay with Campaign Build in the engine branch.

### B. A10 / A12 replacements

#### A10 (void by G339): what replaces it
- **Design:** no minimap, compass, objective blip, world waypoint or live partner position in any mode (VISION.md:59-61,
  design-bible.md:730). The hint layer half of A10 stays: text only, `gameplay.hints`, default off (settings.ts:163
  `hints: false` @00b6cde9), shown under the current objective. Guidance is the objective popup naming what and where
  (G343, G351; MF13) plus in-world leads (light, landmarks, radio). Marlow Yard keeps its course markers (guidance marks,
  G292); they are not the minimap and are untouched.
- **Files (HUD owner, a rule fix at the cap, G355):** `src/ui/hud/hud.ts` compass (:32-38, :57-58, :136-143, :159, :257-262)
  and minimap slot (:86, :152, :160, :175-176); `src/ui/hud/minimap.ts`; `src/game/gameState.ts:639-640` (`new Minimap`),
  :750 / :767 (`extraBlips`); `blips()` on every mode (`src/game/modes/*.ts`) and the net blips (`coopHost` / `coopClient`);
  the styles in `src/styles.css`.
- **Files (mission engine):** `sectorMode.ts:1391-1393` mission branch goes with `blips()`;
  `scripts/e2e-sectorops-mission.mjs:43-44`, `tests/mission/sectorMission.test.ts:540`, the wharf e2e :257 (bc9e6981)
  assert that the compass and minimap elements are absent; BRIEF.md:62-64 A10 rewritten to the hint clause only;
  PLAN.md:83-84 and :138 ("blips") updated; GB6-brief.md:85.

#### A12 (needs a re-plan by G339 / G290 / G334): what replaces it
- **Design:**
  1. No rule ends a mission. Every strict-rule break restarts the section and the mission continues (G290). Killing a
     civilian or a protected character restarts the section too (G353), as a built-in break that does not count against
     the 2 strict rules (MF6). Everyone down reloads the checkpoint (G126), never a mission end.
  2. "One chance" stakes come from consequences, not failure: the spook (A11, built: the target bolts, the retry is a new
     route) and the named-target rule. No `oneChance` kind.
  3. No timed rule. A soft window is world data, not a rule: a shift change, patrol cycle or device cycle authored as
     fixed guard routes, `MissionEvent` walk-to hooks (missionDef.ts:53-66) or a repeating device, signposted in the
     world (a bell, a clock, a radio line, a light change). Missing one means waiting for the next; no countdown, no
     restart (G334, level-design.md:182-186). Marlow's timed drills (G342, G361) are Course mode and untouched.
  4. Sync steps keep their `window` (both halves within N s: CT's sync, never scaled, G131). They are retryable
     (`MissionRunner.syncHalf`, missionRunner.ts:396-407: a late half just waits for the next press), so they are not a
     route-closing timer. `checkMission` keeps its sync checks (missionDef.ts:242-245).
- **Files and functions (one slice, Opus, one checker; no wire change, `MissionWire` has no end field):**
  - `missionDef.ts`: `RuleKind` :68 and `RULE_KINDS` :128 drop `oneChance` and `window`; `MissionRule.step` comment :76
    (namedTarget only) and `seconds` :78-79 removed; the window branch of `checkMission` :326-329 removed.
  - `ruleTracker.ts`: `RULE_END` :35-36, `ended` :84-85, `endsOnRestart` :97 and its loop :110-118, `onFail` :254-262,
    the window check :286-290 and the end branch :292-299 go (every hit returns `RULE_RESTART`); header :10-14. Add
    `onProtected()` for MF6.
  - `sectorMission.ts`: header :16-18; `SectorMissionHost.fail` :150-151 and its binding :636; `MISSION_FAILED_TITLE`
    :169; `hasOneChance` :209, :266; the one-chance branch of `restarted()` :344-356 (a restart it did not ask for only
    restores state); `pendEnd` :214, :465-468, :540-543; `kill()` :416-419 gains the victim id (MF6).
  - `missionText.ts`: `RULE_NAME` :20-21, `ruleName` :27, `breakLine` :58-60 loses `end`.
  - `missionRunner.ts:232` `openedAt` stays (its own tests use it) or goes; nothing else reads it after the tracker change.
  - `sectorMode.ts:1343` passes `e.id` to `mission.kill` (MF6).
  - Tests: `tests/mission/ruleTracker.test.ts` :129, :196-210; `sectorMission.test.ts` :433-437; `missionDef.test.ts`
    :134; `missionText.test.ts` :23.
  - Validator (origin/feature/mission-validator 0c62a921): `scripts/mission-validate.mjs` :18, :229, :405;
    `docs/level-validator/mission-schema.md` :54, :87.
  - Docs (PR #372): BRIEF.md:67-68 A12 rewritten ("A rule break always restarts the section; no mission end; no timed
    rule; soft windows are world data"); PLAN.md:37, :78, :217 (drop "one-chance opt-in UI").

### B. Assumptions A1-A23 today
| A# | Text (short) | Status today | Citation |
| --- | --- | --- | --- |
| A1 | Sector Ops validator players [1,2,3,4] | holds | G308 DECISIONS.md:1717; VISION.md:20 |
| A2 | Campaign maps co-op only (LD 11 solo-first dropped) | holds | G292 :1581; level-design.md:235, :280 |
| A3 | A no-kill rule overrides LD 7.3 for that mission | holds (now in the standard) | level-design.md:201 |
| A4 | Device windows only when named in the briefing | holds, narrowed: also signposted in the world, and retryable or repeating; never a countdown that closes a route | G334 :1885; level-design.md:182-186 |
| A5 | Prototype specs are docs only | holds | process (RULES) |
| A6 | Campaign maps run on SectorMode, players [2] | holds as the runtime, but needs a campaign profile (MF5, MF9-MF11, MF15) | level-design.md:17; VISION.md:18-30 |
| A7 | Missions attach as optional `MapDef.missions` (adapter) | holds | mapDef.ts:132-133 @00b6cde9 |
| A8 | Ghost / no kills / no alarms / no bodies read section-rating marks | holds | G290; ruleTracker.ts:41-55 @00b6cde9 |
| A9 | Teams by slot, attribution | holds (Sector Ops only; campaign is team 'all') | G291 :1573; missionDef.ts:423-426 |
| A10 | Hint layer text only; blip off while a mission runs | void (blip clause); the hint clause holds | G339 :1914; replacement above |
| A11 | Spook: a decoy read bolts the target | holds; extend with MF6 (target killed / knocked out) | G290; TGC BEAT.md:17-22 |
| A12 | One-chance ends the mission; a named window restarts the section | needs re-plan | G339 :1914, G290 :1566, G334 :1885, G353 :1988; replacement above |
| A13 | Three branches / PRs A, B, C | holds | process |
| A14 | Code Relay on S4 | holds (Sector Ops scope) | G291; Sector Ops sign-off |
| A15 | Plan SVGs from `graph-svg.mjs` | holds | process |
| A16 | Sector Ops tracks, sync nodes, a solo timer fallback named in the briefing | holds if a lapsed relay can be re-issued (Code Relay BEAT.md:25 does not say; Sector Ops review) | G334; G280 |
| A17 | Graph nodes; `mark` ERR outside training | holds | G292, G339 |
| A18 | Tallow Wharf, 4 sections W1-W4 | holds (G340 made it Mission 1) | G340 :1919 |
| A19 | Throw gaps bolted so W2 stays forced | holds | G292; level-design.md:280 |
| A20 | Drop guards (no fall damage) | holds | engine fact |
| A21 | W3 restart point shared by both missions | holds | G290 (section checkpoint) |
| A22 | Shutters are stand-ins until the kit wiring | holds as temporary; blocks normal completion (MF18) | G146; BRIEF.md:94-95 |
| A23 | Mission start section + per-mission guard lists | holds (built: missionDef.ts:107-125, sectorMission.ts:80-110) | G291 |

### B. Checked, conforms
- Section restart on a strict-rule break, mission continues, earlier sections kept: sectorMission.ts:537-544, :462-473,
  sectorMode.ts:1182-1233 @00b6cde9; the wharf e2e restarts TGC on a decoy and TKL on a kill (bc9e6981 :338-344, :411-422). G290.
- Up to 2 strict rules, ghost counts as one, signposted: `MISSION.rulesPerScope` 2 (missionDef.ts:138), checkMission
  :336-337; TGC 1 rule (tallowWharfMissions.ts:112), TKL 1 rule (:203); HUD rules line (missionHud.ts:67). Briefing: MF12.
- Hint layer off by default, text only: settings.ts:163 `hints: false` @00b6cde9. G290.
- Exactly 2 players, no bot, not completable solo (by design): checkMission forces campaign `players [2]`, team 'all',
  mission-scope rules (missionDef.ts:185, :218, :318); TKL's strongroom pair gate is never solo (sectors.ts:444); no bot
  code; lobby sector capacity 2 (protocol.ts:39-41 @829a9332). Runtime start gate: MF9. G2, G48, VISION rule 7.
- No mission forces a kill: TGC needs a question, TKL forbids kills; BEAT ghost routes (TGC BEAT.md:139-140). G127.
- Soft windows in the missions: TGC's minders and TKL's porter move on step events, not timers (tallowWharfMissions.ts:99,
  :165); TKL's 1.0 s key turn is a retryable sync. G334 (the engine kinds: MF3).
- Downed window 30 s on the Sector runtime: `REVIVE_WINDOW` 30 (reviveClock.ts:8), only the cap is overridden (MF5). G126.
- Difficulty: host picks Rookie..Perfectionist in the lobby (coopUi.ts:546 `difficultyRows` @829a9332); the engine reads
  `g.opts.difficulty` only for syringes (MF5) and Sector stars (MF10); sync windows never scale. G106, G131.
- Helmets (not a conformance: out of this scope): the engine does not touch gear. (G350's difficulty part is unbuilt in gear.ts:29-35 @829a9332: alarm stages
  only; that belongs to the Guard AI / Sector Ops reviews.)
- Campaign cap 32: met today by SectorMode (sectorMode.ts:327-328, `SECTOR.maxAlive` 32 sectors.ts:509 @00b6cde9); Tallow
  Wharf selects it by being `modes: ['sector']` (tallowWharf.ts:61), not by a MapDef field; Marlow (Course mode) keeps
  `MAX_ALIVE` 12 (enemyManager.ts:83, :143-144 @829a9332) as G187's note says. Hardening: MF21. G359.
- Objectives what + where: 11 of 12 campaign lines name both (tallowWharfMissions.ts:48, :68, :82, :93, :106, :140, :149,
  :160, :172, :187, :198); MF14 is the one gap. All lines are 90 characters or less (missionDef.ts:221). G336, G351.

## Part C. HUD guidance (compass, blip, minimap, maps, objective popup), every mode

"Cap" = a rule fix allowed at the walk cap (G355, RULES.md:63-67, ROADMAP Now row 7).

| # | Item | Rule (doc:line / G) | Current state (file:line @ref) | Gap | Fix | Size | Needs Michael? |
|---|---|---|---|---|---|---|---|
| HG1 | Minimap in every mode | VISION.md:59 rule 5; G339 (DECISIONS.md:1914); bible 5.10 (design-bible.md:730-731); level-design.md:43-44 (Marlow too) | Built for every match: `src/game/gameState.ts:639-640` (new Minimap, hud.setMinimap), drawn every frame `:3637-3639`; canvas `src/ui/hud/minimap.ts:12-106`; slot `src/ui/hud/hud.ts:86, :152, :160, :175-177`; CSS `src/styles.css:1045-1055`. No mode hides it. Worse: enemy blips use `radar = Infinity` for every mode not in the stealth list (`gameState.ts:3617-3629`), and CourseMode is not in it, so Marlow Yard (and free roam / Kestrel sandbox) shows every live guard; co-op adds a live partner dot (`src/net/coopHost.ts:1939-1945`, `src/net/coopClient.ts:1320-1324`), which also breaks G135 (DECISIONS.md:730, "no live partner position on any map") | Hard rule broken in Sector Ops, Marlow Yard, free roam and co-op | Delete `minimap.ts`, the slot, `setMinimap`, the draw call, the enemy / danger / pickup / ally blip build (`gameState.ts:3616-3632`) and `enemyBlips` (`:2139-2140`); drop `.hud-minimap` / `.minimap` CSS and their two zoom-list entries (`styles.css:2341, :3292`); move the context menu to CT's 10.7 % H now nothing sits above it (`styles.css:1291`, comment `:1280`; ui.md:22). Same PR fixes the tests in section 3 below | M | No. Cap |
| HG2 | Compass strip and its objective marks | VISION.md:59 rule 5; G339; G290 no markers (DECISIONS.md:1566); bible 5.10 (:730-733) | Strip built in `src/ui/hud/hud.ts:131-143`, mounted in `.hud-top` at `:159`, scrolled and marked per frame at `:257-271`; frame fields `:32-35` (`yaw`, `markers`), const `:38`, fields `:57-58`; fed at `src/game/gameState.ts:3613-3614` and `:3633-3635` (every `objective` blip becomes a compass mark); CSS `src/styles.css:956-1006` | Hard rule broken in every mode; the marks are objective markers in Sector Ops (`sectorMode.ts:1355-1359`) | Delete the strip, the marks, `HudFrame.yaw` / `markers`, the bearing loop and the CSS. Keep `.hud-top` (the gadget wheel measures it: `src/ui/hud/gadgetWheel.ts:107`, `wheelLayout.ts:10`) holding the room tag and the objective popup. Tidy comments `hud.ts:306`, `styles.css:207`, `animTunePanel.ts:2363`, `wheelLayout.ts:10` | S | No. Cap |
| HG3 | Objective blip producers and the Blip type | VISION.md:59 rule 5; G339 (mission-framework A10 void) | `GameMode.blips()` required by `src/game/modes/gameMode.ts:106`; producers `sectorMode.ts:1355-1359`, `infiltrationMode.ts:299-303`, `missionMode.ts:156-160` (objective), `clearMode.ts:221-223`, `courseMode.ts:1122-1124` (empty), `src/game/pickups.ts:96-98` (pickup), coop ally (HG1); plumbing `gameState.ts:31, :260, :399-400, :750, :766-768`. Engine adds a mission gate on top: `sectorMode.ts:1391-1392 @00b6cde9` | Blips feed only the compass and minimap; dead after HG1-HG2 and still a rule break while they draw | Remove `blips()` from the `GameMode` interface, all six modes, `Pickups`, `NetAttachment.blips` and the coop host / client; remove the `Blip` imports (`clearMode.ts:6`, `courseMode.ts:6`, `gameMode.ts:5`, `infiltrationMode.ts:7`, `missionMode.ts:8`, `sectorMode.ts:9`, `coopClient.ts:4`, `coopHost.ts:7`). Land after or rebased on mission-engine: its `sectorMode.ts:1391-1392 @00b6cde9` edit conflicts with the master `:1355` deletion (drop the engine's gate in the rebase) | S | No. Cap |
| HG4 | "Minimap radar" HQ upgrade (legacy shop) | G339; bible 5.10 (:730) | `src/progression/suit.ts:103-104, :115, :123, :127, :135` (radar 15 / 25 m); read at `gameState.ts:3619`; sold in `src/ui/screens/loadoutScreen.ts:1031` (behind `?legacy=1`, `src/main.ts:289`); save clamp `src/save/schema.ts:169` | Sells a minimap feature; its only effect goes with HG1 | Drop `radar` from `HqId` / `HQ_IDS` / `HQ` / `hqStats`; `sanitizeSave` then ignores an old `hq.radar` key (check `schema.ts:169` loops `HQ_IDS` only). Update `tests/economy.test.ts:75-80, :131-134` | S | No. Cap |
| HG5 | Objective line is always on, not a popup | VISION.md:48-49; G343 (DECISIONS.md:1933); G351 (:1980); bible 5.10 (:723-727); level-design.md:191-193 | `src/ui/hud/hud.ts:144` `.hud-objective` in `.hud-top` (`:159`), `setObjective` `:302-304` writes text that stays on screen; CSS `src/styles.css:1007-1012`, hidden only when empty (`:1028`). Callers: `sectorMode.ts:775, :795, :1002, :1292`, `infiltrationMode.ts:187`, `missionMode.ts:70`, `clearMode.ts:71`, `gameState.ts:853`, `coopClient.ts:254, :507, :1075`, `coopHost.ts:280-285` | No fade, no ~5 s show, no show-on-update | Turn the element into the popup: on a new objective (text change that is not progress only, see HG9) or a tap, add a `show` class, fade in, hold ~5 s, fade out (opacity, CSS transition). Keep the text in the DOM while faded so `objectiveText` (`hud.ts:297-300`) and the e2e readers keep working (section 3). Pure timer in its own module with a vitest (show on update, on tap, re-tap restarts, ~5 s then hidden). Time value in one const for Michael to tune (G356) | M | No. Cap |
| HG6 | View / Select and O do not show the objective | G343; VISION.md:48-49; bible 5.10 (:725-726); input-and-loop.md:138 | Pad: `src/input/padBinds.ts:51` `device` "Mission device (not in yet)", `actions: []`, default `PAD.SELECT`; not in `GAME_BINDINGS` (`src/input/gamepadMapping.ts:63-79`). Keyboard: no bind on `KeyO` (`src/input/keyBindings.ts:43-68`; not in `FIXED_KEYS` `:87-99`; no raw handler outside the editor). Only other View user: the animation tuner's pad toggle `src/ui/animTunePad.ts:69, :149-158` (dev, while the tuner is open; it consumes the press) | Binding missing; both buttons are free in play | Add a `objective` ButtonAction (`src/input/actions.ts`); rename the `device` pad bind to `objective` with that action (default View) and add `[PAD.SELECT, 'objective']` to `GAME_BINDINGS`; add a `BINDS` row `objective` default `KeyO`; tap only (no hold). Update the binding table row `docs/systems/input-and-loop.md:138` in the same PR, or `tests/input.test.ts:211-260` goes red. A press the tuner consumed must not open the popup. Old stored pad binds: map a saved `device` key to `objective` in the settings sanitiser | S | No. Cap |
| HG7 | Engine objective list is always on in Sector Ops (and the campaign) | bible 5.10 (:723-727: popup in game, full list in the menu; always-on list is Marlow only); G343; G108 (DECISIONS.md:492) | `src/ui/hud/missionHud.ts:1-100 @00b6cde9` shows title, rules line and every row from `show()` (`:65-72`) until `hide()`; mounted in `sectorMode.ts:366, :1328 @00b6cde9` and `coopClient.ts:225, :1171-1173 @00b6cde9`. The old `.hud-objective` line still shows the section label beside it (`sectorMode.ts:790, :810 @00b6cde9`) | Always-on list outside Marlow; two objective displays at once | Mission engine job: in game, feed the popup (HG5) with the viewer's current row (`objectiveRows` `missionText.ts:85-103 @00b6cde9`, first open required row for `viewer`) plus its hint line when `gameplay.hints` is on; show it on every runner `version` change for the viewer's rows. Move the full list (rules line, ticked rows) to the field menu (HG8). Stop the sector label writing `setObjective` while a mission runs. Update `scripts/e2e-sectorops-mission.mjs:45-52 @00b6cde9` (asserts the list visible) to assert the popup shows on start and fades, and the pause list | M | No |
| HG8 | Field menu does not keep the full list outside Infiltration | bible 5.10 (:726-727 "the menu keeps the full list"; :735 field menu: objectives); G343 | `src/game/gameState.ts:1255-1263` returns the full chain only for InfiltrationMode (parked); Sector Ops and missions get one row, the current HUD text. `src/ui/screens/pauseScreen.ts:41-58, :82` shows what it gets. Same @00b6cde9 (`gameState.ts:1244-1252 @00b6cde9`) | Sector Ops sections and engine missions have no full list in the menu | Sector Ops: list every section's objective and exit in order, done / current / to do (from `SectorRun` and the sector defs). Engine missions: map `objectiveRows` plus the rules line into `ObjectiveLine`s. Tidy the `G108` comment at `pauseScreen.ts:11` to cite G343 too | S | No |
| HG9 | Download progress and co-op status ride on the objective line | G343 (show on every objective update); G351 | Progress: `sectorMode.ts:1292` (and `infiltrationMode.ts:184-187`) rewrite the text every frame with a percent. Status: the co-op client writes "Connecting to host" / stall text into the objective line (`src/net/coopClient.ts:254, :507, :1072-1076`, `src/net/objectiveMirror.ts:17`) | With a popup, a percent would re-trigger it every frame, and the connection status would fade after ~5 s | Popup trigger keys on the objective itself, not the progress suffix (send progress as a separate field, or strip it before the compare). Show the co-op status in its own line (the feed or a banner) and keep `objectiveText` for the real objective; keep `e2e-coop.mjs:1848` and `e2e-coop-gpu.mjs:303` (they wait for the status to clear) passing | S | No |
| HG10 | Sector Ops objective text missing "where" | G336 (DECISIONS.md:1894); G351; bible 5.8 (:580-583); level-design.md:188-191 | `src/world/maps/warehouseSectors.ts:30` "Download the security DVR", `:157` "Hack the production terminal"; `src/world/maps/campusSectors.ts:406` "Take the Tidewater prototype board". (Others name a place: `campusSectors.ts:315, :361`, `warehouseSectors.ts:94, :158`.) Engine texts name what and where (`tallowWharfMissions.ts:48-199 @00b6cde9`) | Three popup lines do not say where | Add the place to each line (for example "... in the security office"); owner Sector Ops Build, text only | S | No |
| HG11 | Marlow guidance mark pins to the screen edge with a distance | VISION.md:59-60 (no compass / blip in any mode; Marlow keeps its guidance marks, G292); bible 5.10 (:730-733 "no world waypoints" in any mode, then "Marlow Yard keeps its guidance marks") | `src/game/modes/courseMode.ts:86-99` draws the next-drill diamond with metres; off screen it sits on the left / right edge towards the drill (`:98`), via `src/ui/hud/pings.ts:36-56`; on by default `src/core/settings.ts:161` (`courseMarkers: true`), toggle `src/ui/screens/settingsScreen.ts:156` | The docs do not say whether an off-screen edge pointer with metres is a "guidance mark" (G292) or a compass / waypoint (G339, bible 5.10). Cross-check with the Marlow review (review-briefs/marlow.md:10) | Per Michael's pick. Default in the plan: keep as built (G292 is explicit for Marlow) | S | Yes. Options: "Keep as built (edge pointer and metres)"; "On-screen mark only, no edge pointer or metres"; "Drop the mark, list only" |
| HG12 | Docs still plan the removed maps or list blips as current | G336 (briefing map and field-menu map removed); G339; G344 doc lint | `docs/menu-ui/SPEC.md:252-253` (annotated top-down briefing map, Phase 4), `:338-340` (field terminal "Map" item); `docs/ct-research/code-inventory.md:197, :203, :246` (minimap ally blip, objective blips as current); `docs/ct-prototype/G5-REPORT.md:48-49`, `F1B-FIXES.md:10`, `audit/AUDIT-ACTIONMENU.md:34` (context menu placed by the minimap: history, mark as replaced); `docs/systems/ui.md:22, :32-37` (the "not built yet" notes, update when HG1-HG6 land) | Doc drift; the SPEC would rebuild what G336 removed | Strike the map lines in SPEC 7.6 and 7.19 (cite G336); mark the inventory rows replaced (G339); add "minimap", "compass", "objective blip", "briefing map" to the doc-lint stale-term list with the decision as the allowed context | S | No |
| HG13 | Wrong G number for the briefing map | Authority order (CLAUDE.md G86) | `docs/ROADMAP.md:84` "the briefing's annotated map (G134)"; G134 is "Identical characters, complementary per-mission kits" (`docs/DECISIONS.md:725`). The bible's briefing map was replaced by G336 itself (DECISIONS.md:1897-1898) | Citation points at an unrelated decision (the review brief copied it) | Orchestrator: change "(G134)" to "(bible 5.10, replaced by G336)" in ROADMAP Decided | S | No |

Notes for the plan:
- ROADMAP Now row 7 (`docs/ROADMAP.md:32`) lists "briefing and field-menu maps" for removal: neither exists in code (see section 4), so that part is the SPEC doc fix in HG12, not code.
- Cap rows: HG1, HG2, HG3, HG4, HG5, HG6 (removals and the popup, ROADMAP Now row 7). HG7-HG10 are follow-ons of the same rule (popup content and the menu list); HG7 and HG8 belong to the mission engine job, HG10 to Sector Ops Build.
- Marlow Yard after the plan: keeps `src/ui/hud/courseHud.ts` (always-on objective list, `:1-8`), the course marker (`courseMode.ts:86-99`, `pings.ts:16-63`) and the `courseMarkers` setting; loses the minimap and compass like every mode. In Marlow, View / O does nothing extra (the list is always on; bible 5.10 :726-727 "instead"); course mode sets no objective line (`coopClient.ts:251-253` comment), so the popup stays empty there.
- Parked modes (Infiltration, Mission, Hunter / Clear: legacy only, `src/main.ts:250, :261-285, :307-315`; VISION.md:74) lose their blips through HG3; no text work for them (bible: parked systems get no new work).
- Suggested PR split: PR A = HG1 + HG2 + HG3 + HG4 (removal, with the test fixes); PR B = HG5 + HG6 + HG9 (popup and binding); HG7 + HG8 in the mission-engine job; HG10 to Sector Ops; HG12 + HG13 docs.

### C. Tests that assert the old behaviour

| Test | Line | Breaks on | Fix |
|---|---|---|---|
| `scripts/e2e-desktop.mjs` | :280 (`document.querySelector('.hud-minimap').getBoundingClientRect()`), :282, :286 (minimap right edge in the 32:9 inset check) | HG1: querySelector returns null and throws | Measure the right-hand panel that stays (`.hud-weapon`, or `.hud-ctx` with the menu forced open) for the 16:9 inset; add `assert(!document.querySelector('.hud-minimap, .hud-compass'))` as the hard-rule check. Confirms the Test Runner review's flag |
| `scripts/e2e-clear.mjs` | :80 (`g.mode.blips().length + g.enemyBlips`), :91 (`s0.blips === 0`) | HG1 / HG3: `blips` is gone, the call throws | Replace with the absence of `.hud-minimap` / `.hud-compass`; drop the field |
| `tests/minimap.test.ts` | :1-20 | Nothing (it copies the matrix, no import) but it tests deleted code | Delete the file |
| `tests/economy.test.ts` | :75-80, :131-134 | HG4: `canBuyHq(.., 'radar', ..)`, `hqStats(h).radar`, `bad.hq.radar` | Re-point to `revive` / `restock`; assert an old `hq.radar` key is dropped |
| `tests/input.test.ts` | :211-260 (binding table vs `BINDS` / `GAME_BINDINGS`); :67 (Select maps to no vision) | HG6 if `input-and-loop.md:138` is not updated in the same PR | Update the doc row (View `objective`, keyboard `objective` (O)); :67 stays green |
| `scripts/e2e-sectorops-mission.mjs @00b6cde9` | :45-52 (list visible with rows) | HG7 | Assert the popup on start and after a tap; the full list in the pause menu |
| Text readers: `scripts/e2e-modes.mjs:69-70`, `e2e-clear.mjs:54`, `e2e-coop.mjs:224, :1848-1849, :2120`, `e2e-ctcourse.mjs:324`, `e2e-coop-gpu.mjs:181, :303`, `tests/coopFix.test.ts:81` | as listed | Only if the popup clears its text when it fades, or `objectiveText` / `hookHud` change | Keep the text in the DOM and the `objectiveText` getter (HG5); move the co-op status without breaking the "status clears" waits (HG9) |
| `tests/animTunePad.test.ts` | :103-133 (Select toggles the tuner) | Nothing if the tuner keeps View | Keep; add a check that a consumed View press does not open the popup |
| `scripts/e2e-course.mjs` | :140-157 (course markers on by default, hidden by the setting) | Nothing | Keep (Marlow guidance mark) |

New coverage to add with the fixes: a vitest for the popup timer (HG5); an e2e line per mode suite (Sector Ops, Marlow, free roam) that `.hud-minimap` and `.hud-compass` are absent (VISION rule 5 has no assertion today); the binding test above.

### C. Removal inventory

Everything that draws or feeds a compass, minimap, blip, briefing map or field-menu map (@829a9332 unless marked).

| File:line | What | Action |
|---|---|---|
| `src/ui/hud/minimap.ts:1-107` | Minimap class and `Blip` type | Delete |
| `src/ui/hud/hud.ts:5` | `import type { Minimap }` | Delete |
| `src/ui/hud/hud.ts:32-35` | `HudFrame.yaw`, `HudFrame.markers` | Delete |
| `src/ui/hud/hud.ts:38` | `COMPASS_PX_PER_RAD` | Delete |
| `src/ui/hud/hud.ts:57-58` | `compassStrip`, `compassMarks` fields | Delete |
| `src/ui/hud/hud.ts:86, :152, :160` | `minimapSlot` field, element, mount | Delete |
| `src/ui/hud/hud.ts:131-143, :159` | Compass build and its place in `.hud-top` | Delete (keep `.hud-top` with room tag and objective) |
| `src/ui/hud/hud.ts:175-177` | `setMinimap` | Delete |
| `src/ui/hud/hud.ts:257-271` | Compass scroll and markers per frame | Delete |
| `src/ui/hud/hud.ts:144, :297-304` | Objective line | Keep, becomes the popup (HG5) |
| `src/ui/hud/hud.ts:306` | Comment "under the compass" | Reword |
| `src/game/gameState.ts:31` | Minimap / Blip import | Delete |
| `src/game/gameState.ts:260` | `NetAttachment.blips?` | Delete |
| `src/game/gameState.ts:352, :639-640` | `minimap` field, construct, `setMinimap` | Delete |
| `src/game/gameState.ts:399-400, :750, :766-768` | `extraBlips` and its assignments | Delete |
| `src/game/gameState.ts:2139-2140` | `enemyBlips` (tests) | Delete |
| `src/game/gameState.ts:3613-3614` | `yaw`, `markers` in the frame | Delete |
| `src/game/gameState.ts:3616-3635` | Blip build, radar, objective bearings | Delete |
| `src/game/gameState.ts:3637-3639` | `minimap.draw` | Delete (keep `updateCoverHud` at :3637) |
| `src/game/modes/gameMode.ts:5, :106` | `blips()` in the interface | Delete |
| `src/game/modes/sectorMode.ts:9, :1355-1359` | Objective / exit blips (Sector Ops) | Delete |
| `src/game/modes/sectorMode.ts:1391-1392 @00b6cde9` | Mission gate on the blips | Delete in the rebase |
| `src/game/modes/infiltrationMode.ts:7, :299-303` | Objective blips (parked) | Delete |
| `src/game/modes/missionMode.ts:8, :156-160` | Objective blips (parked) | Delete |
| `src/game/modes/clearMode.ts:6, :221-223` | Empty blips (parked) | Delete |
| `src/game/modes/courseMode.ts:6, :1122-1124` | Empty blips (Marlow) | Delete |
| `src/game/modes/courseMode.ts:86-99, :1137, :1213` | Next-drill guidance mark | Keep for Marlow (HG11 pending) |
| `src/ui/hud/pings.ts:16-63` | Course marker renderer | Keep for Marlow |
| `src/core/settings.ts:100, :161, :375`; `src/ui/screens/settingsScreen.ts:156, :213` | `courseMarkers` setting | Keep for Marlow |
| `src/ui/hud/courseHud.ts:1-8` (class) | Always-on objective list | Keep for Marlow |
| `src/game/pickups.ts:96-98` | Pickup blips | Delete |
| `src/net/coopHost.ts:7, :1939-1945` | Ally (partner) blips | Delete |
| `src/net/coopClient.ts:4, :1320-1324` | Ally (partner) blips | Delete |
| `src/progression/suit.ts:103-104, :115, :123, :127, :135` | Minimap radar HQ upgrade | Delete the radar entry (HG4) |
| `src/styles.css:956-1006` | Compass CSS | Delete |
| `src/styles.css:1045-1055` | Minimap CSS | Delete |
| `src/styles.css:2341, :3292` | `.hud-minimap` in the HUD zoom lists | Delete the line |
| `src/styles.css:1280, :1291` | Context menu pushed under the minimap | Set top to 10.7 % H; reword comment |
| `src/styles.css:1007-1012, :1028` | `.hud-objective` | Keep, restyle as the popup (HG5) |
| `src/styles.css:207`; `src/ui/hud/wheelLayout.ts:10`; `src/ui/animTunePanel.ts:2363`; `src/world/levelBuilder.ts:60, :76`; `src/world/kit/facilityKit.ts:74` | Comments naming the compass / minimap | Reword |
| `src/ui/hud/missionHud.ts:1-100 @00b6cde9`; `src/game/modes/sectorMode.ts:366, :1328 @00b6cde9`; `src/net/coopClient.ts:225, :1171-1173 @00b6cde9` | Always-on mission list | Gate by mode: becomes popup content plus the field-menu list (HG7) |
| `src/ui/screens/briefingScreen.ts:47-100` | Briefing (text, objectives, rules) | Keep: no map drawn |
| `src/ui/screens/pauseScreen.ts:41-58, :82` | Field menu Objectives | Keep: no map item; fill the full list (HG8) |
| `docs/menu-ui/SPEC.md:252-253, :338-340` | Planned briefing map and field-menu Map | Strike (HG12) |
| `src/editor/*` minimap (e.g. `src/editor/main.ts`, `scripts/e2e-editor.mjs:746-793`) | Kestrel level editor's small plan | Keep: a dev tool, not a game mode (G15) |

### C. Checked, conforms

- Briefing map: none in code. `src/ui/screens/briefingScreen.ts:47-100` draws text, objectives and rules only; no canvas or map anywhere in `src/ui/screens/` (doc drift only: HG12).
- Field-menu map: none. `src/ui/screens/pauseScreen.ts:82` has Objectives; no Map item (doc drift only: HG12).
- Hint layer: optional, off by default on the engine (`src/core/settings.ts:163 @00b6cde9` `hints: false`; toggle `settingsScreen.ts:157 @00b6cde9`); hint shown only under the viewer's current row (`missionText.ts:94-99 @00b6cde9`). Not on master; arrives with the engine (G290).
- Engine objective text: short, plain English, names what and where (`tallowWharfMissions.ts:48-199 @00b6cde9`), 90-character cap validated (`missionDef.ts:140, :220-222 @00b6cde9`) (G336, G351).
- Engine adds no blip or marker (only the gate at `sectorMode.ts:1391-1392 @00b6cde9`, removed with HG3).
- Marlow Yard always-on objective list: `src/ui/hud/courseHud.ts:1-8` on screen from spawn, never hides (G292, bible 5.10 :726-727). Kept by the plan.
- Marlow Yard guidance marks: built and on by default (`courseMode.ts:86-99`, `settings.ts:161`); kept by the plan (exact form: HG11).
- View / Select and O free in play: View has no gameplay action (`padBinds.ts:51`, not in `GAME_BINDINGS`), O has no binding or handler; only the dev tuner uses View while open (`animTunePad.ts:69`). No conflict to resolve beyond HG6.
- World pings and the partner beacon: player-placed pings only (`src/ui/hud/pings.ts:76`), allowed by G135; no partner marker.
- Flags: nothing in `src/core/flags.ts` touches the compass, minimap, blips or objective HUD (the minimap has no flag; it is simply on).
- Interrogation intel shows as text lines only (`src/game/intelReveal.ts:9-20`), no map reveal.
