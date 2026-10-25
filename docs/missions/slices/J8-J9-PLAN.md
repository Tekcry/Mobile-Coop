# J8 tallow-fixes and J9 tallow-shutters: plan (Tallow Wharf greybox fixes and shutter wiring, dark)

Lead: Night Shift | Campaign Build. Planner: Opus 5.5, 2026-10-25 ~19:00 Sydney. Plan only: this file is the draft for
`docs/tallow-fixes/PLAN.md` (J8, `feature/tallow-fixes`) and `docs/tallow-shutters/PLAN.md` (J9,
`feature/tallow-shutters`); the lead commits each with its BRIEF before the one fresh Opus plan checker (both jobs in one
check: they share the map). Written from scratch (the earlier planner left no file).

Refs read: engine `feature/mission-engine` local HEAD 8f40303f3 (= `origin/feature/mission-engine-flg-gb6`: engine + FLG +
GB5 / GB6 + the J7 plan); `origin/feature/mission-framework` ab90a0711 (PR #372: Tallow SPEC, graph, sign-off pages);
`origin/master` b81c4945b (CLAUDE.md, RULES, VISION, level-design.md, scale sheet, DECISIONS, agent-preamble);
`origin/feature/menu` 4fb32b354 (FOLDED-PLAN, ROADMAP "Decided", G157-12-changes.md); `origin/feature/light-realism`
94a4413fc (PLAN, research/bands.md); `origin/feature/route-runs-2` 32b709dc8 (PLAN). Every file:line below is on 8f40303f3
unless marked. No npm / tsc / vitest / node run was made for this plan (desktop CPU at 100%): validator results are the
last recorded runs (section 2).

**Fix round 1** (Opus planner, 2026-10-25 ~20:30): answers plan check 1 (`C:/NightShift/scratch/campaign/j8-j9-plan-check.md`,
fixes 1-11, polish 1-10) with the lead's rulings; the map of fix -> answer is the last section. Refs re-read: engine
dc8e4681 (code unchanged since 8f40303f for every file:line here), origin/master 94e72b1c (validator, claims-check,
scale sheet, level-design), `origin/feature/tallow-spec` d42d1596 (TW23), `origin/feature/coop-kit` 34cfcad2 (Player's
J24). Read-only node runs (no npm / tsc / vitest): master's `level-validate.mjs` and `claims-check.mjs` from a
`git archive` extract of 94e72b1c; outputs and the draft graph in `C:/NightShift/scratch/campaign/j8-j9-val/`.

Scope: FOLDED-PLAN section 4 rows J8 and J9; section 3 breaks 16, 18, 19; Campaign conformance (master
`docs/conformance-campaign/CONFORMANCE.md`) S7, S9, S10, S16, S22 with detail rows TW2, TW3, TW4, TW14, TW15, TW17, TW18,
TW19, TW21, TW22, MF18; Player conformance R39 (held shutter invisible to guards). J7 runs first
(`docs/missions/slices/J7-PLAN.md` on the engine branch); nothing here edits a file J7 owns while J7 owns it (section 5).

## 0. Goal and Michael's words

**Goal.** Tallow Wharf (campaign Mission 1, G340) becomes a greybox that meets the level standard and the hard rules, so
the greybox exit (measured validator pass, bot route-runs, 10-minute walk card) can run on it (J23):
- J8: master's validator at 0 ERR (gate reach: w2-reading-room 20.0 s, w2-clock-loft 28.2 s, w4-jetty 15.8 s against
  15 s); real-site lighting per space (no light left off, Australian-standard bands); the throw gaps force co-op; hide
  spots, medkit stations, declared splits, graph matches the build, the roof reached through a plant space; then the
  sign-off pages tell the truth about the build.
- J9: both shutters are real (W1 fish hall -> service passage, C2; W4 back lane -> shed two, C8), so both missions finish
  without a debug teleport (VISION rule 3, G146), and a calm guard notices a held-open shutter (R39).

**Michael said** (verbatim; ROADMAP "Decided" on origin/feature/menu unless a G entry is named):
- Tallow Wharf map, ~18:05: "approve as drawn, id rather physically walk the map once built and confirm changes".
- G292: "All campaign missions are strictly coop and cannot be completed solo, must have forced coop traversal to proceed
  (help player climb a wall, throw coop player over a gap to open a locked pathway for the other player, and any
  suggestions you have)."
- G329: "On the current build the s1 car park is still very dark which is unrealistic, car parks are generally well lit".
- G359: "32 alive, ..." (the full quote stays in DECISIONS G359, G114).
- G98 directive (medkit stations in every map): "Anything that isn't a part of the original chaos theory shouldn't
  exist."

**Michael picked** (option text):
- Q1 Tallow hold: "Build now, walk later (Recommended)". The 12 level-rule changes (~18:20): "Adopt all as recommended
  (Recommended)" (section 1).
- Q2 dark spots: "Never" (FOLDED-PLAN option text: "every light works; darkness only from cover, cut circuits and shot
  lamps"; the ROADMAP "Decided" line paraphrases it as "cut power").
- Q3 light levels: "Australian standards (Recommended)" (bands from AS/NZS 1158.3.1 and AS/NZS 1680 / EN 12464, one lux
  calibration, Michael approves the table with the car-park light map).
- Q23 Tallow throw gaps: "Force co-op".
- Q12 campaign riot shields: "No, armed only (Recommended)". Q8 civilians: "None on Mission 1 (Recommended)". Q19 rewards:
  "None (Recommended)". Q7 route-runs: "Never stuck (Recommended)". Q22 pages: signed off ~18:05 (the line above).
- G285 (c) 2+ independent routes per section; G333 hardened lit chokes: "Everywhere"; G335 lookouts and pairs: "Add both".
- Co-op kit (~18:05): all five new moves join ("Deadweight,Drop Catch,Chimney Pair,Swing Pass", Plank Bridge "Add it");
  the human ladder is the shoulder stand, its own move (#372 ab90a0711). Player Build builds them (J24); kit order in
  `docs/missions/STATE.md` resume item 7 on origin/feature/mission-framework.
- Free assets (ROADMAP "Decided" ~19:00, relayed by the lead; overrides CLAUDE.md "No external art" until the fold
  lands): any free asset is allowed when its licence permits commercial sale (CC0 / public domain, CC-BY with credit,
  royalty-free game licences such as Mixamo); never non-commercial, no-derivatives, share-alike or unclear licences;
  source URL and licence go in `docs/art-credits.md` / `docs/audio-credits.md`; the IP rule is unchanged (no
  reference-game names or assets; characters, story, logos, UI art and the goggle stay original).

## 1. The 12 level-rule changes (G157, adopted ~18:20) as they bind J8 / J9
Planned to the adopted wording in `origin/feature/menu:docs/orchestrator/G157-12-changes.md` (Marlow Build writes them
into level-design.md; until then that file and ROADMAP "Decided" are the source).

| # | Adopted rule | Tallow today | Where |
| --- | --- | --- | --- |
| 1 | Built for two: no area done alone; at least one teamwork climb per mission | the 2.5 m throws are solo-jumpable (TW17) | J8 TD (per-site throw length, A24) + G2 / G3 (4.9 m gaps, A28) |
| 2, 3 | Team moves anywhere (G151); 30 s revive x 2 (G126) | already rules | J7 (revives); none here |
| 4 | Teamwork minimums sized per map; the stricter 90 s split limit kept; a split ends in a joint action | splits undeclared (TW18) | J8 D0 declares both missions' splits with their joint action (validated before wave 1); the per-map minimums table and 11.11's "nobody waits over 60 s / swap roles" are J23's co-op plan |
| 5 | Pacing minutes are playtest targets | - | walk card (J23) |
| 6 | The entry lookout fits both players; the finale seen from afar | not checked | J8 G1, G2, G3 and G4 each: every encounter vantage holds two (two standing spots out of view), in each slice's done line; G3 checks the crane's red lamp is seen from the W3 roof (fix if blocked) |
| 7 | Readable world: on / off by look and sound, a visible link to its switch; lit windows expose both sides; weather only where a map has weather | switches exist; no link rule | J8 LP light plan: every switch by the door of the space it lights with a visible link (a conduit run from switch to fitting, or a labelled panel naming the circuit); Tallow has no weather (n/a) |
| 8 | Two-minute test at every blocked route | not checked | J8: each forced gate and each new one-way way back is visible from its approach (brief check); walk card line |
| 9 | Designed exit: under 2 min or a different route for half the way back | TGC shed three -> jetty; TKL strongroom -> W4 (a new route) | J8 D1 audit line in the graph note; no change expected |
| 10 | Real building safety: two staircases per multi-storey building, exits open from inside, real signs; fire-alarm door release gets its own decision | roof ladder in a let loft (TW22); bolted doors not audited for egress; two-stair rule (16.2.7) and secure-roof rule (16.2.5) not audited (TW23 O12, O13) | J8 G2 (plant room, A7) + LP's egress table: a row per bolted door (inside side, story reason) and a row per multi-storey building (its two stairs, or the fix and the slice that builds it, or the reason for the walk); every added stair is shut from the approach side; signs are art (n/a in greybox) |
| 11 | Extra planning pages added to existing plans | - | J23 |
| 12 | Final map tests (finish unseen; goggle colours told apart at ~20 m in the "darkest real spot"; revive within 30 s on every team-move surface) | - | J23 tests; J8 LP names the darkest real spot per section |

## 2. State today (facts the slices start from)
- **Validator, last recorded runs** (Campaign conformance, 2026-10-25 13:28, outputs in
  `C:/NightShift/scratch/conformance-campaign/val/`; the map graph on the engine HEAD is byte-identical to 00b6cde9):
  - master 829a9332 `scripts/level-validate.mjs` (the rule owner, has gate reach), `out-829a9332-map-00b6.txt`:
    **3 ERR, 6 WARN**: `link w2-pawn-loft -> w2-reading-room (team_throw): the way back ... takes 20.0 s, over the 15 s
    revive reach`; `w2-pie-loft -> w2-clock-loft (team_throw)` 28.2 s; `w4-canal-ledge -> w4-jetty (team_pull)` 15.8 s.
    WARNs: `room_class custom` x5 (w1-canal-steps, w2-arcade-roof, w3-roof, w3-chute, w4-boat), w3-chute off the 0.5 m
    grid (all justified at SPEC :300-311).
  - mission-validator 0c62a921 (kit dimensions), `out-0c62a921-map-00b6.txt`: 0 ERR, 8 WARN (the 6 above + both shutter
    links "dimension missing (gap ...)"; the framework graph ab90a0711 already restores `"gap": 0.9` on both). With
    `--require-measured` (`out-0c62-reqmeas.txt`): 9 ERR, every encounter space unmeasured (V6, J12 / J23).
  - V6 8f551e18 (`out-8f551e18-map-00b6.txt`): 7 ERR, kinds `shutter`, `team_pull`, `team_throw` unknown (J12 ports the
    kinds).
  - Known, not J8's: mission-validator still requires an optional reward, so TGC / TKL graphs fail it since Q19 (J12,
    framework STATE item 6).
  - **Rerun in fix round 1** (master 94e72b1c, read-only extract; `scratch/campaign/j8-j9-val/master-94e72b1c-today*.txt`):
    the same **3 ERR, 6 WARN** on map, map + TGC and map + TKL, on both the engine graph and the framework graph
    (ab90a071). Master's `docs/design/metrics.json` has `throw_gap_max` 2.7 (scale sheet section 3 "Throw gap": "at
    most 2.7 m: the runner lands `TEAM.throwDist` 3.2 m past the thrower ... less a 0.5 m landing margin"); a
    `team_throw` link wider than that is an ERR (`level-validate.mjs` `checkDimensions`, case `team_throw`).
  - **Draft wave-0 delta** (fix round 1, numbers for D0; `scratch/campaign/j8-j9-val/delta.cjs`, `opt.cjs`): the two A5
    way backs + the A6 jetty drop clear all 3 gate-reach ERRs but open a new one, `section W2: exit 'w2-arcade-roof' is
    reached from entry 'w2-arcade' by solo links alone` (a lone player walks up the public stair into the reading room
    and over a way back into the south lofts, round C3). With the stair-head door bolted from the stair (A25): **0 ERR,
    6 WARN on all three runs** (`master-94e72b1c-stair*.txt`). Draft split tags (A11) add 3 ERR still to solve in D0:
    `split tgc-leads: legs 17.4 s vs 21.9 s differ by 21%`, `a downed partner is 21.2 s away (from w1-tea-stall ...)`,
    `split tkl-wings: legs 14.5 s vs 40.2 s differ by 64%` (`master-94e72b1c-stair-splits.txt`). Widening the throw
    links to 4.9 m adds 3 ERR `gap 4.9 m above the 2.7 m throw` until the validator reads a per-link throw length (A24).
- **Shutters** (MF18, TW2): `tallowWharfW1.ts:137` and `tallowWharfW4.ts:157` build `standIn` panels
  (`tallowWharfKit.ts:238`, tag `shutter-standin:<id>`); no `placeShutter` call anywhere; `ShutterDoors`
  (`src/world/shutterDoor.ts:78`) is never constructed; the kit `tick` hook exists (`src/game/kit/registry.ts:160`,
  `SHUTTER_MOVE` calls `syncShutters` from it, `shutter.ts:661-674`); the wire carries the shutter kinds and gap
  (`src/net/kitNet.ts`, `protocol.ts:896`, `:920`). `SHUTTER_NOTICE = { range: 9, cos: 0.2 }` and `shutterNoticePoint`
  (`shutter.ts:84`, `:286`) are unreferenced; the door notice is `StealthSystems.noticeOpenDoors`
  (`src/game/stealthSystems.ts:618-643`, host, every `DOOR_NOTICE_EVERY` 0.25 s). The wharf e2e prints SKIP and
  teleports at `scripts/e2e-sectorops-wharf.mjs:307`, `:364`, `:464`.
- **Light**: every section is "lit by default" (LR1 / G279: `tallowWharfW1.ts:150`, `W2.ts:229`); W3 group 81 is built
  `on: false` (`tallowWharfW3.ts:276`, a light left off: Q2); W4 leaves the shed three side aisle and the yard cart lines
  with no fitting by comment (`tallowWharfW4.ts:172`, `:176`); theme `ambient 0.3`, `lightLevel 0.3`
  (`tallowWharf.ts:76-79`), above the campus night floors (moon 0.104, standby fill 0.14, light-realism research
  section 2), so a cut circuit cannot read dark. Bands: scale sheet section 9 is all `TBD` (master); light-realism's
  draft table (`origin/feature/light-realism:docs/light-realism/research/bands.md` section 3) waits for Michael's click
  on the S1 pack; the curve `level = 0.28 + 0.32 log10(lux)` puts every working interior band at or above 0.79 (lit).
- **Throws** (TW17, Q23; corrected in fix round 1): C4 lightwell gaps 2.5 m (south bay edge z 70, north stages z
  72.5-73.5; `tallowWharfW2.ts:88-90`, `:227`); C5 lane 2.5 m (thrower x 79.2, W3 stage x 82-86.5). All three are level
  (C4 loft 4.5 to stage 4.5; C5 roof 8.4 to roof 8.4). The throw lands exactly `TEAM.throwDist` 3.2 m past the thrower's
  centre (`throwLanding`, `teamMoves.ts:210-226`; `requestThrow`, `teamController.ts:956-993`); `throwLandingOk`'s
  2.2-4.2 m (`teamMoves.ts:229-232`) is only how far off a claimed landing the host accepts. So the widest throwable gap
  is 3.2 - 0.3 (thrower's radius back) - 0.3 (landing feet on the stage) = **2.6 m**. Solo reach from the game's
  constants (`tests/helpers/soloJumpReach.ts`: `GRAVITY` 18, `LEAP.vy` 5.6, top speed 4.0, `maxStep` 0.42, radius 0.3,
  `FALL_GRAB` plan 0.7 / maxAbove 2.35), by landing height over the take-off:

  | Landing vs take-off | -1.0 m | -0.5 m | 0 (all three sites) | +0.5 m | +1.0 m (`throwDrop` limit) |
  | --- | --- | --- | --- | --- | --- |
  | `soloTopLandingReach` (land on the top) | 3.86 | 3.63 | **3.36** | 3.03 | 2.56 |
  | `soloJumpReach` (in-air grab of a lip at the landing top) | 4.98 | 4.82 | **4.64** | 4.44 | 4.23 |

  The 2.6 m most a standard throw clears never beats the grab model, and beats the top model only at +1.0 m by 0.04 m.
  So geometry alone (check option (a)) cannot force the throws at any height the throw allows, approved or not: the
  per-site throw length (A24, slice TD) is the mechanism (lead ruling, fix 1 (b)).
- **Hide spots** two per section (`W1.ts:172`, `W2.ts:252`, `W3.ts:303`, `W4.ts:207`); none in w3-east-yard or
  w3-east-wing (TW14). **Medkits**: no `medkitWalls` (TW15; `MapLayout.medkitWalls`, `src/world/mapDef.ts:69`, read at
  `src/game/gameState.ts:835`, `:1009`). **Roof ladder**: `b.ladder(72, 66.15, LOFT, ROOF, 0)` up a hatch in the let
  corner loft (`tallowWharfW2.ts:204`; TW22, level-design 16.2.1 / 16.2.3). **Graph drift** (TW21): graph counts W1 7 /
  W2 6 against 9 / 10 spawned (`tallowWharfSectors.ts:105-141`, `:187-194`), the w3-east-yard checkpoint tag (graph
  :321) against the build's W3 restart at the roof bulkhead head, dog rows (J7 R3 turns them into armed humans; J7 A11 /
  A17 in `docs/mission-rules/BRIEF.md` leave geometry, lights and the map pages to J8). Bolts: `W1_BOLTS` .. `W4_BOLTS` (`tallowWharfSectors.ts:205-230`; indexes fix the flags
  `<id>-bolt<k>`, so new bolts append). Routes: `tallowWharfSectors.ts:245-301`.
- **Section restart and kit devices** (check fix 4): `SectorMode.restartSection` (`sectorMode.ts:1182-1215`) re-bolts
  the section's team doors (`this.team.reset`, `SectorTeamDoors`, `sectorTeamDoors.ts:213`), rekeys, resets guard memory
  and calls `g.checkpointReset()`; nothing resets kit devices (`TeamController.devices`), so a held shutter stays up
  into the retry. The fix is J9's (A27, S1 / S2).
- **e2e coordinates**: the wharf e2e hard-codes the pawn-loft throw (`:335`, stage `[49, 72.5, 52, 73.5]`) and the jetty
  pull (`:465`): J8's geometry moves them.

## 3. Assumed decisions (A-n, each with its undo)
Overnight rule (RULES Intake 2): logged, work carries on; A1 is the one a day-time lead may put to Michael (section 15).
- **A1 Q2 "Never" on Tallow.** Every fitting is on and working at the start (no `on: false`, no dead fitting). A space
  that is closed tonight (pie shop, clock loft, corner loft, shed two, strongroom, the shut shops) is lit only by the
  fittings a real site leaves on at night (emergency bulkheads, stair and security lights, a desk lamp someone left on),
  never by a working fitting switched off; a space someone works in tonight is lit to its band. Darkness comes from
  cover (stall backs, presses, tea chests, carts), the real gaps between fittings, cut circuits and shot lamps. Undo: light
  the closed spaces to their working bands (a data-only re-light per section).
- **A2 Provisional bands.** Until Michael clicks the light-realism S1 pack, J8 lights to light-realism's draft table
  (research/bands.md section 3) through the space-type map in section 6 LP; the bake is measured against the approved
  table at greybox exit (J23 / GBM, with light-realism L0's `lux-grid.mjs`). Undo: a data-only re-tune per section when
  the approved table differs.
- **A3 Night floors.** Tallow's theme ambient and night floor match the campus night floors (moon + standby fill), so a
  cut circuit reads dark (light-realism research section 4). Undo: restore `ambient 0.3` / `lightLevel 0.3`.
- **A4 Forced throws (Q23; fix round 1, lead ruling fix 1 (b)).** Geometry alone cannot do it (section 2 table). Each
  Tallow throw site (C4 pawn, C4 pie, C5 lane) carries its own throw length (A24, slice TD): **5.8 m**, so the gap it
  clears is **4.9 m** (thrower 0.4 m back from the take-off edge, landing feet 0.5 m onto the stage: 0.4 + 4.9 + 0.5 =
  5.8). At these level sites that beats `soloTopLandingReach` 3.36 m by 1.54 m and `soloJumpReach` (in-air grab) 4.64 m
  by 0.26 m, both over the 0.2 m margin, so the throw stays forced even if a grabbable lip slipped in; the landing edges
  stay `noLedge` too (belt and braces). The site's host band is its length +-1 m (4.8-6.8 m) and the height limit stays
  `TEAM.throwDrop` 1.0 m. No approved height changes; the gaps widen in plan (A28). A fall-in keeps its way out (the
  lightwell drain, `tallowWharfW2.ts:295`; the lane at street level). Undo: drop the three site lengths (the throws go
  back to 3.2 m) and restore the 2.5 m gaps: TW17 reopens (solo-jumpable), so the undo needs another forcing first.
- **A5 Way backs as Michael's "locked pathway" (fix round 1: enclosed, gate at the approach end).** Each C4 way back is
  an enclosed iron footbridge (solid sides to the head and a roof, `noLedge`, no top or lip a lone player can stand on or
  hang from) along a lightwell end (west x ~44-45.5 for the pawn throw, east x ~68.5-70 for the pie throw). Its gate is
  at the **south (approach) end**, bolted on the bridge side: the thrown partner walks back along the bridge and
  unbolts it for the thrower (G292's own example), it stays open (level-design 11.6), the walk is 12 m or less (draft
  9 m: 3 s at `reach_speed_mps` 3.0, under the 15 s reach), and from the south loft it is shut, so the throw stays
  forced. Graph: a `door` link `from` the south loft `to` the north room, `bolted: true` (a lone player passes only from
  the `to` end, `level-validate.mjs:225-227`), width 1.2 (1.0 gives a nav WARN). With A25 this clears both C4 reach ERRs
  (draft run, section 2). Undo: a drop or a kicked-down ladder instead.
- **A6 Jetty way back.** A one-way drop from the jetty staging onto the canal ledge beside C10 (a gap in the jetty rail,
  "the old staging ladder's gap"); the 4.4 m lip stays in the co-op band, so no solo way up. Graph: a `drop` link
  `w4-jetty -> w4-canal-ledge`, `level_change` 4.4, `time_s` 3 (draft run: the C10 reach ERR clears). Undo: move the quay
  ladder closer to the jetty.
- **A7 Roof access.** The W2 corner-loft hatch ladder moves into a plant space: a tank room with a caged fixed ladder
  and a hatch cover (16.2.1, 16.2.3), entered from the loft by a door. Why 16.2.5 (a secure building's roof by a stair
  bulkhead or fire stair) does not apply: the arcade lofts are let commercial lofts with no strongroom, bond or key
  holding; the site security summary (TW23 `docs/tallowWharf-map/SPEC.md`, "Security") names only the counting house
  strongroom and shed three's bond as hard points, and the counting house's roof access is already its bulkhead stair
  core (16.2.5 met). Undo: a stair bulkhead (16.2.5) instead.
- **A8 Medkits.** One wall station per section (4), each with a real reason (W1 market warden's first-aid box, W2 the
  beadle's office, W3 the porter's lodge, W4 the shed office), out of guard view near the section checkpoint. Not a
  reward (Q19 is about grants). Undo: one per map (G98's minimum).
- **A9 Hide spots.** At least one per encounter space within the stepping-stone spacing (scale sheet section 5) of each
  of its takedown spots, two or more in the market and the shed yard, each at a real object. Undo: none needed (counts).
- **A10 The build is the truth for counts.** The graph and SPEC take the spawned guard counts (inside every band and
  the 32 cap, G359); J8 adds no guard. Undo: n/a.
- **A11 Splits.** TGC (Eyes / Ears) and TKL (Ears / Hands, one player per wing) are declared as the BEATs describe:
  legs, merge point, overwatch spot, assist, each ending in a joint action (G157 4); a failing leg or parity is fixed in
  data or geometry inside J8. Undo: drop a split declaration and its BEAT line.
- **A12 No new one-click.** J8's geometry changes are fixes inside the approved drawing; they go on the walk card as
  "changes since you approved the drawing" (Michael: "confirm changes"). Undo: a one-click on the corrected PLAN.svg
  before J23.
- **A13 No new kit moves on Tallow.** The five new moves, the shoulder stand and rope descent are not added to Tallow in
  J8 / J9 (approved as drawn; C6 stays gone). Undo: a later Tallow pass after the walk.
- **A14 Lookouts and pairs wait for Guard AI.** G335 data on Tallow (a roof-turret and a gantry lookout; pair tags on the
  W1 porters and the W4 yard patrol) waits for J15's `lookouts` and pairs builds (`feature/guard-rules` PR3 / PR4); slice
  G6 is planned but outside J8's gate. Undo: n/a.
- **A15 Guards and shutters.** Guards never path through a shutter: the opening is closed on the guards' nav grid
  (story: the winding gear is broken, the chain seized; SPEC C2 / C8). No Tallow patrol crosses one today. Undo: a guard
  lift behaviour (Guard AI, large).
- **A16 Shutter light.** The closed curtain stops lamp light in the field and on screen alike (light parity); the held
  0.9 m gap passes no lamp light during its few seconds. Undo: a lift-aware occluder.
- **A17 No lift noise.** Guards notice a held shutter by sight (as an open door, G41), not by sound. Undo: a hold-noise
  pulse (`Interactable.holdNoise` style) with the radius from the sound plan.
- **A18 The notice.** A calm guard within 9 m (`SHUTTER_NOTICE.range`), facing it (`cos` 0.2), on the same storey, with a
  clear sight line to `shutterNoticePoint`, while the shutter is visibly open (`visible`), hears it as a noise at the
  shutter and comes to look; once per opening (`opens`), host only, no allocation. Undo: a different range / cos (two
  constants).
- **A19 No wire change in J9.** The shutter kinds and gap are on the wire (NET); a client draws its curtains from its own
  devices. If the client needs more, it becomes an Opus `src/net` slice with two checkers. Undo: n/a.
- **A20 One copy of the map docs (fix round 1, lead rulings).** B0: Campaign Build merges `origin/feature/mission-framework`
  (#372) into `feature/mission-engine` at **J7 R0** (GB-briefs 0.3 step 1 pattern); R0 also takes the optional-objective
  rewards out of `tallowWharfMissions.ts` (Q19). So the engine carries the newest graph (gap 0.9), SPEC and pages, and
  J8 / J9 edit them there. TW23 (`feature/tallow-spec` d42d1596, stacked on #372) does **not** move the graph: it adds
  `docs/tallowWharf-map/SPEC.md` (the current spec on the template) and a pointer line on
  `docs/missions/prototypes/campaign-map/SPEC.md`; `graph.json`, `PLAN.svg` and `SIGNOFF.md` stay in
  `docs/missions/prototypes/campaign-map/` (TW23 report A2), so `tests/tallowWharf/helpers.ts:66` keeps its path. When
  TW23 merges into the framework branch after B0, Campaign Build runs **B0b**, a second framework -> engine merge; D0's
  and D1's graph edits and P1's SPEC edits wait for whichever merge brings TW23 in, so no two branches edit
  `graph.json` or the SPEC at once. Undo: J8 docs on a branch off master after #372 merges.
- **A21 Stacking.** J8's PRs (T, G1, G2) and J9's PR S are PRs into `feature/mission-engine` (as J7's D / E / F, J7-PLAN
  section 4); they reach master through the PR C split (`docs/missions/slices/PRC-split.md` C8 / C9 or new members). A
  fix round on an earlier PR is merged forward into the later branches by the lead, as J7-PLAN section 4 does for D ->
  E -> F; PR C's gate is J7's (its two fresh Opus checkers and the union of suites on the head after the last merge).
  Undo: retarget them to master after PR C merges (the orchestrator's call).
- **A22 J8's validator gate.** 0 ERR on master's `scripts/level-validate.mjs` (map graph, map + TGC, map + TKL) and 0 ERR
  on the mission-validator for the map graph, each run as the conformance ran them (extracted with git, plain node). The
  one exception, until Marlow's TV lands (A24): the three `gap 4.9 m above the 2.7 m throw` ERRs, listed by name in the
  saved output; D0 / D1 rerun on TV's validator to show them gone. V6 cannot read the kit kinds until J12: not a J8
  gate. Undo: J12's ported validator once on master.
- **A23 Free assets come after the greybox gates.** J8 / J9 stay greybox (`detail: false`): no external asset enters
  them. Free props and dressing (tea chests, stalls, crane, shutter curtain, barrows, lamps' fittings, canal sounds) are
  planned as slice FA (section 6): a scouting list with licence checks first, then an import slice only after the
  greybox exit and the lead's go for each download (RULES "A job": ask before installing or downloading). Undo: build
  the props in-repo as today.
- **A24 Per-site throw length (fix round 1; lead ruling fix 1 (b); touches the level standard: one-click to Michael by
  day, assumed and logged meanwhile, RULES Intake 2).** The map layout may list throw sites (thrower spot, facing,
  length); a throw offered within 1.0 m of a site and launched within ~25 degrees of its facing lands the site's length
  past the thrower, and the host's landing band follows it (length +-1 m). Everywhere else, and on every map without
  sites (Marlow Yard, the campus, the rest), the throw stays `TEAM.throwDist` 3.2 m: nothing changes there. No wire
  change (both peers build the same map). The scale sheet row "Throw gap: at most 2.7 m" becomes "at most the site's
  throw length less 0.5 m (default 2.7 m)" and the validator reads `throw_dist` on a `team_throw` link (Marlow Build
  owns both, and the sheet says "a change needs Michael's approval"; its line "Never change the player to fit a map" is
  met in spirit: the player's throw is unchanged, the site carries the length, as a ladder carries its height). Undo:
  remove the sites from Tallow's layout (one line) and the two standard edits; A4's undo applies.
- **A25 The reading room's stair-head door (fix round 1).** The public stair from the arcade ends at a landing door with
  a push bar on the reading-room side only: locked from the stair at night, members leave by it (an exit that opens from
  inside, G157 10). Without it a lone player walks up the stair and over an A5 bridge into the south lofts, round C3
  (validator ERR, section 2). Guards still use the stair (their keys; the guard nav is not changed). TGC's Eyes still
  watches "the stair" for guards and decoys (BEAT step 3). Graph: the `open_stair` link `w2-arcade -> w2-reading-room`
  gets `bolted: true`. Undo: unbolt it and drop the A5 bridges (the 20.0 s / 28.2 s reach ERRs return).
- **A26 `missions` flag switch-on date: 2026-11-01** (fix round 1, lead ruling fix 10), after Michael's Tallow walk;
  switched on only when he accepts the walk items (RULES "Walk pacing"). Owner: Night Shift | Campaign Build. Undo: move
  the date (flags row here, PR bodies, ROADMAP); the flag stays off until he accepts.
- **A27 A section restart puts the shutters back (fix round 1, check fix 4).** On a section restart every shutter drops
  shut, any lift run ends and the "already noticed" marks are cleared, on host and client, as the team doors re-bolt (a
  clean retry). Undo: remove the reset call (shutters keep their state across a restart).
- **A28 Where the gaps widen (fix round 1).** C4: the lightwell widens from 2.5 m to 4.9 m by shortening the south lofts
  (pawn loft and pie loft z 62-70 become z 62-67.6, the take-off edge at z 67.6), not by moving the north range (the
  reading room keeps its 6.5 m short side, storage class). Nothing a lone player can stand on may sit nearer than 4.9 m to
  a stage (any lower roof over the ground rooms below the cut-back is a glazed lightwell roof, `noLedge`, no top). C5: the
  lane gap widens to 4.9 m on one side, LP picks by the tests: the arcade roof's lane edge steps back to x 77.1 (thrower
  x 76.7, landing x 82.5), or the W3 corner-bay roof edge moves east to x 84.4 (stage x 84.4-86.5, landing x 85.0);
  either way the fire-escape bridge over the lane lengthens to match. Heights stay as approved. These go on the walk card
  as changes since the drawing (A12). Undo: per A4.

## 4. Claims

J8 (`feature/tallow-fixes`, `feature/tallow-fixes-2`):
```claims
files:
  - src/world/maps/tallowWharf.ts
  - src/world/maps/tallowWharfKit.ts
  - src/world/maps/tallowWharfW1.ts
  - src/world/maps/tallowWharfW2.ts
  - src/world/maps/tallowWharfW3.ts
  - src/world/maps/tallowWharfW4.ts
  - src/world/maps/tallowWharfSectors.ts
  - tests/tallowWharf/{shell,w1,w2,w3,w4,sectors}.test.ts
  - tests/tallowWharf/helpers.ts
  - scripts/e2e-sectorops-wharf.mjs
  - docs/missions/prototypes/campaign-map/{graph.json,SIGNOFF.md,PLAN.svg,PLAN-approved.svg}
  - docs/tallowWharf-map/SPEC.md
  - docs/missions/prototypes/three-grey-coats/SIGNOFF.md
  - docs/missions/prototypes/two-key-ledger/SIGNOFF.md
  - docs/missions/prototypes/coop-kit/SIGNOFF.md
  - docs/tallow-fixes/**
  - TESTING.md
maps: tallowWharf
protocol: none
save: none
```
J8 PR T (`feature/tallow-throw`, slice TD, A24):
```claims
files:
  - src/game/teamMoves.ts
  - src/game/teamController.ts
  - src/world/mapDef.ts
  - tests/teamMoves.test.ts
  - tests/throwSites.test.ts
  - docs/tallow-fixes/briefs/TD.md
maps: none
protocol: none
save: none
```
J9 (`feature/tallow-shutters`):
```claims
files:
  - src/world/shutterDoor.ts
  - src/world/world.ts
  - src/game/gameState.ts
  - src/game/teamController.ts
  - src/game/stealthSystems.ts
  - src/game/kit/shutter.ts
  - src/world/maps/tallowWharfW1.ts
  - src/world/maps/tallowWharfW4.ts
  - src/world/maps/tallowWharfKit.ts
  - tests/tallowWharf/{w1,w4,shell}.test.ts
  - tests/kit/shutter.test.ts
  - tests/shutterWiring.test.ts
  - tests/shutterNotice.test.ts
  - scripts/e2e-sectorops-wharf.mjs
  - docs/tallow-shutters/**
  - docs/systems/coop.md
  - TESTING.md
maps: tallowWharf
protocol: none
save: none
```
- Changelog fragments (`changes/**`) are shared files and not claimed (claims-check warns on them).
- Paths (fix round 1, A20): TW23 does not move `graph.json`, `PLAN.svg` or `SIGNOFF.md`; they stay under
  `docs/missions/prototypes/campaign-map/`, and `tests/tallowWharf/helpers.ts:66` keeps reading that graph. The current
  spec is TW23's `docs/tallowWharf-map/SPEC.md`; the old `campaign-map/SPEC.md` keeps #372's text under TW23's pointer
  line and J8 does not edit it. `PLAN-approved.svg` is P1's copy of the drawing Michael approved ~18:05 (polish 6).
- TGC / TKL `graph.json` and `BEAT.md` are J7 R1's (J7 PR D), not J8's: the split tags live on the map graph's spaces
  and links. P1 touches the TGC / TKL / coop-kit `SIGNOFF.md` pages only for a pointer line or a redrawn drawing (lead
  ruling, J7 re-check 2: the signed TGC page says killing Teale before he talks breaks the rule and he moves, and a
  knock-out before he talks is a section restart with Teale at his table, mission-framework `docs/missions/BRIEF.md`
  A24); no rule text there is rewritten.
- Not claimed: `src/world/lightField.ts`, `src/voxel/lampBake.ts` (Sector Ops lighting; S1 asks before touching, section
  6), `src/ai/**` (Guard AI), `src/net/**` (A19), `src/game/sectors.ts`, `src/game/modes/sectorMode.ts`,
  `tallowWharfMissions.ts` (J7), `scripts/level-validate.mjs`, `scripts/mission-validate.mjs`, `docs/level-design.md`,
  `docs/design/scale-sheet.md` (Marlow Build: J12, the G157 fold, and TV for A24; the scale sheet's light rows are
  light-realism L5's).
- Overlaps with J7 (same lead, so never at the same time; section 5 orders them): `tallowWharfSectors.ts`,
  `tests/tallowWharf/sectors.test.ts` (J7 PR D R3); `scripts/e2e-sectorops-wharf.mjs` (J7 PR E R7, PR F R8);
  `gameState.ts` (J7 PR F R6). The kit-flag fold (framework STATE item 7: after Player's coop-kit part 1, the kit branch
  `feature/mission-engine-flg-gb6` folds `coopKit` into Player's `kitMoves` and adds wire kind `stand`, touching
  `teamMoves.ts` and `teamController.ts:784`; Campaign Build merges it into `feature/mission-engine`): order on
  `teamController.ts` is fold, then TD's hunk, then S1's hunk; on `teamMoves.ts` fold, then TD (section 5).
- **claims-check** (fix round 1; master 94e72b1c's `scripts/claims-check.mjs --plan <block> --name <branch>`, run from a
  read-only extract against the 36 open PLANs with claims; PLANs without a claims block, including J7's and the engine's,
  are not compared):
  - J8 (`feature/tallow-fixes`): 10 overlaps, all `TESTING.md` (hud-guidance and its a1 / a2 / a3 / b / b1 slices,
    map-ready, sector-batch, sector-marks, sector-marks-b1). One checklist line each; the train settles it.
  - J8 PR T (`feature/tallow-throw`): `origin/feature/coop-kit` (Player's J24) on `src/game/teamMoves.ts`,
    `src/game/teamController.ts`, `tests/teamMoves.test.ts`; `origin/feature/player-hygiene` on `teamController.ts`.
    Player Build owns team moves: Campaign Build tells it before TD starts (section 13) and TD keeps to the throw
    functions; the train settles hunks.
  - J9 (`feature/tallow-shutters`): `src/game/gameState.ts` with char-shadow-meter, coop-kit, hud-guidance (+ a1, a2, a3,
    b, b1), map-ready, player-batch-j19, sector-batch, sector-marks (+ b1); `src/game/teamController.ts` with coop-kit and
    player-hygiene; `src/world/world.ts` with map-ready; `src/game/stealthSystems.ts` with player-batch-j19;
    `docs/systems/coop.md` with coop-kit; `TESTING.md` as J8. S1's `gameState.ts` change is one call line; S2's
    `stealthSystems.ts` change is one new private method and one call: the lead tells Player Build (j19) and the
    orchestrator before PR S opens.
  - Outputs: `C:/NightShift/scratch/campaign/j8-j9-val/claims-*.txt`.

## 5. Branches, PRs and order
| PR | Branch (base) | Slices | Counted lines (est) | Starts when |
| --- | --- | --- | --- | --- |
| G1 | `feature/tallow-fixes` (base `feature/mission-engine` after J7 PR D is merged into it and A20's merge) | LP, G0, G1, G3, FG1 | ~750 (+ docs) | J7 PR D merged |
| G2 | `feature/tallow-fixes-2` (base PR G1's branch) | G2, G4, E8, D1, P1, FG2 | ~950 (+ docs) | G2 / G4 with G1 / G3; E8 after J7 PR F is merged into the engine |
| S | `feature/tallow-shutters` (base `feature/mission-engine` after J7 PR D; the lead merges the engine in again before S3 / S4) | S1, S2, S3, S4, FS | ~1,000 | S1 / S2 at once; S3 after PR G2 merges; S4 after S3, E8 and J7 PR F |
- Worktrees `C:/NightShift/Mobile-Coop-tallow-fixes` and `C:/NightShift/Mobile-Coop-tallow-shutters`; parallel slices
  in `C:/NightShift/Mobile-Coop-tallow-<slice>` on `feature/tallow-<slice>` (the lead creates them with a node_modules
  junction and merges them back; agents never merge).
- Merge into the engine: after checker PASS + green laptop, the lead merges G1, retargets G2 to `feature/mission-engine`
  and merges it, then S (A21). None enters a train alone; PR C carries them. No `PROTOCOL_VERSION` or `SAVE_VERSION`
  change in any of them.
- G1 and G2 are split so each PR moves only the e2e coordinates it changes: G1 (W1, W3) leaves every e2e coordinate where
  it is; G2 (W2 throw stage, W4 jetty) carries E8, the e2e that follows them.

## 6. Slices
Model rule (RULES "A job", G302): Opus for engine / AI / `src/net` and every brief; Sonnet builds greybox data, tests and
wiring from strict Opus briefs; Haiku chores. Sizes are changed lines counted by `pr-size` (docs not counted).

| Id | What | Model | Files owned | Lines / h | PR | Wave | Depends |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B0 | Merge `origin/feature/mission-framework` into `feature/mission-engine` (A20; at J7 R0 if the lead can, else now); cut `feature/tallow-fixes` | lead | none | 0 / 0.2 | - | 0 | J7 PR D merged |
| LP | Light plan + the four section briefs (coordinates for every change below) | Opus | `docs/tallow-fixes/LIGHT.md`, `docs/tallow-fixes/briefs/G{1,2,3,4}.md` | docs / 3 | G1 | 0 | B0 |
| G0 | Shared: night floors (A3); `medkits` on `WharfSection` + `emptySection`; layout `medkitWalls` from the sections | Sonnet | `tallowWharf.ts`, `tallowWharfKit.ts`, `tests/tallowWharf/shell.test.ts` | ~150 / 1 | G1 | 0 | B0 |
| G1 | W1: re-light to LP; hide spots; medkit; vantages for two | Sonnet | `tallowWharfW1.ts`, `tests/tallowWharf/w1.test.ts` | ~250 / 2 | G1 | 1 | LP, G0 |
| G3 | W3: lamp 81 on; re-light; hide spots (east yard, east wing, by every takedown spot); medkit; C5 landing side (no lip, the stage set back per brief) | Sonnet | `tallowWharfW3.ts`, `tests/tallowWharf/w3.test.ts` | ~300 / 2.5 | G1 | 1 | LP, G0 |
| G2 | W2: C4 x2 and C5 thrower side forced (A4); two one-way way backs (A5) with `W2_BOLTS` appended and `W2_ROUTES` kept valid; plant-room roof access (A7); re-light; hide spots; medkit | Sonnet (Opus fix round if its checker fails) | `tallowWharfW2.ts`, `tallowWharfSectors.ts` (`W2_BOLTS`, `W2_ROUTES` only), `tests/tallowWharf/w2.test.ts`, `tests/tallowWharf/sectors.test.ts`, `tests/tallowWharf/helpers.ts` (a solo-carry helper, if needed) | ~550 / 4 | G2 | 1 | LP, G0 |
| G4 | W4: jetty way back (A6); re-light (shed three aisle, the yard cart lines; darkness from stacks and carts); hide spots; medkit | Sonnet | `tallowWharfW4.ts`, `tests/tallowWharf/w4.test.ts` | ~250 / 2 | G2 | 1 | LP, G0 |
| E8 | The wharf e2e follows J8's geometry (throw stage, jetty pull), reading the section exports where it can | Sonnet | `scripts/e2e-sectorops-wharf.mjs` | ~60 / 1 | G2 | 2 | G2, G4, J7 PR F merged |
| D1 | Graph matches the build; splits declared; validators to 0 ERR; output saved | Sonnet | campaign-map `graph.json`; TGC / TKL `graph.json` (split tags only, if they live there); `docs/tallow-fixes/val/*` | docs (+ test lines if a graph test changes) / 2 | G2 | 2 | G1-G4 merged |
| P1 | SPEC and the four sign-off pages corrected; PLAN.svg regenerated; "changes since the drawing" list | Sonnet | campaign-map `SPEC.md`, `SIGNOFF.md`, `PLAN.svg`; TGC / TKL / coop-kit `SIGNOFF.md` | docs / 2 | G2 | 3 | D1; TW23 landed |
| FG1 / FG2 | Fragments, `docs/tallow-fixes/STATE.md`, TESTING.md line | Haiku | `changes/feature-tallow-fixes*.md`, STATE, TESTING.md | docs | G1 / G2 | last | the PR's slices |
| G6 | Lookouts and pairs on Tallow (A14): a W3 roof-turret lookout and a W4 gantry lookout (counts stay inside the bands and the cap), pair tags on the W1 porters and the W4 yard patrol | Sonnet | `tallowWharfSectors.ts`, `tests/tallowWharf/sectors.test.ts` | ~120 / 1 | own small PR or J23 | later | J15 `lookouts` + pairs on the engine; not in J8's gate |
| LM | Lux measure per section against the bands (`lux-grid.mjs --map tallowWharf --section N`), fix list | Sonnet | `docs/tallow-fixes/measure/*` | docs / 1.5 | own or J23 | later | light-realism L0 on master and in the engine; desktop CPU < 80% |
| FA | Free assets for Tallow props and dressing (A23): (1) now, docs only: a scouting list of candidate free assets per prop family with source URL, licence, the commercial-sale check (CC0 / public domain / CC-BY / royalty-free game licence only; reject NC, ND, SA, unclear) and the hours each saves over an in-repo build; (2) after the greybox exit and the lead's go per download: import, credits lines, the dressing job | Sonnet (list), Opus checker on licences | `docs/tallow-fixes/assets.md` (list); later `docs/art-credits.md`, `docs/audio-credits.md` and the dressing files (claimed by that later job) | docs / 1.5 | own docs PR or J23 | (1) any time; (2) after greybox exit | nothing for (1); greybox exit + the lead's go for (2) |
| S1 | Shutter world wiring (curtains, collision, nav, light, client) | Opus | `src/world/shutterDoor.ts`, `src/world/world.ts`, `src/game/teamController.ts`, `src/game/gameState.ts` (one call site, only after J7 PR F is merged), `tests/shutterWiring.test.ts` | ~400 / 4 | S | 1 | B0 |
| S2 | Guards notice a held shutter (R39) | Opus | `src/game/stealthSystems.ts`, `src/game/kit/shutter.ts` (one pure helper), `tests/shutterNotice.test.ts`, `tests/kit/shutter.test.ts` | ~250 / 3 | S | 1 | B0 |
| S3 | Map swap: stand-ins out, `placeShutter` in (W1, W4); stand-in helper retired; tests flipped | Sonnet | `tallowWharfW1.ts`, `tallowWharfW4.ts`, `tallowWharfKit.ts`, `tests/tallowWharf/{w1,w4,shell}.test.ts` | ~120 / 1 | S | 2 | S1 merged; PR G2 merged |
| S4 | e2e walks both shutters (no SKIP, no teleport) and the guard notice | Sonnet | `scripts/e2e-sectorops-wharf.mjs` | ~220 / 2.5 | S | 3 | S2, S3, E8, J7 PR F |
| FS | Fragment, STATE, `docs/systems/coop.md` shutter line, TESTING.md line, hand-off note to Guard AI for `docs/systems/ai.md` | Haiku | `changes/feature-tallow-shutters.md`, STATE, `docs/systems/coop.md`, TESTING.md | docs | S | last | S4 |

### Slice detail (what "done" is)

**LP light plan and briefs (Opus, docs).** One table per space (13 "Light plan", 5.1, 5.2, 5.5): its space type and
provisional band (A2), whether it works tonight (A1), every fitting with its owner, mount and circuit group, the switch
by the door of the space it lights (5.1, G157 7), unswitchable lamps with their reason (clockwork faces, photocell canal
and coal-yard lamps, the emergency bulkhead, the crane's aviation lamp), hardened chokes with the route around (G333),
the dark pockets the real gaps make, which route each cut or shot opens, and the darkest real spot per section (G157
12). The egress audit row per bolted door (G157 10: which side is inside, the story reason, and that no fire exit is
bolted from inside). Provisional space-type map (from the draft band table; LP confirms per space):

| Spaces | Type (draft band) | Tonight |
| --- | --- | --- |
| w1-market, w1-tea-stall | public activity area (7 lx avg, 2 min; stall fronts brighter by their own lamps) | trading |
| w1-fish-hall | loading dock / staffed store (100-150 lx) | trading |
| w1-warden-office, w2-reading-room, w2-pawn-loft desk, w2-pie-loft desk, w3-lodge, w3 wings' desks | office (320 lx at the task plane) | worked |
| w1-service-passage, w2-arcade, w2-walkway, w3-passage, w3 key posts | corridor / walkway (40 lx) | public way or in use |
| w1-canal-steps, w4-canal-ledge | pathway (0.85-3.5 lx, photocell) | - |
| w3-east-yard, w4-shed-yard, w4-jetty | yard / loading apron (20-50 lx) | watched yard; the barge lands tonight |
| w3-coal-yard, w3-cartway, w4-back-lane | service lane (1.75 lx avg, 0.3 min) | not worked |
| w4-shed-three | staffed store (100 lx; aisles lit, darkness behind the tea-chest stacks) | works through the night |
| w2-pie-shop, w2-clock-loft, w2-lane-window, w3-strongroom, w3-partners-office, w4-shed-two | closed: night and emergency lights only (A1) | closed |
| w1-gallery, w2-arcade-roof, w3-roof, w4-gantry, w4-boat, w3-chute | no band: roofs, walks and ducts, moon and spill (plus the turret clock and aviation lamps) | - |

Then one strict brief per section slice (G1-G4) with exact coordinates, group numbers, the test list, and for G2 the
forced-throw and way-back geometry worked through against `throwLandingOk`, `throwRoom`, `soloJumpReach` and the reach
time at `reach_speed_mps`. Done looks like: every Tallow space has a row; no row relies on a light left off; every
encounter keeps a cover-based shadow route after the re-light, or the row says which cut or shot opens it.

**G0 shared (Sonnet).** Theme night floors set to the numbers the LP brief gives (A3, the campus night values);
`WharfSection.medkits: { pos: Vector3; yaw: number }[]` with `emptySection` returning `[]`; the layout gains
`medkitWalls: SECTIONS.flatMap((s) => s.medkits)`. Done looks like: `shell.test.ts` asserts the theme floors equal the
campus values, `medkitWalls` collects every section's stations, and every other shell test passes unchanged.

**G1 W1 (Sonnet).** Lamps per LP (all `on`, every switch by its door); hide spots per A9 (stall backs, ice benches);
the first-aid box medkit (A8); the gallery and fish-hall vantages hold two players out of view. Done looks like:
`w1.test.ts` asserts no lamp off, every switch within reach of a door of the space its group lights, a hide spot within
the spacing of each W1 takedown spot (read from the sectors export), the medkit inside a W1 room and outside every W1
guard's route view radius, two vantage spots per encounter; existing W1 tests unchanged.

**G2 W2 (Sonnet; heaviest slice).** (1) C4 pawn and pie throws and the C5 thrower side forced (A4): gap past the solo
carry, landing edges `noLedge`, landing inside the throw band, fall-ins with their way out. (2) Two one-way way backs
(A5) at the lightwell's west and east ends, bolted on the north side, appended to `W2_BOLTS` (indexes kept), timed at 15 s
or less; `W2_ROUTES` still pass (2+ routes, G285). (3) Plant-room roof access (A7). (4) Lights, hide spots (arcade,
reading room), the beadle's office medkit. Done looks like: `w2.test.ts` proves a solo running jump cannot reach any
landing (no grab, carry short of the gap), `throwCheck` passes on the new stages, `soloNav` with the gates bolted finds no
solo path from the south lofts to the north lofts and does find one from north to south, the ladder sits inside the plant
room, no ladder opening is in an occupied room; `sectors.test.ts` (bolt flags, routes) green.

**G3 W3 (Sonnet).** Lamp 81 `on: true` (Q2) and the re-light; hide spots in the east yard and the east wing and by every
takedown spot (lodge bench, press aisles); the porter's lodge medkit; C5's landing side with no hangable lip and the stage
set back per the LP brief (the gap is set by G2 and G3 together, one brief gives both coordinates). Done looks like:
`w3.test.ts` asserts no lamp off, the hide spots, the medkit, no lip within grab reach of the C5 landing.

**G4 W4 (Sonnet).** The jetty drop to the canal ledge beside C10 (A6) with no solo way up; the shed three aisle and the
yard lit per LP with darkness from stacks and carts; hide spots (shed yard two or more, shed three); the shed-office
medkit. Done looks like: `w4.test.ts` asserts the drop point, the C10 lip still in the co-op band, no new solo climb onto
the jetty, the hide spots and the medkit.

**E8 e2e follows (Sonnet).** `toss` for the pawn throw (`:335`) and `pull` for the jetty (`:465`) take the new points,
from the section exports when the page can read them, else the numbers from G2 / G4. Done looks like: laptop
`e2e-sectorops:wharf-tgc` and `:wharf-tkl` green on PR G2's head.

**D1 graph and validators (Sonnet).** Counts per space = the spawned guards (A10; J7's two former dogs as armed humans,
no dog text left); the W3 checkpoint tag on the space the build restarts at (encounter checkpoints are J23); the way-back
links (bolted door, drop) with `time_s`; the throw links stay co-op only, with a note that the gap is past solo reach
(Q23); the plant ladder link; split, overwatch and assist tags for TGC and TKL (A11; TW18); each space's type and
provisional band in its `note` (a schema field waits for J12); the meta lighting note rewritten (no "lit by default",
no LR1 / G279); the G157 9 exit-run line. Validators (A22), each from a clean extract into the slice's scratch:
```
for R in origin/master origin/feature/mission-validator; do D=<scratch>/val/${R##*/}; mkdir -p $D && git archive $R scripts docs/design | tar -x -C $D; done
node <scratch>/val/master/scripts/level-validate.mjs <abs>/docs/missions/prototypes/campaign-map/graph.json
node <scratch>/val/master/scripts/level-validate.mjs <abs map graph> <abs>/docs/missions/prototypes/three-grey-coats/graph.json
node <scratch>/val/master/scripts/level-validate.mjs <abs map graph> <abs>/docs/missions/prototypes/two-key-ledger/graph.json
node <scratch>/val/mission-validator/scripts/level-validate.mjs <abs map graph>
```
(`docs/design/metrics.json` is generated: if the extract has none, run that ref's `scripts/metrics-gen.mjs` into the
extract first, as the conformance did.) Done looks like: master's validator 0 ERR on all three runs; the
mission-validator 0 ERR on the map graph; every WARN justified in the SPEC's validator section; outputs saved under
`docs/tallow-fixes/val/` with the refs and the date; checkCoop clean on the declared splits.

**P1 pages (Sonnet, from an Opus brief).** SPEC: palette and lighting line (A1, A2, no G279), dogs gone, counts,
throws force co-op (Q23), C2 / C8 real once J9 lands (a dated note until then), the way backs, the plant room, medkits
and hide spots, the validator section from D1. The campaign-map page: the current validator result, armed guards only,
the lighting basis, forced throws, the changes since the approved drawing (for the walk). TGC: Teale protected (J7),
no reward, validator line. TKL: no syringe, no dogs in W3 / W4, validator line. Co-op kit: throws force co-op, the
shutter is real, the five new moves and the shoulder stand are Player's and not on Tallow yet (A13). PLAN.svg regenerated
(`node scripts/graph-svg.mjs`, the slice's own run). Done looks like: no page claims a result the D1 output does not show;
every change since ~18:05 is listed in plain English.

**S1 shutter wiring (Opus).** `World` builds `ShutterDoors(scene, level)` when the level has shutter specs, adds its
`curtainMesh` as a flashlight shadow caster (as the door leaves, `world.ts:161-162`), arms it with the doors (after the
nav grid; the one call site `gameState.ts:793` only after J7 PR F is merged, else a `World` method the existing call
reaches) and disposes it. `TeamController.fixedUpdate` (after the kit ticks) calls
`world.shutters?.update(this.devices.list)` on host and client alike. The guards' nav treats each opening as closed
(A15). Light parity (A16): the closed curtain stops lamp light in `LightField` and on screen through one path (a
bake-time occluder at the curtain plane from `placeShutter`, or a door-list entry that is always shut); the builder reads
`lightField.ts` / `lampBake.ts` first and, if either needs a change, stops and the lead clears it with Sector Ops Build
(lighting owner) before any edit. No allocation in `update` beyond today's. Done looks like: `tests/shutterWiring.test.ts`
(pure parts: slots from specs, the nav cells over an opening blocked, the light path closed) and the existing
`tests/kit/shutter.test.ts` green; on a map with no shutters nothing is built or called.

**S2 the notice (Opus; Guard AI coordination).** A pure `shutterNoticedBy(d, ex, ey, ez, yaw): boolean` in `shutter.ts`
(range, facing, storey; A18). `StealthSystems.noticeOpenShutters(dt)` on the host, on the door notice's timer, over
`g.team.devices.list` (no allocation, `isShutterDevice`, `visible`): the first calm guard that passes the helper and the
sight-line test to `shutterNoticePoint` calls `e.hear(x, z, SHUTTER_NOTICE.range + 2)`; a per-device `opens` mark stops a
second notice for the same opening. Runs only when a shutter is visible (zero devices: one length check). Done looks
like: `tests/shutterNotice.test.ts` (in range and facing: notice; behind, too far, other storey, closed, or already
noticed this opening: none) green; the door notice unchanged (`e2e-ctcourse` A7 data hall).

**S3 map swap (Sonnet).** W1 `standIn(b, SHUTTER)` (`:137`) and W4 (`:157`) become `placeShutter(b, spec)`; the stand-in
helper and its tag map go from the kit; the "never calls placeShutter" tests flip to "places both shutters and builds no
stand-in". Done looks like: `w1` / `w4` / `shell` tests green; the no-bypass test (`soloNav`) still finds no solo way
through either shutter.

**S4 e2e (Sonnet).** Replace the three SKIPs (`:307`, `:364`, `:464`) with the real move on both pages with pad input:
the holder lifts and holds, the partner crawls, the partner unbars the W1 back door for the holder (SPEC C2); a lone
player walking into a closed shutter stays on his side; both pages show the curtain at its gap and then shut. One notice
check: with the guard freeze lifted for one calm guard placed facing the W1 shutter within range, a held shutter raises
his suspicion (he hears it) and a closed one does not. Done looks like: `e2e-sectorops:wharf-tgc` and `:wharf-tkl` green
with no SKIP or teleport left for a shutter; the notice lines printed.

## 7. Waves (full burn, file-disjoint)
- **Wave 0** (after J7 PR D merges and B0): LP (Opus), G0 (Sonnet), S1 (Opus), S2 (Opus) together. No shared file.
- **Wave 1** (after LP and G0 merge on `feature/tallow-fixes`): G1, G2, G3, G4 together (one section file and its test
  each; G2 alone owns `tallowWharfSectors.ts` and `sectors.test.ts`). S1 / S2 keep running.
- **Wave 2:** D1 once G1-G4 are merged; E8 once G2, G4 and J7 PR F are in; S3 once S1 and PR G2 are merged.
- **Wave 3:** P1 after D1 (and TW23); S4 after S2, S3, E8 and J7 PR F.
- Fragments and STATE close each PR. Briefs: LP is the brief work for wave 1; S1 / S2 / G0 briefs are section 16; the
  lead has the D1, E8, P1, S3 and S4 briefs written by Opus before their waves (two to three ahead, RULES "Full burn").
- CPU: every builder follows the GB-briefs 0.4 CPU rule (wait while the desktop is over 85%, background check, never a
  foreground sleep). Today's 100% means wave 0 waits for the orchestrator's go.

## 8. Tests
| Slice | Vitest (`npx vitest run <files> --maxWorkers=2`, plus `npm run typecheck:fast`) |
| --- | --- |
| G0 | `tests/tallowWharf/shell.test.ts` |
| G1 / G2 / G3 / G4 | its `tests/tallowWharf/w<n>.test.ts` + `tests/tallowWharf/shell.test.ts`; G2 also `tests/tallowWharf/sectors.test.ts` |
| D1 | `tests/tallowWharf/` (all; a graph-to-code text test may read the graph) + the validator runs above |
| S1 | `tests/shutterWiring.test.ts`, `tests/kit/shutter.test.ts`, `tests/kit/registry.test.ts`, `tests/kitNet.test.ts`, `tests/tallowWharf/shell.test.ts` |
| S2 | `tests/shutterNotice.test.ts`, `tests/kit/shutter.test.ts` |
| S3 | `tests/tallowWharf/{shell,w1,w4,sectors}.test.ts`, `tests/kit/shutter.test.ts` |

Laptop (every run `E2E_GPU=1`; `node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --suites "<list>" --set
<name> --requester "Night Shift | Campaign Build"`; the PR head's `affected-e2e` runs by itself):
- **PR G1:** affected (`src/world/maps/tallowWharf` -> `e2e-sectorops` all parts, `e2e-levels`, `e2e-anchors`) and
  explicitly `e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl e2e-sectorops:mission`.
- **PR G2:** the same set (E8 is in it).
- **PR S:** affected (`src/game/kit/` and `src/game/` -> `e2e-gadgets e2e-tactics e2e-takedown e2e-park e2e-coop
  e2e-sectorops`; `src/world/` -> `e2e-lightbake e2e-guard-carry e2e-levels e2e-anchors e2e-ctcourse`), the RULES gate
  for `src/game` (`e2e-coop e2e-netmove`, the checker passes only when green), and `e2e-sectorops:wharf-tgc
  e2e-sectorops:wharf-tkl e2e-sectorops:mission`.
- Every laptop failure gets an Opus triage agent at once (G319).

## 9. Checkers (one fix round per slice unless broken)
- **Plan:** one fresh Opus plan checker on both BRIEFs + this PLAN (`docs/templates/plan-check.md`): intent against
  Michael's words, gates, claims, sizes.
- **PR G1** (LP, G0, G1, G3): one fresh Opus checker (the batch fixes hard rule 2 / Q2 / Q3; Sonnet is not enough for
  the lighting judgement).
- **PR G2** (G2, G4, E8, D1, P1): one fresh Opus checker (forced gates, gate reach, the validator output, the pages
  against D1). A G2 FIX gets its fix round from Opus (RULES).
- **PR S** (S1-S4): two independent Opus checkers (AI behaviour and engine wiring); the lead offers one of the two to
  Guard AI Build (the R39 hook is theirs to accept); if Guard AI has no capacity within the hour, a second fresh Opus.
- Verdicts as commit statuses on the checked head (`context=checker`, "Opus PASS" / "Opus FIX").

## 10. Gates
- **J8 gate (FOLDED):** master's validator 0 ERR (map, map + TGC, map + TKL) and the mission-validator 0 ERR on the map
  (A22), saved under `docs/tallow-fixes/val/`; plan checker PASS; PR G1 / G2 checker PASS; laptop sets green.
- **J9 gate (FOLDED):** the e2e walks both shutters on both missions (no SKIP, no teleport) and the notice check prints;
  two Opus checkers PASS; laptop sets green.
- **Greybox exit (J23 runs it after J8, J9, J12, J13; VISION 5, level-design 14, RULES Intake 5):**
  1. Measured validator pass: J12 ports V6 onto master's mode profiles with the kit kinds and the mission-validator
     re-cut (no reward requirement, no `oneChance` / `window`); then GBM (`docs/missions/slices/GBM-brief.md`) on the final
     J8 / J9 geometry: `level-measure --write`, then `level-validate --require-measured` 0 ERR (vantage, LOS break, reach,
     split legs; the light band through light-realism L0's lux grid once Michael has clicked the band table). A geometry
     change after GBM makes it stale: J8 and J9 must be merged first.
  2. Bot route-runs: J13's gate run over Tallow's declared routes (route-runs PLAN R8; graph `area` is on all 37 spaces),
     pass = never stuck (Q7), detections listed for the walk card; needs J9's real shutters and live guards (forced moves
     stubbed or real per route-runs BRIEF Q1).
  3. The 10-minute walk card for Michael (orchestrator), items from section 12, including "changes since you approved
     the drawing" (Michael: "confirm changes").

## 11. Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `missions` (`?missions=1`, `src/core/flags.ts`) | off | Night Shift \| Campaign Build | set by the orchestrator after the Mission 1 walk | Michael accepts the Tallow walk items |
| `coopKit` (`?coopkit=1`; folding into Player's `kitMoves`, kit order item 7) | off | Night Shift \| Campaign Build | with the kit walk (Player's clips) | unchanged by J8 / J9 |
- No new flag. Every J8 change is Tallow data (the map is `unlisted` and boots only with `?missions=1`, `needsMissions`).
  J9's `ShutterDoors` and the notice run only where shutter specs exist (Tallow only); the lift is offered only with
  `coopKit`. Default players see nothing new.

## 12. Walk items (for the orchestrator's card; ranked by risk)
Until J22's lobby entry the walk opens by URL: `?autostart=tallowWharf&mode=sector&missions=1&coopkit=1&mission=threeGreyCoats`
(and `twoKeyLedger`), two players.
- Lights: every lamp works; dark only behind stalls, presses, chests and carts, where you cut a circuit or shoot a lamp;
  each switch is by its door - accept when no lit working space has a dark corner without a cause you can see.
- Throws: try to jump each gap alone and fail; the thrown partner unbolts the gate for the other - accept when no throw
  can be skipped solo and nobody is stuck on either side.
- Shutters: alone it will not open; one holds, the other crawls; a guard facing it comes to look - accept when both
  missions finish with no teleport.
- A downed partner across any forced gate is reached in time (within 15 s).
- Medkits (one per section) and hide spots by the takedown spots; the roof hatch is inside a tank room.
- The list of changes since you approved the drawing.

## 13. Hand-offs
- **Guard AI Build:** S2 review (one of PR S's two checkers); the route-runs cause record (G1) may add a "shutter"
  cause next to the door notice; G6 waits for J15's `lookouts` and pairs.
- **Marlow Build:** J12 must accept the kit kinds, keep gate reach on throws and pulls, and give spaces a light-type
  field (D1 uses `note` until then); the G157 level-design text (J8 plans to the adopted wording).
- **Sector Ops Build (light-realism):** LP uses research/bands.md as drafted; ask them for L3-H `tallow.md` or accept LP
  as its stand-in; S1 asks before any `lightField.ts` / `lampBake.ts` edit; L0's `lux-grid.mjs` feeds LM / GBM.
- **Player Build:** the `coopKit` fold changes the e2e URL params and the offer gate in `teamController.ts`; order it
  against S1 (section 4).
- **Orchestrator:** PR C split membership for G1 / G2 / S (C8 / C9 or new members); no `big-pr` needed for them.

## 14. Risks
- **Interiors become lit everywhere** (every working interior band reads 0.79 or more): stealth routes may lose their
  gaps. Mitigation: A1's closed spaces, cover, switches by doors, cut circuits and shot lamps; LP proves a shadow route
  per encounter; the PR G1 checker blocks a section whose declared routes lose their last real gap.
- **Forcing throws by geometry** depends on the solo carry numbers: G2 / G3 tests compute them from the game's constants;
  if the gap cannot sit between the solo carry and the throw band, the engine route (A4 undo) becomes an Opus slice.
- **Fall-ins after widening:** the lightwell drain and the lane keep a way out; G2's tests assert it.
- **Docs in two branches and TW23's move** (A20): B0 and TW23 come first; P1 follows TW23's paths.
- **e2e coordinates:** E8 travels with the geometry it follows (PR G2), S4 after E8.
- **Shutter light and nav** touch shared engine files: S1 stops and asks before a lighting-owner file; the nav block is
  map-local (only where specs exist).
- **CPU at 100%:** waves wait; full burn resumes when the orchestrator lifts the pause.
- **Provisional bands** may move after Michael's click: A2's re-tune is data only.
- **Asset licences:** a wrong licence is an IP and sale risk; FA keeps every candidate's URL and licence text reference,
  an Opus checker reads each licence before any import, and nothing downloads without the lead's go.

## 15. Open questions for the lead
1. B0 timing: merge `origin/feature/mission-framework` into the engine at J7 R0 (before J7 R1 edits the TGC / TKL
   graphs, fewer conflicts) or after J7 PR D (this plan's fallback)?
2. TW23: does it move Tallow's docs to their own folder, and when? P1's paths and the graph-reading tests follow it.
3. A1 (closed spaces lit by night lights only) reads Q2 "Never" narrowly; it sets the map's balance. Put it to Michael
   by day as a one-click, or keep it assumed and logged for his walk?
4. Bands: proceed on light-realism's draft table (A2) now, or hold the re-light until Michael clicks the S1 pack?
5. PR S checkers: will Guard AI Build take one of the two?
6. Kit-flag fold (`coopKit` into `kitMoves`) vs S1 on `teamController.ts`: which goes first?
7. PR C membership for G1 / G2 / S (the orchestrator's call).
8. Free assets (A23, slice FA): run the docs-only scouting list now (no download), and which prop families to price
   first (suggested: tea chests and crates, market stalls, the quay crane, barrows and carts, canal and market ambience)?

## 16. Briefs for the first wave (strict, self-contained)
Common lines (each brief goes to a fresh agent with `docs/systems/agent-preamble.md` from origin/master filled in):
- Lead "Night Shift | Campaign Build". Base: `origin/feature/tallow-fixes` (G0) or `origin/feature/mission-engine` after
  B0 (S1, S2). Worktree `C:/NightShift/Mobile-Coop-tallow-<slice>` on `feature/tallow-<slice>`; guard before every
  write: `cd /c/NightShift/Mobile-Coop-tallow-<slice> && test "$(git rev-parse --abbrev-ref HEAD)" = feature/tallow-<slice> && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-tallow-<slice>"`.
- Edit only the owned files. Commit and push each sub-step (`git add <files>`, never `-A`), prefix `tallow <SLICE>:`,
  ending with the attribution line the lead gives. Never merge, rebase, stash, reset or force-push.
- Checks: the CPU rule (GB-briefs 0.4), `npm run typecheck:fast`, `npx vitest run <files> --maxWorkers=2`, `npx eslint
  <files>`. No e2e, no full `npm run check`, no dev server; every command has a timeout.
- Hard rules that bite: hot paths allocate nothing (fixed-step loops: no closures, arrays, iterators or temporary
  vectors; `hyp2` / `hyp3`, never `Math.hypot`); Babylon only through `src/core/babylon.ts`; strict TS (`import type`,
  `noUncheckedIndexedAccess`); no `src/net` import from single player; hyphens, not em dashes; no reference-game names.
- Report (last message): commits, files, test counts, what you could not do, every deviation with its reason.

### Brief G0: shared Tallow data (Sonnet 5.5)
Owned: `src/world/maps/tallowWharf.ts`, `src/world/maps/tallowWharfKit.ts`, `tests/tallowWharf/shell.test.ts`. Do not
edit any section file (`tallowWharfW1-4.ts`), `tallowWharfSectors.ts` or `tallowWharfMissions.ts`.
Read first: CLAUDE.md hard rules; level-design 5.5 and 12.1 (medkit stations); light-realism research/bands.md sections
2 and 4 (`git show origin/feature/light-realism:docs/light-realism/research/bands.md`); `tallowWharf.ts` (all);
`tallowWharfKit.ts:100-160`; the campus map's theme (`src/world/maps/campusOps.ts`, its `theme` block) and how
`theme.ambient` / `theme.lightLevel` reach the light field (grep `lightLevel` and `ambient` under `src/world/`).
Do:
1. `tallowWharf.ts` theme: set `ambient` and `lightLevel` (and only those) to the campus theme's values, with a comment
   "night floors as the campus (Q2 'Never', G329; light-realism research 2 and 4): a cut circuit reads dark". If the
   campus has no direct equivalent of a field, stop and report it (do not invent a value).
2. `tallowWharfKit.ts`: add `medkits: { pos: Vector3; yaw: number }[]` to `WharfSection` with a doc comment (G98, "a wall
   station with a real reason"; hold 0.6 s, +40, single use, level-design 12.1); `emptySection` returns `medkits: []`.
   Every section file must still compile: add `medkits: []` to `W1`-`W4` only if TypeScript requires it, and say so in
   the report (the lead clears that one-line touch with the section slices).
3. `tallowWharf.ts` layout: `medkitWalls: SECTIONS.flatMap((s) => s.medkits)` (setup time, not a hot path).
4. `shell.test.ts`: the theme's two values equal the campus theme's; `builtWharf().layout.medkitWalls` equals the
   concatenation of the sections' `medkits`; every existing shell test passes unchanged.
Checks: `npx vitest run tests/tallowWharf/ --maxWorkers=2`; `npm run typecheck:fast`.
Done looks like: checks green; the diff touches the owned files (plus the reported one-liners, if any).

### Brief S1: shutter world wiring (Opus 5.5)
Owned: `src/world/shutterDoor.ts`, `src/world/world.ts`, `src/game/teamController.ts` (one call after the kit ticks),
`tests/shutterWiring.test.ts` (new). `src/game/gameState.ts` only if J7 PR F is already merged into your base (the lead
says), and then only the arming call site near `:793`. Do not edit `src/game/kit/shutter.ts` (S2 owns it), any map file,
`src/net/**`, `src/ai/**`, `src/world/lightField.ts` or `src/voxel/lampBake.ts`.
Read first: `src/world/shutterDoor.ts` (all), `src/game/kit/shutter.ts:1-130`, `:240-300`, `:400-430`, `:655-700`,
`src/game/kit/registry.ts:1-60`, `:140-180`, `src/world/world.ts:60-200`, `src/game/gameState.ts:690-800`,
`src/game/teamController.ts:110-140`, `:320-345` and its `fixedUpdate`, `src/world/doors.ts` (how door bodies arm and
how the nav treats a doorway), `src/world/lightField.ts:1-120`, `:410-450` (closed doors cut lamps), `src/voxel/lampBake.ts`
(what the bake treats as an occluder), GB-briefs 0.2 (`docs/missions/slices/GB-briefs.md` on the framework branch).
Why: TW2 / MF18 (VISION rule 3, G146): both shutters are stand-ins, so neither mission finishes; the curtains, their
bodies and their link to the kit devices are built but never constructed.
Do:
1. `World`: a `shutters: ShutterDoors | null` built in the constructor from `level` when `shutterSpecsOf(level)` is not
   empty; its `curtainMesh` added as a flashlight caster beside the door leaves; disposed with the world.
2. Arming after the nav grid: through the existing door-arming call (prefer a `World` method that arms doors and
   shutters, so `gameState.ts` changes at most one line; if `gameState.ts` is not yours yet, report the line for the lead).
3. Nav (A15): the guards' grid treats each shutter opening as closed (find how the grid is built from level boxes and
   doorways; the smallest change that makes the opening's cells unwalkable for guards only, map-local, built only where a
   spec exists). Players keep the opening (the crawl is kinematic).
4. Update: `TeamController.fixedUpdate`, after the kit `tick`s, calls `this.g.world?.shutters?.update(this.devices.list)`
   on host and client (no allocation; `update` already returns early with no mesh).
5. Light parity (A16): the closed curtain must stop lamp light in the gameplay field and on screen alike. Read how the
   bake builds occluders and how closed doors cut lamps; propose the smallest path (a bake-time occluder box at the
   curtain plane added by `placeShutter`, or an always-shut door-list entry). If either needs an edit to `lightField.ts`
   or `lampBake.ts`, stop and report the proposal; the lead clears it with Sector Ops Build first.
6. Tests (`tests/shutterWiring.test.ts`, pure, no scene): slots from specs; the nav cells over an opening are blocked for
   guards; the chosen light path reports the opening closed; a level with no specs builds nothing.
Checks: `npx vitest run tests/shutterWiring.test.ts tests/kit/shutter.test.ts tests/kit/registry.test.ts tests/kitNet.test.ts tests/tallowWharf/shell.test.ts --maxWorkers=2`; `npm run typecheck:fast`.
Done looks like: checks green; with S3's map swap a lone player cannot pass a shutter and a held one lets the partner
crawl (S4 proves it on the laptop); no change on any map without shutters.

### Brief S2: guards notice a held shutter (Opus 5.5)
Owned: `src/game/stealthSystems.ts` (a new private method and one call), `src/game/kit/shutter.ts` (one pure exported
helper, nothing else), `tests/shutterNotice.test.ts` (new), `tests/kit/shutter.test.ts` (only if a helper test fits
there). Do not edit `shutterDoor.ts`, `world.ts`, `teamController.ts`, `src/ai/**` or `src/net/**`.
Read first: DECISIONS G41 (doors noticed open), G44 (poor sight above), G143 (every detection explainable);
`src/game/stealthSystems.ts:20-40`, `:610-680` (`noticeOpenDoors`, `fixedUpdate`); `src/game/kit/shutter.ts:20-30`,
`:80-160`, `:270-295`; Player conformance R39 (`git show origin/master:docs/conformance-player/CONFORMANCE.md | grep -n R39`).
Why: R39 / J9: a held-open shutter is invisible to guards today; G41 makes guards notice a door open that should be shut.
Do:
1. `shutter.ts`: `export function shutterNoticedBy(d: ShutterDevice, ex: number, ey: number, ez: number, yaw: number):
   boolean`: true when `d.visible`, the guard is within `SHUTTER_NOTICE.range` of `shutterNoticePoint`'s x / z (use
   `hyp2`), within 1.5 m of the shutter's floor height, and facing it (`(sin(yaw) dx + cos(yaw) dz) / dist >=
   SHUTTER_NOTICE.cos`, the door rule, `stealthSystems.ts:633-634`). No allocation (a module-level scratch point).
2. `stealthSystems.ts`: `private noticeOpenShutters(): void` called from the same timer as the door notice (every
   `DOOR_NOTICE_EVERY`), host only (where the door notice runs), only when `g.team.devices.list` has a visible shutter.
   For each visible shutter whose `opens` count differs from the last one noticed (a per-device number kept in a Map
   keyed by device id, built lazily once per device): the first calm, alive guard that passes `shutterNoticedBy` and
   `g.ballistics.clear(eye, noticePoint, MASK.SIGHT)` (reuse the preallocated `noticeA` / `noticeB`) calls
   `e.hear(x, z, SHUTTER_NOTICE.range + 2)`; record that opening as noticed. A comment cites G41, R39 and A18.
3. Tests: `tests/shutterNotice.test.ts` for the helper (in range and facing; behind; too far; another storey; closed;
   `visible` false) and for the once-per-opening rule (a small pure function or the Map logic exported for test).
Checks: `npx vitest run tests/shutterNotice.test.ts tests/kit/shutter.test.ts --maxWorkers=2`; `npm run typecheck:fast`.
Done looks like: checks green; the door notice code path unchanged; with no shutter devices the new method returns after
one length check.

## Lead answers to the open questions (Campaign Build, 2026-10-25 ~19:10)
1. B0: merge origin/feature/mission-framework into the engine at J7 R0 (fewer conflicts with J7 R1's graph edits).
2. TW23 (running now, feature/tallow-spec, stacked on #372) moves the Tallow spec into the map's own folder; P1 and the
   graph-reading tests follow TW23's paths once it lands (re-pin in P1's strict brief).
3. A1 (narrow reading of Q2 "Never"): stays assumed and logged; sent to the orchestrator as a one-click question for
   Michael by day. Build to A1 meanwhile; undo per A1.
4. Re-light now to light-realism's draft table (A2, provisional); re-tune when Michael clicks the band table.
5. PR S keeps two Opus checkers of ours; one is offered to Guard AI Build through the orchestrator, not blocking.
6. teamController.ts: the kit-flag fold (coopKit into Player's kitMoves, orchestrator order ~18:30) goes first; S1 after.
7. PR C split membership: the orchestrator's call.
8. FA: docs-only scouting list may run after the plan check passes, lowest priority; no download without the lead's go.
