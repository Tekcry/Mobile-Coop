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

**Fix round 2** (Opus planner, 2026-10-25 ~21:30): answers plan check 2 (`C:/NightShift/scratch/campaign/j8-j9-plan-check2.md`,
fixes 1-4, polish 1-9) with Michael's ~20:45 answers (M1, M2) and the lead's rulings; the map of fix -> answer is the
last section. Refs re-read: engine d31a6e364 (code unchanged for every file:line here); origin/master 4e5e99593
(`level-validate.mjs` unchanged since 94e72b1c); `origin/feature/validator-port` 10b613dd3 (J12 A27, the long-throw
exception); framework 67464e03 (#372 BRIEF M6). Read-only node runs of master's validator from a `git archive` extract;
outputs, the variant script and the draft graphs in `C:/NightShift/scratch/campaign/j8-j9-val/fix2/`.

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
- ~20:45 (native multiple choice; ROADMAP "Decided"): closed Tallow rooms -> "Yes, night lights only (Recommended)"
  (**M1**, replaces A1); forced-throw gaps -> "Mix of both" (**M2**): C4 pawn loft -> reading room and C5 arcade roof ->
  W3 roof get the longer throw (5.8 m over a 4.9 m gap, a level-standard exception at those two spots only); C4 pie
  loft -> clock loft gets the plank bridge later (G403, after Player Build's kit move) and stays a 2.5 m standard throw
  meanwhile.
- ~20:25 (#372 BRIEF **M6**, framework 67464e03): Teale knocked out before he talks = a section restart with Teale at
  his table, not a rule break.
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
| 1 | Built for two: no area done alone; at least one teamwork climb per mission | the 2.5 m throws are solo-jumpable (TW17) | J8 TD (per-site throw length, M2 / A24) + G2 / G3 (4.9 m gaps at C4 pawn and C5, A28); C4 pie: the plank bridge later (G403, A13), not yet forced, its bypass into the reading room closed (A29) |
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
    links to 4.9 m adds one ERR `gap 4.9 m above the 2.7 m throw` per widened link until J12's long-throw exception
    lands (A22).
  - **Rerun in fix round 2** (master 4e5e99593 extract; `scratch/campaign/j8-j9-val/fix2/`, `var.cjs`): with M2 (graph
    links 28 and 33 at width 4.9 with `exception: "long_throw"`, a field master ignores; the pie link 29 at 2.5; the
    clock-mender's door link 30 removed, A29): **5 ERR** = the 2 named throw-gap lines + the 3 split ERRs, no new gate
    reach or solo-bypass ERR (`master-4e5e9959-fix2-m2.txt`). With D0's proposed defaults (section 6 D0, modelled as
    `time_s` numbers): **2 ERR** (the 2 named throw-gap lines only) on map, map + TGC and map + TKL
    (`master-4e5e9959-fix2-defaults*.txt`).
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
  (`tallowWharf.ts:80-81`), above the campus night floors (moon 0.104, standby fill 0.14, light-realism research
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

  | Landing vs take-off | -3.9 m (arcade roof 8.4 -> a 4.5 stage) | -2.4 m | -2.0 m | -1.0 m | -0.5 m | 0 (all three throw spots today) | +0.5 m | +1.0 m (`throwDrop` limit) |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | `soloTopLandingReach` (land on the top) | 4.88 | 4.41 | 4.26 | 3.86 | 3.63 | **3.36** | 3.03 | 2.56 |
  | `soloJumpReach` (in-air grab of a lip at the landing top) | 5.80 | 5.41 | 5.29 | 4.98 | 4.82 | **4.64** | 4.44 | 4.23 |

  The 2.6 m most a standard throw clears never beats the grab model, and beats the top model only at +1.0 m by 0.04 m.
  So geometry alone (check option (a)) cannot force the throws at any height the throw allows, approved or not: the
  per-site throw length (A24, slice TD) is the mechanism (lead ruling, fix 1 (b)). **Fix round 2 (check fix 2):** the
  repo's threat helpers cannot see the cases that matter here: `soloTopLandingThreats` and `soloJumpThreats` skip every
  top at or above the target (`t >= q.top - 0.05`, `t >= g.y - 0.05`, `tests/helpers/soloJumpReach.ts`) and every
  `noLedge` top over the mantle (all of W2 is `noLedge`), and their flight check counts a 1.1 m parapet or railing as a
  block though it is under `vaultMax` 1.25 (`scripts/kestrel/facts.json` F04). Every throw site is level, and the
  near-side surfaces that threaten it are level or higher (the arcade roof 8.4 over the 4.5 pawn stage: 4.88 m on top,
  5.80 m by a grab; a bridge roof ~2.4 m over the stage: 4.41 / 5.41 m), so the level-and-drop check (G0, section 6)
  is the test.
- **The pie gap under M2** (check fix 1): the pie throw stays 2.5 m, so a lone player jumps it (3.36 m solo reach) into
  the clock loft; the clock-mender's door is bolted on his side (`W2_BOLTS` slot 2, `side: [1, 0]`,
  `tallowWharfSectors.ts:213`; graph link 30 `w2-reading-room -> w2-clock-loft`, `bolted`), so it opens from the clock
  loft and he walks into the reading room without the pawn throw. The validator cannot see it (`team_throw` is co-op
  whatever the gap). A29 closes it. Teale's spook point is in the clock loft (`tallowWharfMissions.ts:75`
  `bolt: [65, 4.5, 76.75]`), but the spook despawns and respawns him there (`sectorMission.ts:163`, `:601-602`): he
  never walks the door. No mission, e2e or test reads a W2 bolt flag by number (`sectorMission.ts:252` polls by index
  only; grep of `tallowWharfMissions.ts`, the TGC / TKL graphs and the wharf e2e finds none).
- **The C5 fire-escape deck** (found in fix round 2): the counting house's fire-escape bridge deck (W2 half x 76-82,
  z 68.6-69.8 at 8.4, `tallowWharfW2.ts:213-216`) is open at its W2 end and its gate is at the W3 end (x 82,
  `tallowWharfW3.ts:127-128`), so a lone player walks it to within about 1.1 m of the C5 stage (z 64.5-67.5), behind
  a 1.1 m railing he can vault. A28 cages it.
- **Hide spots** two per section (`W1.ts:172`, `W2.ts:252`, `W3.ts:303`, `W4.ts:207`); none in w3-east-yard or
  w3-east-wing (TW14). **Medkits**: no `medkitWalls` (TW15; `MapLayout.medkitWalls`, `src/world/mapDef.ts:69`, read at
  `src/game/gameState.ts:835`, `:1009`). **Roof ladder**: `b.ladder(72, 66.15, LOFT, ROOF, 0)` up a hatch in the let
  corner loft (`tallowWharfW2.ts:204`; TW22, level-design 16.2.1 / 16.2.3). **Graph drift** (TW21): graph counts W1 7 /
  W2 6 against 9 / 10 spawned (`tallowWharfSectors.ts:105-141`, `:187-194`), the w3-east-yard checkpoint tag (graph
  :321) against the build's W3 restart at the roof bulkhead head, dog rows (J7 R3 turns them into armed humans; J7 A11 in
  `docs/mission-rules/BRIEF.md`: J8 owns geometry, lights and the pages). Bolts: `W1_BOLTS` .. `W4_BOLTS` (`tallowWharfSectors.ts:205-230`; indexes fix the flags
  `<id>-bolt<k>`, so new bolts append). Routes: `tallowWharfSectors.ts:245-301`.
- **Section restart and kit devices** (check fix 4): `SectorMode.restartSection` (`sectorMode.ts:1182-1215`) re-bolts
  the section's team doors (`this.team.reset`, `SectorTeamDoors`, `sectorTeamDoors.ts:213`), rekeys, resets guard memory
  and calls `g.checkpointReset()`; nothing resets kit devices (`TeamController.devices`), so a held shutter stays up
  into the retry. The fix is J9's (A27, S1 / S2).
- **e2e coordinates**: the wharf e2e hard-codes the pawn-loft throw (`:335`, stage `[49, 72.5, 52, 73.5]`) and the jetty
  pull (`:465`): J8's geometry moves them.

## 3. Assumed decisions (A-n, each with its undo)
Overnight rule (RULES Intake 2): logged, work carries on. Michael answered the two day-time questions at ~20:45 (M1
replaces A1; M2 settles A24's approval at two named spots, section 0).
- **A1 -> M1 (Michael ~20:45, "Yes, night lights only (Recommended)").** Every fitting is on and working at the start
  (no `on: false`, no dead fitting). A space that is closed tonight (pie shop, clock loft, corner loft, shed two,
  strongroom, the shut shops) is lit only by the fittings a real site leaves on at night (emergency bulkheads, stair and
  security lights, a desk lamp someone left on), never by a working fitting switched off; a space someone works in
  tonight is lit to its band. Darkness comes from cover (stall backs, presses, tea chests, carts), the real gaps between
  fittings, cut circuits and shot lamps. Michael's answer, not an assumption: changing it is his call.
- **A2 Provisional bands.** Until Michael clicks the light-realism S1 pack, J8 lights to light-realism's draft table
  (research/bands.md section 3) through the space-type map in section 6 LP; the bake is measured against the approved
  table at greybox exit (J23 / GBM, with light-realism L0's `lux-grid.mjs`). Undo: a data-only re-tune per section when
  the approved table differs.
- **A3 Night floors.** Tallow's theme ambient and night floor match the campus night floors (moon + standby fill), so a
  cut circuit reads dark (light-realism research section 4). Undo: restore `ambient 0.3` / `lightLevel 0.3`.
- **A4 Forced throws (Q23; fix round 1, lead ruling fix 1 (b); fix round 2: M2).** Geometry alone cannot do it
  (section 2 table). **Two** Tallow throw sites (M2: C4 pawn loft -> reading room, C5 arcade roof -> W3 roof) carry their
  own throw length (A24, slice TD). The C4 pie loft -> clock loft throw stays a standard 2.5 m throw (3.2 m, no site)
  until the plank bridge replaces it (G403, A13): **not yet forced**, flagged so in its test and on the walk card, its
  bypass into the reading room closed meanwhile (A29). Each site's length is **5.8 m**, so the gap it clears is **4.9 m** (thrower 0.4 m back from the take-off edge, landing feet 0.5 m onto the stage: 0.4 + 4.9 + 0.5 =
  5.8). At these level sites that beats `soloTopLandingReach` 3.36 m by 1.54 m and `soloJumpReach` (in-air grab) 4.64 m
  by 0.26 m, both over the 0.2 m margin, so the throw stays forced even if a grabbable lip slipped in; the landing edges
  stay `noLedge` too (belt and braces). The site's host band is its length +-1 m (4.8-6.8 m) and the height limit stays
  `TEAM.throwDrop` 1.0 m. No approved height changes; the gaps widen in plan (A28). A fall-in keeps its way out (the
  lightwell drain, `tallowWharfW2.ts:295`; the lane at street level). Undo: drop the two site lengths (the throws go
  back to 3.2 m) and restore the 2.5 m gaps: TW17 reopens (solo-jumpable), so the undo needs another forcing first.
- **A5 Way backs as Michael's "locked pathway" (fix round 1: enclosed, gate at the approach end).** Each C4 way back is
  an enclosed iron footbridge (solid sides to the head and a roof, `noLedge`, no top or lip a lone player can stand on or
  hang from) along a lightwell end (west x ~44-45.5 for the pawn throw, east x ~68.5-70 for the pie throw). Its gate is
  at the **south (approach) end**, bolted on the bridge side: the thrown partner walks back along the bridge and
  unbolts it for the thrower (G292's own example), it stays open (level-design 11.6), the walk is 12 m or less (draft
  9 m: 3 s at `reach_speed_mps` 3.0, under the 15 s reach), and from the south loft it is shut, so the throw stays
  forced. Graph: a `door` link `from` the south loft `to` the north room, `bolted: true` (a lone player passes only from
  the `to` end, `level-validate.mjs:225-227`), width 1.2 (1.0 gives a nav WARN). With A25 this clears both C4 reach ERRs
  (draft run, section 2). Fix round 2: both bridges stay under M2. The east one is the pie throw's way back while that
  throw is a standard 2.5 m `team_throw` (the 28.2 s reach ERR returns without it) and serves the plank bridge later.
  Undo: a drop or a kicked-down ladder instead.
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
- **A13 No new kit moves on Tallow in J8 / J9; the plank bridge comes later (M2).** The five new moves, the shoulder
  stand and rope descent are not added to Tallow in J8 / J9 (approved as drawn; C6 stays gone). The one exception is
  scheduled, not built here: the plank bridge at C4 pie loft -> clock loft (M2, G403) comes to Tallow after Player
  Build's J24 plank move is on the engine, as slice **PB** (section 6): owner Night Shift | Campaign Build; files
  `tallowWharfW2.ts` (the pie-half lightwell width, the plank's two seats, the clock door back to a bolt if the BEATs
  still want that route), `tallowWharfSectors.ts` (`W2_BOLTS`), campaign-map `graph.json` (link 29 from `team_throw` to
  the plank kind, the clock door link back as `bolted`), `tests/tallowWharf/w2.test.ts` and `sectors.test.ts`; it
  needs the validator's plank kind (`plank_bridge`) from Marlow Build (J12 A25; in TV's place, section 6) and Guard
  AI Build's "guards notice it" hook (a laid plank seen as a way left open, as G41 does for doors). Undo: a later Tallow
  pass after the walk.
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
- **A20 One copy of the map docs (fix round 1, lead rulings).** B0 (J7 A20): Campaign Build merges `origin/feature/mission-framework`
  (#372) into `feature/mission-engine` at **J7 R0** (GB-briefs 0.3 step 1 pattern); R0 also takes the optional-objective
  rewards out of `tallowWharfMissions.ts` (Q19). **Done** (fix round 2, polish 7): 925fa3784 (the merge) and e4eace3bd
  (Q19, no optional rewards), so D0 now waits only for J7 PR D and B0b. So the engine carries the newest graph (gap 0.9), SPEC and pages, and
  J8 / J9 edit them there. TW23 (`feature/tallow-spec` d42d1596, stacked on #372) does **not** move the graph: it adds
  `docs/tallowWharf-map/SPEC.md` (the current spec on the template) and a pointer line on
  `docs/missions/prototypes/campaign-map/SPEC.md`; `graph.json`, `PLAN.svg` and `SIGNOFF.md` stay in
  `docs/missions/prototypes/campaign-map/` (TW23 report A2), so `tests/tallowWharf/helpers.ts:66` keeps its path. When
  TW23 merges into the framework branch after B0, Campaign Build runs **B0b**, a second framework -> engine merge; D0's
  and D1's graph edits and P1's SPEC edits wait for whichever merge brings TW23 in, so no two branches edit
  `graph.json` or the SPEC at once. Undo: J8 docs on a branch off master after #372 merges.
- **A21 Stacking.** J8's PRs (T, G1, G2) and J9's PR S are PRs into `feature/mission-engine` (as J7's D / E / F, J7 A14 and
  J7-PLAN section 4); they reach master through the PR C split (`docs/missions/slices/PRC-split.md` C8 / C9 or new members). A
  fix round on an earlier PR is merged forward into the later branches by the lead, as J7-PLAN section 4 does for D ->
  E -> F; PR C's gate is J7's (its two fresh Opus checkers and the union of suites on the head after the last merge).
  Undo: retarget them to master after PR C merges (the orchestrator's call).
- **A22 J8's validator gate.** 0 ERR on master's `scripts/level-validate.mjs` (map graph, map + TGC, map + TKL) and 0 ERR
  on the mission-validator for the map graph, each run as the conformance ran them (extracted with git, plain node). The
  one exception (fix round 2: two lines, M2), until J12's long-throw exception lands (`origin/feature/validator-port`
  10b613dd3 A27, slices S7a / S7b): `link w2-pawn-loft -> w2-reading-room (team_throw): gap 4.9 m above the 2.7 m throw`
  (graph link 28, C4 pawn loft -> reading room) and `link w2-arcade-roof -> w3-roof (team_throw): gap 4.9 m above the
  2.7 m throw` (link 33, C5 arcade roof -> W3 roof), listed by name in the saved output. Both links carry
  `exception: "long_throw"` and `width` 4.9 (J12's cap is the 4.9 m gap, not the 5.8 m throw); once S7a / S7b are in
  the validator D0 / D1 run, they pass as INFO and the gate is 0 ERR with no exception. The pie link 29 is a plain
  2.5 m `team_throw` with no `exception` and no ERR. Link numbers are 0-based on today's graph (master and engine
  alike, checked in fix round 2); D0 deletes link 30 (A29), so the C5 link becomes 32: J12 matches a spot by
  `tallowWharf:<from>><to>`, not by number, so nothing breaks, and D0's saved note gives the new number. V6 cannot read the kit kinds until J12: not a J8 gate. Undo:
  J12's ported validator once on master.
- **A23 Free assets come after the greybox gates.** J8 / J9 stay greybox (`detail: false`): no external asset enters
  them. Free props and dressing (tea chests, stalls, crane, shutter curtain, barrows, lamps' fittings, canal sounds) are
  planned as slice FA (section 6): a scouting list with licence checks first, then an import slice only after the
  greybox exit and the lead's go for each download (RULES "A job": ask before installing or downloading). Undo: build
  the props in-repo as today.
- **A24 Per-site throw length ("tallow-fixes A24" when it goes to the orchestrator, not #372's A24; fix round 1, lead
  ruling fix 1 (b); fix round 2: M2).** Michael's M2 is taken as his approval of the longer throw at the two named spots
  only (C4 pawn loft -> reading room, C5 arcade roof -> W3 roof); the pie spot is not covered (plank, A13). The
  scale-sheet row's new wording goes to Michael with the walk card (lead ruling), not taken as approved by M2. TV
  (Marlow Build) is unblocked: J12 A27 builds it as a per-link `exception: "long_throw"` with a 4.9 m gap cap at
  exactly those two spots (section 6 TV). The map layout may list throw sites (thrower spot, facing,
  length); a throw offered within 1.0 m of a site and launched within ~25 degrees of its facing lands the site's length
  past the thrower, and the host's landing band follows it (length +-1 m). Everywhere else, and on every map without
  sites (Marlow Yard, the campus, the rest), the throw stays `TEAM.throwDist` 3.2 m: nothing changes there. No wire
  change (both peers build the same map). The standard side is Marlow Build's (J12 A27): the scale sheet keeps "Throw
  gap: at most 2.7 m" for every link and gains a section 3 row "Long throw (named spots only)", a gap of at most 4.9 m
  (the 5.8 m throw that crosses it recorded in the row) at `tallowWharf:w2-pawn-loft>w2-reading-room` and
  `tallowWharf:w2-arcade-roof>w3-roof`, read by the validator from a link's `exception: "long_throw"` (the earlier
  `throw_dist` link field is dropped: the game's length lives in the layout, the validator needs only the gap). The
  sheet says "a change needs Michael's approval": M2 approves the two spots, and the row's exact wording goes to him on
  the walk card. Its line "Never change the player to fit a map" is met in spirit: the player's throw is unchanged, the
  site carries the length, as a ladder carries its height. Undo: remove the sites from Tallow's layout (one line) and
  the sheet row; A4's undo applies.
- **A25 The reading room's stair-head door (fix round 1).** The public stair from the arcade ends at a landing door with
  a push bar on the reading-room side only: locked from the stair at night, members leave by it (an exit that opens from
  inside, G157 10). Without it a lone player walks up the stair and over an A5 bridge into the south lofts, round C3
  (validator ERR, section 2). Guards still use the stair (their keys; the guard nav is not changed). TGC's Eyes still
  watches "the stair" for guards and decoys (BEAT step 3). Graph: the `open_stair` link `w2-arcade -> w2-reading-room`
  gets `bolted: true`. Undo: unbolt it and drop the A5 bridges (the 20.0 s / 28.2 s reach ERRs return).
- **A26 `missions` flag switch-on date: 2026-10-27** (fix round 2, lead ruling polish 1: the date `flags.ts:68` and
  J7's flags row already carry), after Michael's Tallow walk; switched on only when he accepts the walk items (RULES
  "Walk pacing"). Owner: Night Shift | Campaign Build. J8 / J9 edit neither copy: J7's owner (Campaign Build, the PR
  with R1-R2) edits `flags.ts:68` and the orchestrator edits the ROADMAP row, both when the walk date moves. Undo: move
  the date (those two copies, this row, PR bodies); the flag stays off until he accepts.
- **A27 A section restart puts the shutters back (fix round 1, check fix 4).** On a section restart every shutter drops
  shut, any lift run ends and the "already noticed" marks are cleared, on host and client, as the team doors re-bolt (a
  clean retry). Undo: remove the reset call (shutters keep their state across a restart).
- **A28 Where the gaps widen (fix round 1; fix round 2: M2 and check fix 2).** The rule, by height: **no
  solo-standable top within its own reach + 0.2 m of a forced stage** (section 2 table: level 3.56 m; a top 0.5 / 1.0 /
  2.0 / 2.4 / 3.9 m above the stage 3.83 / 4.06 / 4.46 / 4.61 / 5.08 m on top; by an in-air grab 4.84 m level and
  6.00 m from 3.9 m up wherever a stage edge is not `noLedge`, so every stage edge stays `noLedge`), proved by the G0
  level-and-drop check. A parapet or railing a player can vault (up to `vaultMax` 1.25) is no block; a block is a
  `noLedge` screen at least 1.9 m over the take-off (over `mantleMax` 1.8) and thinner than `climbDepth` 0.38.
  - C4 west half only (M2): the pawn loft (x 44-54) is cut back from z 62-70 to z 62-67.6 (take-off edge z 67.6, the
    stage z 72.5: 4.9 m); the north range does not move (the reading room keeps its 6.5 m short side, storage class).
    The arcade roof over the pawn loft (8.4, 3.9 m over the stage) ends at **z 67.4 or less** (4.88 + 0.2 = 5.08 m from
    the stage), the strip to the loft front narrower than `climbDepth` and `noLedge`; or, if LP keeps the roof edge at
    z 67.6, a 1.9 m screen on it. The A5 west bridge's roof (x 44-45.5, about 3.5 m from the stage) is either out of
    every solo reach (the arcade roof's screen or step-back stops anyone dropping onto it) or at least its reach + 0.2
    from the stage: G2's brief picks, the check proves it. Any lower roof over the ground rooms below the cut-back is a
    glazed lightwell roof, `noLedge`, no top.
  - C4 east half (pie loft, x 56-66): keeps z 62-70 and its 2.5 m gap until PB (A13). Its width is then chosen with
    Player Build's plank length: it must beat solo reach by 0.2 m (over 3.56 m level, over 4.84 m unless the edges are
    `noLedge`) and be shorter than the plank.
  - C5: the lane gap widens to 4.9 m on one side, LP picks by the tests: the arcade roof's lane edge steps back to x 77.1
    (thrower x 76.7, landing x 82.5), or the W3 corner-bay roof edge moves east to x 84.4 (stage x 84.4-86.5, landing
    x 85.0); either way the fire-escape bridge over the lane lengthens to match. **The fire-escape deck becomes a cage**
    (found in fix round 2, section 2): solid `noLedge` sides from the deck to about 2.2 m and a roof (its top over
    `mantleMax` above the arcade roof, so nobody climbs onto it), as the A5 bridges; its gate stays at the W3 end and
    opens from the counting-house side only, so a lone player in the cage reaches nothing (the graph's `door` link
    `w2-arcade-roof -> w3-roof` is unchanged: `bolted`). Under option 1 the runner (about x 75.1) stands inside the x 76 parapet break
    (z 64.5-67.5); LP confirms the run-up is clear of the roof hatch (x 71.4-72.6).
  - Heights stay as approved. These go on the walk card as changes since the drawing (A12). Undo: per A4.
- **A29 The clock-mender's door is locked from both sides until the plank (fix round 2, lead ruling fix 1).** Story: the
  clock-mender is out tonight and has locked his door behind him. Closes the M2 bypass (section 2: a lone player jumps
  the 2.5 m pie gap and walks through the clock door into the reading room). Build (G2): the leaf at (60, 4.5, 76.75)
  becomes `doorIn(b, false, 60, 76.75, LOFT, { locked: true, breachable: false })`, a plain locked door with no
  "Unbolt" item; `W2_BOLTS` slot 2 (the clock door's bolt) leaves the list with a comment line in its place (A29,
  G403: PB puts it back), so slots 3-4 become 2-3 and `sectors.test.ts:469-472` take the new counts and indexes (no
  mission, e2e or test reads a W2 bolt flag by number, section 2); `W2.doors['w2-clock-door']` stays for PB. If the
  builder finds a locked, non-breachable door still opens to a lone player by any action (a breach, a key), it stops and
  reports (fallback: the doorway walled up, the door kept as dressing). Graph (D0): link 30 `w2-reading-room ->
  w2-clock-loft` is deleted (the validator has no "locked both ways") and the clock loft's `note` says why and that PB
  restores it; the clock loft keeps its way back by the east bridge. Teale's spook point stays in the clock loft (he
  respawns there, `sectorMission.ts:163`; the BEAT owner is told, section 13). Test (G2): with every bolt shut and the
  clock door locked, `soloNav` from the pie loft (and from the clock loft) does not reach the reading room. Undo: PB
  restores the clock-side bolt and link 30, only once the plank forces the pie gap.

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
  - tests/tallowWharf/{shell,w1,w2,w3,w4,sectors,levelGap}.test.ts
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
  knock-out before he talks is a section restart with Teale at his table, not a rule break: Michael's M6, #372
  `docs/missions/BRIEF.md` on framework 67464e03, already in the TGC BEAT :22-25); no rule text there is rewritten.
- Not claimed: `src/world/lightField.ts`, `src/voxel/lampBake.ts` (Sector Ops lighting; S1 asks before touching, section
  6), `src/ai/**` (Guard AI), `src/net/**` (A19), `src/game/sectors.ts`, `src/game/modes/sectorMode.ts`,
  `tallowWharfMissions.ts` (J7), `scripts/level-validate.mjs`, `scripts/mission-validate.mjs`, `docs/level-design.md`,
  `docs/design/scale-sheet.md` (Marlow Build: J12, the G157 fold, and TV for A24; the scale sheet's light rows are
  light-realism L5's).
- Overlaps with J7 (same lead, so never at the same time; section 5 orders them): `tallowWharfSectors.ts`,
  `tests/tallowWharf/sectors.test.ts` (J7 PR D R3); `scripts/e2e-sectorops-wharf.mjs` (J7 PR E R7, PR F R8);
  `gameState.ts` (J7 PR F R6: hud-guidance B4's hook, `NetAttachment.objectiveLines` and `GameState.objectiveLines`
  :1244-1252; S1's two `gameState.ts` lines are the arming call and `checkpointReset`, other hunks, after PR F). The kit-flag fold (framework STATE item 7: after Player's coop-kit part 1, the kit branch
  `feature/mission-engine-flg-gb6` folds `coopKit` into Player's `kitMoves` and adds wire kind `stand`, touching
  `teamMoves.ts` and `teamController.ts:784`; Campaign Build merges it into `feature/mission-engine`): order on
  `teamController.ts` is fold, then TD's hunk, then S1's hunk; on `teamMoves.ts` fold, then TD (section 5).
- **claims-check** (fix round 2 rerun on the final blocks above, polish 5; master 4e5e99593's
  `scripts/claims-check.mjs --plan <block> --name <branch>` from a read-only extract, against 46-48 open PLANs with
  claims; J7's `docs/mission-rules/PLAN.md` now has a block and is compared; the engine's has none):
  - J8 (`feature/tallow-fixes`): 15 overlaps. `TESTING.md` only (one checklist line each; the train settles it) with
    hud-guidance and its a1 / a2 / a3 / b / b1 / b2 / b3 slices, map-ready, sector-batch, sector-marks, sector-marks-b1;
    and J7 (`mission-rules`, `-r1`, `-r3`) on `tallowWharfSectors.ts`, `tests/tallowWharf/sectors.test.ts`,
    `scripts/e2e-sectorops-wharf.mjs`, `TESTING.md`: same lead, ordered in section 5 (J7 PR D / E / F first).
  - J8 PR T (`feature/tallow-throw`): 2 overlaps, `origin/feature/coop-kit` (Player's J24) on `src/game/teamMoves.ts`,
    `src/game/teamController.ts`, `tests/teamMoves.test.ts`; `origin/feature/player-hygiene` on `teamController.ts`.
    No `src/world/world.ts` (the round-1 output's map-ready line came from an older block). Player Build owns team
    moves: Campaign Build tells it before TD starts (section 13) and TD keeps to the throw functions; the train settles
    hunks.
  - J9 (`feature/tallow-shutters`): 21 overlaps. `src/game/gameState.ts` with char-shadow-meter (+ s3), coop-kit,
    hud-guidance (+ a1, a2, a3, b, b1, b2, b3), map-ready, mission-rules (+ r1, r2, r3), player-batch-j19, sector-batch,
    sector-marks (+ b1); `src/game/teamController.ts` with coop-kit and player-hygiene; `src/world/world.ts` with
    map-ready; `src/game/stealthSystems.ts` with player-batch-j19; `docs/systems/coop.md` with coop-kit and J7; the
    wharf e2e and `TESTING.md` with J7 (ordered, section 5). S1's `gameState.ts` change is one call line; S2's `stealthSystems.ts` change is one new
    private method and one call: the lead tells Player Build (j19) and the orchestrator before PR S opens.
  - Outputs: `C:/NightShift/scratch/campaign/j8-j9-val/fix2/claims-*.txt` (round 1's in the folder above).

## 5. Branches, PRs and order
| PR | Branch (base) | Slices | Counted lines (est) | Starts when |
| --- | --- | --- | --- | --- |
| T | `feature/tallow-throw` (base `feature/mission-engine` after B0) | TD (TD-a, TD-b), FT | ~250 | TD-a at once (never while the kit-flag fold edits `teamMoves.ts`); TD-b after the fold is merged into the engine |
| G1 | `feature/tallow-fixes` (base `feature/mission-engine` after J7 PR D is merged into it and B0 / B0b, A20) | LP, D0, G0, G1, G3, FG1 | ~1,030 (+ docs; fix round 2: the level-gap check, the gallery ladder, the TKL route line) | J7 PR D merged |
| G2 | `feature/tallow-fixes-2` (base PR G1's branch; the lead merges TD-a's branch in before G2 starts) | G2, G4, E8, D1, P1, FG2 | ~1,080 (+ docs; fix round 2: A29, the cage, W3 guard 1) | G2 / G4 with G1 / G3 once TD-a passes its unit checks; E8 after J7 PR F is merged into the engine |
| S | `feature/tallow-shutters` (base `feature/mission-engine` after J7 PR D; the lead merges the engine in again before S3 / S4) | S1, S2, S3, S4, FS | ~1,000 | S1 / S2 at once (S1 without its `teamController.ts` hunk until the fold, and without its `gameState.ts` line until J7 PR F); S3 after PR G2 merges into the engine; S4 after S3, E8, J7 PR F and the fold |
- Order on shared engine files (lead answer 6, fix round 1): `teamController.ts`: the kit-flag fold (on
  `feature/mission-engine-flg-gb6`, merged into `feature/mission-engine` by Campaign Build; framework STATE item 7),
  then TD-b, then S1's hunk. `teamMoves.ts`: the fold and TD-a never at the same time (the lead orders them; TD-a touches
  only the throw functions). PR T merges into the engine before PR G2 (G2's tests read the site length).
- Worktrees `C:/NightShift/Mobile-Coop-tallow-fixes` and `C:/NightShift/Mobile-Coop-tallow-shutters`; parallel slices
  in `C:/NightShift/Mobile-Coop-tallow-<slice>` on `feature/tallow-<slice>` (the lead creates them with a node_modules
  junction and merges them back; agents never merge).
- Merge into the engine: after checker PASS + green laptop, the lead merges T, then G1, retargets G2 to
  `feature/mission-engine` and merges it, then S (A21). None enters a train alone; PR C carries them. No `PROTOCOL_VERSION` or `SAVE_VERSION`
  change in any of them.
- G1 and G2 are split so each PR moves only the e2e coordinates it changes: G1 (W1, W3) leaves every e2e coordinate where
  it is; G2 (W2 throw stage, W4 jetty) carries E8, the e2e that follows them.

## 6. Slices
Model rule (RULES "A job", G302): Opus for engine / AI / `src/net` and every brief; Sonnet builds greybox data, tests and
wiring from strict Opus briefs; Haiku chores. Sizes are changed lines counted by `pr-size` (docs not counted).

| Id | What | Model | Files owned | Lines / h | PR | Wave | Depends |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B0 / B0b | B0: merge `origin/feature/mission-framework` (#372) into `feature/mission-engine` at **J7 R0** (R0 also takes the optional-objective rewards out of `tallowWharfMissions.ts`, Q19); B0b: the same merge again once TW23 is in the framework branch (skipped if B0 already carries it); cut `feature/tallow-fixes` and `feature/tallow-throw` | lead (Campaign Build) | none | 0 / 0.3 | - | 0 | B0 **done** (925fa3784 + e4eace3bd); B0b when TW23 merges |
| TD | Per-site throw length (A24): **TD-a** `MapLayout.throwSites` (optional), a pure `throwDistAt(bx, bz, dx, dz)` over a module list the team controller sets, `throwLanding` / `throwLandingOk` take the length (default `TEAM.throwDist`), `checkTeamRequest` uses the site's band; **TD-b** `TeamController` registers the map's sites at start (host and client; cleared on dispose) and `requestThrow` uses the site length for the landing, floor and arc | Opus | TD-a: `src/game/teamMoves.ts` (throw functions only), `src/world/mapDef.ts`, `tests/teamMoves.test.ts`, `tests/throwSites.test.ts` (new); TD-b: `src/game/teamController.ts` (`requestThrow` and the registration) | ~250 / 3 | T | 0 (TD-a) / 2 (TD-b) | B0; TD-b after the kit-flag fold is merged into the engine |
| LP | Light plan, egress and stairs table, and the four section briefs (coordinates for every change below, the D0 graph's numbers) | Opus | `docs/tallow-fixes/LIGHT.md`, `docs/tallow-fixes/EGRESS.md`, `docs/tallow-fixes/briefs/G{1,2,3,4}.md` | docs / 3.5 | G1 | 0 | B0 (B0b for the SPEC paths) |
| D0 | Wave-0 graph (check fix 3): the design delta on the map graph before any geometry: the A5 bridges (bolted, length), A25's stair-head bolt, the A6 jetty drop (`time_s`), M2's throw links (28 pawn, 33 lane: width 4.9, `exception: "long_throw"`; 29 pie: plain 2.5, no exception, note citing M2 / G403), A29's clock-door link 30 deleted, the plant ladder link, any added stair (bolted from the approach side), the split / overwatch / assist tags for TGC and TKL (A11) with the proposed defaults (TGC legs and the gallery ladder link, TKL measured legs) for the lead's ruling; validators run and saved before wave 1 | Opus | campaign-map `graph.json`; `docs/tallow-fixes/val/D0-*` | docs / 3 | G1 | 0 | B0b if B0 did not carry TW23 (A20; B0 is done); J7 PR D merged (its TGC / TKL graphs are validated with the map) |
| G0 | Shared: night floors (A3); `medkits` on `WharfSection` + `emptySection`; layout `medkitWalls` from the sections; then (after TD-a) `dist?` on `WharfThrow` and layout `throwSites` from the sections' throws that set it; `medkits` optional on `WharfSection` so W1-W4 compile untouched (polish 5); the level-and-drop gap check `soloLevelThreats` (check fix 2) with its unit test | Sonnet | `tallowWharf.ts`, `tallowWharfKit.ts`, `tests/tallowWharf/shell.test.ts`; `tests/tallowWharf/helpers.ts` (the new function only, wave 0; G2 owns the file from wave 1) and `tests/tallowWharf/levelGap.test.ts` (new) | ~350 / 2 | G1 | 0 | B0; its throw-site step after TD-a |
| G1 | W1: re-light to LP; hide spots; medkit; two vantage spots per encounter; any W1 stair fix from LP's egress table; the gallery ladder at the canal-steps end if the lead rules D0's TGC default (top gate bolted on the gallery side) | Sonnet | `tallowWharfW1.ts`, `tests/tallowWharf/w1.test.ts` | ~310 / 2.2 | G1 | 1 | LP, D0, G0 |
| G3 | W3: lamp 81 on; re-light; hide spots (east yard, east wing, by every takedown spot); medkit; two vantage spots per encounter; the crane's red lamp seen from the W3 roof; C5 landing side (no lip; if LP puts the C5 widening on the W3 side, the stage moves to x 84.4, A28) and the fire-escape cage's W3 end; the TKL route line if the lead rules D0's TKL default (the yard fire escape's foot beside the east gate); any W3 stair fix from LP's egress table | Sonnet | `tallowWharfW3.ts`, `tests/tallowWharf/w3.test.ts` | ~370 / 2.7 | G1 | 1 | LP, D0, G0 |
| G2 | W2: C4 pawn and C5 thrower side forced (A4, M2, A28: the west lightwell half 4.9 m, site length 5.8 on those two throws; the pie throw unchanged at 2.5 m, not yet forced); the arcade roof edge over the pawn loft and the fire-escape cage (A28); the clock-mender's door locked both sides (A29); the two enclosed way-back bridges (A5) with `W2_BOLTS` appended and `W2_ROUTES` kept valid; the stair-head door (A25, appended bolt); plant-room roof access (A7); re-light; hide spots; medkit; two vantage spots per encounter; any W2 stair fix from LP's egress table; W3 guard 1's beat (J7 R3 hand-off, polish 3: he lives in the sectors file) | Sonnet (Opus fix round if its checker fails) | `tallowWharfW2.ts`, `tallowWharfSectors.ts` (`W2_BOLTS`, `W2_ROUTES`, W3 guard 1, and the W1 ladder gate's `W1_BOLTS` entry if ruled), `tests/tallowWharf/w2.test.ts`, `tests/tallowWharf/sectors.test.ts`, `tests/tallowWharf/helpers.ts` (`throwCheck` takes the site length), `tests/tallowWharf/shell.test.ts` (the one "exactly two throw sites" line; no other wave-1 slice edits it) | ~680 / 5 | G2 | 1 | LP, D0, G0, TD-a |
| G4 | W4: jetty way back (A6); re-light (shed three aisle, the yard cart lines; darkness from stacks and carts); hide spots; medkit; two vantage spots per encounter | Sonnet | `tallowWharfW4.ts`, `tests/tallowWharf/w4.test.ts` | ~250 / 2 | G2 | 1 | LP, D0, G0 |
| E8 | The wharf e2e follows J8's geometry (throw stage, jetty pull), reading the section exports where it can | Sonnet | `scripts/e2e-sectorops-wharf.mjs` | ~60 / 1 | G2 | 2 | G2, G4, J7 PR F merged |
| D1 | Graph matches the build: counts (A10, no dog text), the W3 checkpoint tag, D0's links re-measured from the built geometry, each space's type and band in its `note`, the meta lighting note, the G157 9 exit-run line; validators re-run to D0's result; output saved | Sonnet | campaign-map `graph.json`; `docs/tallow-fixes/val/D1-*` | docs (+ test lines if a graph test changes) / 1.5 | G2 | 2 | G1-G4 merged |
| P1 | TW23's SPEC and the sign-off pages corrected; PLAN.svg regenerated beside `PLAN-approved.svg` (the ~18:05 drawing kept); "changes since the drawing" list; TGC / TKL / coop-kit pages: pointer or drawing lines only | Sonnet | `docs/tallowWharf-map/SPEC.md`; campaign-map `SIGNOFF.md`, `PLAN.svg`, `PLAN-approved.svg`; TGC / TKL / coop-kit `SIGNOFF.md` (pointer / drawing lines only) | docs / 2 | G2 | 3 | D1; TW23 in the engine (A20) |
| FG1 / FG2 | Fragments, `docs/tallow-fixes/STATE.md`, TESTING.md line | Haiku | `changes/feature-tallow-fixes*.md`, STATE, TESTING.md | docs | G1 / G2 | last | the PR's slices |
| G6 | Lookouts and pairs on Tallow (A14): a W3 roof-turret lookout and a W4 gantry lookout (counts stay inside the bands and the cap), pair tags on the W1 porters and the W4 yard patrol | Sonnet | `tallowWharfSectors.ts`, `tests/tallowWharf/sectors.test.ts` | ~120 / 1 | own small PR or J23 | later | J15 `lookouts` + pairs on the engine; not in J8's gate |
| PB | The plank bridge at C4 pie loft -> clock loft (M2, G403, A13): the pie-half lightwell widened to Player's plank length (A28's east-half rule), the plank's seats, the clock door's bolt and graph link back (A29's undo), the pie link to the plank kind, tests (forced by the level-and-drop check; one-way pairs) | Sonnet from an Opus brief | `tallowWharfW2.ts`, `tallowWharfSectors.ts` (`W2_BOLTS`), campaign-map `graph.json`, `tests/tallowWharf/{w2,sectors}.test.ts` | ~200 / 2 | own Tallow PR | later | Player's J24 plank move on the engine; J12's `plank_bridge` kind (Marlow, J12 A25); Guard AI's notice hook; J8 merged; not in J8's gate |
| LM | Lux measure per section against the bands (`lux-grid.mjs --map tallowWharf --section N`), fix list | Sonnet | `docs/tallow-fixes/measure/*` | docs / 1.5 | own or J23 | later | light-realism L0 on master and in the engine; desktop CPU < 80% |
| FA | Free assets for Tallow props and dressing (A23): (1) now, docs only: a scouting list of candidate free assets per prop family with source URL, licence, the commercial-sale check (CC0 / public domain / CC-BY / royalty-free game licence only; reject NC, ND, SA, unclear) and the hours each saves over an in-repo build; (2) after the greybox exit and the lead's go per download: import, credits lines, the dressing job | Sonnet (list), Opus checker on licences | `docs/tallow-fixes/assets.md` (list); later `docs/art-credits.md`, `docs/audio-credits.md` and the dressing files (claimed by that later job) | docs / 1.5 | own docs PR or J23 | (1) any time; (2) after greybox exit | nothing for (1); greybox exit + the lead's go for (2) |
| S1 | Shutter world wiring (curtains, collision, nav, light, client) and the section-restart reset (A27) | Opus | `src/world/shutterDoor.ts`, `src/world/world.ts`, `src/game/teamController.ts` (the `update` call and `resetKit`, after the fold and TD-b), `src/game/gameState.ts` (the arming line and the `checkpointReset` line, after J7 PR F), `tests/shutterWiring.test.ts` | ~430 / 4.5 | S | 0 (all but the two late hunks) | B0; the `teamController.ts` hunk after the fold and TD-b; the `gameState.ts` lines after J7 PR F; the reset after S2's `resetShutter` |
| S2 | Guards notice a held shutter (R39); `resetShutter` for A27 | Opus | `src/game/stealthSystems.ts`, `src/game/kit/shutter.ts` (the pure helper, a preallocated `noticed` field on `ShutterDevice`, `resetShutter`), `tests/shutterNotice.test.ts`, `tests/kit/shutter.test.ts` | ~280 / 3 | S | 0 | B0 |
| S3 | Map swap: stand-ins out, `placeShutter` in (W1, W4); stand-in helper retired; tests flipped | Sonnet | `tallowWharfW1.ts`, `tallowWharfW4.ts`, `tallowWharfKit.ts`, `tests/tallowWharf/{w1,w4,shell}.test.ts` | ~120 / 1 | S | 4 | S1 merged; PR G2 merged into the engine and the engine merged into S |
| S4 | e2e walks both shutters (no SKIP, no teleport), the guard notice, and both curtains shut after the broken-rule restart (A27) | Sonnet | `scripts/e2e-sectorops-wharf.mjs` | ~240 / 2.5 | S | 5 | S2, S3, E8, J7 PR F; URL from the fold |
| FS | Fragment, STATE, `docs/systems/coop.md` shutter line, TESTING.md line, hand-off note to Guard AI for `docs/systems/ai.md` | Haiku | `changes/feature-tallow-shutters.md`, STATE, `docs/systems/coop.md`, TESTING.md | docs | S | last | S4 |

### Slice detail (what "done" is)

**LP light plan and briefs (Opus, docs).** One table per space (13 "Light plan", 5.1, 5.2, 5.5): its space type and
provisional band (A2), whether it works tonight (M1), every fitting with its owner, mount and circuit group, the switch
by the door of the space it lights (5.1, G157 7), unswitchable lamps with their reason (clockwork faces, photocell canal
and coal-yard lamps, the emergency bulkhead, the crane's aviation lamp), hardened chokes with the route around (G333),
the dark pockets the real gaps make, which route each cut or shot opens, and the darkest real spot per section (G157
12). Each switch's visible link (a conduit run from switch to fitting, or a labelled panel naming the circuit; G157 7).

`EGRESS.md` (G157 10, check fix 8): a row per bolted door (which side is inside, the story reason, that no fire exit is
bolted from inside) and a row per multi-storey building with its two staircases (16.2.7) and roof access (16.2.5), or
the fix and the slice that builds it, or the reason listed for Michael's walk (he confirms the 12 there). Every added
stair is shut from the approach side (push bar on the inside only) so it opens no solo bypass of a forced gate, and
goes into D0's graph as a `bolted` link the validator checks. Starting rows (TW23 SPEC "Stairs and exits", O12, O13):

| Building | Stairs now | LP's row must give |
| --- | --- | --- |
| W1 warden's office block (gallery storey over the market) | one enclosed stair (foot bolted from the stair side) + the inspection hatch | a second stair or the reason: default fix in G1, an external iron stair from the gallery office down to the fish-hall side, its foot gate opening from the stair side only (the market boost stays co-op) |
| W2 south lofts (pawn, pie, lane-window) | the pawnbroker's fire stair; the pie shop's back stair (the lane-window loft reaches it through the pie loft's inner door) | confirm both reach the ground from every south loft; the plant room ladder is plant (16.2.1), not a stair |
| W2 north range (reading room, clock loft) | the public stair (A25: push bar on the reading-room side) | the second escape: the A5 bridges lead (exit direction, gates opening from the bridge side) to the south lofts' fire stair; LP says whether that meets 16.2.7 or G2 adds an enclosed back stair from the clock loft's east end, its foot door opening from inside only |
| W3 counting house | the roof bulkhead stair core (east) and the external fire escape on the yard wall (east); the west wing's gallery stair inside the wing | 16.2.7 separation (both main stairs are east, O13): a west stair or the reason; roof access is the bulkhead (16.2.5 met, A7) |
| W1 market and fish hall; W4 sheds; the crane | single storey; the crane's leg ladders are plant ladders | n/a |

Provisional space-type map (from the draft band table; LP confirms per space):

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
| w2-pie-shop, w2-clock-loft, w2-lane-window, w3-strongroom, w3-partners-office, w4-shed-two | closed: night and emergency lights only (M1) | closed |
| w1-gallery, w2-arcade-roof, w3-roof, w4-gantry, w4-boat, w3-chute | no band: roofs, walks and ducts, moon and spill (plus the turret clock and aviation lamps) | - |

Then one strict brief per section slice (G1-G4) with exact coordinates, group numbers, the test list, D0's link
numbers, and for G2 the forced-throw and way-back geometry worked through against `throwLanding` / `throwLandingOk` at
the site length (A24), `throwRoom`, both solo models (`soloTopLandingReach`, `soloJumpReach`) with the 0.2 m margin, and
the reach time at `reach_speed_mps`. Every brief places each bolted barrier at the approach (south / near) end of any new
walk, and lists the near-side surfaces its jump tests must cover (fix round 2: by height, every solo-standable top at,
above or below each forced stage, for the G0 level-and-drop check and the existing helpers). G2's brief also marks the
thrower's working spot on the loft floor (polish 8: with a 1.0 m stage and a fixed 5.8 m throw the spot is about 0.6 m
deep, z ~66.7-67.3; a floor mark, or a deeper stage) and confirms C5's run-up is clear of the roof hatch (polish 9).
Done looks like: every Tallow space has a row; no row
relies on a light left off; every encounter keeps a cover-based shadow route after the re-light, or the row says which
cut or shot opens it; `EGRESS.md` has every row above filled.

**TD per-site throw length (Opus; A24; lead ruling fix 1 (b)).** TD-a: `MapLayout.throwSites?: { x: number; z: number;
dx: number; dz: number; dist: number }[]` (`mapDef.ts`, a doc comment citing Q23 and A24); in `teamMoves.ts` a
module-level site list with `setThrowSites(list | null)` and a pure, allocation-free `throwDistAt(bx, bz, dx, dz):
number` (a site within 1.0 m of the thrower whose facing is within cos 0.9 of the throw direction gives its `dist`,
else `TEAM.throwDist`; an index loop); `throwLanding(..., dist = TEAM.throwDist)` and `throwLandingOk(..., dist =
TEAM.throwDist)` take the length (band `dist +- 1`, height `TEAM.throwDrop` unchanged); `checkTeamRequest`'s throw case
passes `throwDistAt` of the thrower and the claimed direction. TD-b: `TeamController` calls `setThrowSites` with the
world's `layout.throwSites ?? null` when it starts (host and client) and `null` on dispose; `requestThrow` uses
`throwDistAt` for the landing, the floor probe and the arc (no allocation: the existing scratch vectors). No change to
`throwArc`, `TEAM.throwTime`, the wire or `src/net` (both peers build the same map). Done looks like: `tests/teamMoves.test.ts`
(every existing throw case unchanged with no sites) and `tests/throwSites.test.ts` (no sites -> 3.2; a site -> its
length, its band accepts length +- 1 and refuses 3.2; the wrong facing or 1.1 m away -> 3.2); `tests/ctcourse/a5Substation.test.ts`,
`tests/ctcourse/a8Strongroom.test.ts`, `tests/ctcourseGreybox.test.ts` unchanged and green (Marlow Yard's throw drills
untouched: it has no sites). Coordination (before TD starts): Campaign Build messages Player Build (team moves owner;
its J24 `feature/coop-kit` claims `teamMoves.ts` / `teamController.ts`) with the brief; Marlow Build is told its drills
are unaffected and that TV (below) is asked of it.

**TV validator and scale sheet (Marlow Build, hand-off; not a J8 slice; fix round 2: unblocked by M2, built as J12
A27).** Marlow's plan (`origin/feature/validator-port` 10b613dd3, BRIEF A27, PLAN S7a / S7b) does it: a `team_throw`
link with `exception: "long_throw"` at a spot the new scale-sheet row "Long throw (named spots only)" lists passes a gap
up to 4.9 m (INFO), any other link keeps the 2.7 m ERR; the spots are exactly Tallow links 28 (`w2-pawn-loft ->
w2-reading-room`) and 33 (`w2-arcade-roof -> w3-roof`), checked in fix round 2 against the master and engine graphs
(0-based; both `team_throw`). The cap is the 4.9 m gap, not the 5.8 m throw. The pie link gets no exception. Until S7a /
S7b land, the J8 gate's two named exceptions (A22) stand; the row's exact wording goes to Michael with the walk card
(lead ruling).

**D0 wave-0 graph (Opus; check fixes 3 and 4).** Before any wave-1 geometry, on the campaign-map `graph.json` only
(A20): the A5 bridges (`door`, `bolted`, width 1.2, length from LP), A25's `bolted` stair head, the A6 jetty `drop`
(`time_s` 3), M2's throws (links 28 pawn and 33 lane at `width` 4.9 with `exception: "long_throw"` and a note citing M2,
A24 and J12 A27; link 29 pie stays `width` 2.5, no `exception`, its note "not yet forced: plank bridge later, M2 /
G403"), A29 (link 30 the clock-mender's door deleted, the clock loft's `note` saying why; the renumbering in the
saved note), the plant ladder link (A7), any stair LP's egress table adds (bolted from the approach side), and the
split declarations (A11): `split:<id>:a|b` tags on the leg spaces, `overwatch:<id>` on the overwatch space,
`assist: "<id>"` on the assist link (`level-validate.mjs` 939-1069). Runs (A22; as D1's block below): map, map + TGC,
map + TKL on master's validator, the mission-validator on the map, and the same on J12's branch once S7a / S7b exist.

Split defaults (check fix 4). D0 proposes them in its saved note; **the lead (Campaign Build) rules before wave 1**;
Michael sees them only through the walk card, and only if geometry changes; any leg or role change against the BEATs
goes to J7 (the BEAT owner, section 13). Numbers are the validator's (`split_speed_mps` 1.3 for legs,
`reach_speed_mps` 3.0 for reach, limits 20% and 15 s), modelled on the fix round's draft with M2 and A29
(`scratch/campaign/j8-j9-val/fix2/var.cjs`, `map-fix2-defaults.json`, `master-4e5e9959-fix2-defaults*.txt`: 2 ERR, the
two named throw-gap lines only, on map, map + TGC and map + TKL).
- **What the validator misses:** the split check walks solo arcs without the bolt direction (`arcsOf(links, solo)`, not
  `soloArcsOf`, `level-validate.mjs` ~957), so the draft's 21.2 s TGC reach runs tea stall -> market -> up the
  warden's stair -> gallery, though the stair's foot door is bolted from the stair side: on the real bolts a lone
  reviver on the floor has no way up at all. So every default below names the bolts on its worst reach path and who
  opens them when, and the section test proves the path on the real bolt states (`soloNav` with those gates open
  reaches, with them shut does not).
- **TGC parity and reach (default: legs re-chosen + a G1 geometry line).** Legs a = [`w1-gallery`, `w1-warden-office`]
  (Eyes: the gallery, then the tally book on the warden's desk; BEAT step 2), b = [`w1-tea-stall`] (Ears); fork
  `w1-canal-steps`, rejoin `w1-market`. G1 adds the market warden's caged iron ladder at the gallery's canal-steps end,
  its top gate bolted on the gallery side (graph `ladder` `w1-canal-steps -> w1-gallery`, `bolted`, `level_change` 4.5,
  `time_s` 3): after the boost A unbolts it and it stays open (level-design 11.6); from the floor it is shut, so the C1
  boost stays forced (no solo twin: `soloArcsOf` honours the bolt). Worked: leg a = ladder 3 + gallery -> office 20 m
  / 1.3 = 15.4 + the warden's stair down 8 = **26.4 s**; leg b = canal steps -> tea stall 9 / 1.3 = 6.9 + tea stall
  -> market 19.5 / 1.3 = 15.0 = **21.9 s**: 17%. Reach: tea stall -> gallery 9 / 3 + 3 = **6.0 s**; worst, from the
  office: office -> gallery 6.7 + ladder 3 + canal steps -> tea stall 3.0 = **12.7 s**. Real bolts on that path: the
  ladder gate (A opens it on arrival: a BEAT line for J7, "A unbolts the ladder gate for B"); the warden's stair foot
  opens from the stair side, so A's way down is real. The checker's alternative (b on `w1-market`, 14.7 s up the stair
  once its foot is open) fails the validator's structure (`legs never rejoin`: the gallery's only solo exits are the
  market and the office, the fork); kept as the fallback if the lead rejects the ladder, with A opening the stair foot
  from inside and the validator line explained in the note.
- **TKL parity (default: measured legs + a G3 route line; no data-only answer exists).** Every leg choice over the W3
  spaces was run (`fix2/var.cjs`, 18 combinations): the best data-only one is 25% (a = [`w3-west-wing`], b =
  [`w3-east-yard`], 21.5 / 28.6 s), the rest 37-68% or "never rejoin". Default: legs as the BEAT (a = [`w3-west-wing`],
  b = [`w3-east-yard`, `w3-east-wing`], rejoin `w3-passage`); D0 times the four leg links door to door from the build's
  own route points (`W3_ROUTES` route 2), not marker to marker, and G3 moves the yard fire escape's foot beside the east
  gate (it runs down east from its roof head at x ~107 instead of west to x ~101). Worked (planning numbers, D1
  re-measures): a = the lantern drop, the gallery and its stair (about 3 + 2.3 + 4.6 = **10 s**, today's `time_s` 3
  leaves the gallery and stair out) + the stacks to the passage's west door (~16.5 m / 1.3 = **12.7 s**) = **22.7 s**;
  b = the fire escape **14 s** + its foot to the gate (~2 m, **1.5 s**) + the gate to the passage's east door (~6.5 m,
  **5.0 s**) = **20.5 s**: 10%. Reach stays under 15 s (14.3 s yard <-> west wing through the front hall; the east
  gate's real state: the keypad opens with the code B holds, the clerks' hall sash is on the latch). Fallback if the
  lead rejects the move: the data-only 25% legs with a J7 role line (A waits on the roof as overwatch until B calls
  "at the gate", then drops), which the validator cannot time: the one split ERR left, explained in the note, and the
  lead takes it to the orchestrator as a gate exception.
- **Any `time_s` change** is backed by a geometry line in a named brief (G1 / G3) and re-measured by D1; none is a
  free number.

Done looks like: 0 ERR on all runs except the two named `gap 4.9 m above the 2.7 m throw` lines (links 28 and 33)
until J12's S7a / S7b land; `checkCoop` clean on both splits on the lead's ruled defaults, with each split's worst reach
path and its bolts written in the note; outputs and the graph diff saved under `docs/tallow-fixes/val/D0-*` before
wave 1 starts; the section briefs quote D0's numbers; the BEAT lines the defaults need sent to J7.

**G0 shared (Sonnet).** Theme night floors set to the numbers the LP brief gives (A3, the campus night values);
`WharfSection.medkits?: { pos: Vector3; yaw: number }[]` (optional, so W1-W4 compile untouched; polish 5) with
`emptySection` returning `[]`; the layout gains `medkitWalls: SECTIONS.flatMap((s) => s.medkits ?? [])`. After TD-a:
`WharfThrow.dist?: number` and the layout's `throwSites` from every section throw that sets `dist` (thrower spot,
direction runner -> thrower, `dist`). **The level-and-drop gap check (check fix 2)**, in
`tests/tallowWharf/helpers.ts` (a twin, so the shared `tests/helpers/soloJumpReach.ts` and its ~17 users stay
untouched): `soloLevelThreats(solid, q: CoopTop, skip, extra = 0.2): string[]`, reusing `soloTopLandingReach`,
`soloJumpReach`, `LEAP`, `GRAVITY`, `SOLO_TOP_SPEED` from that file. It covers every top **at or above** the stage
(`t >= q.top - 0.05`; the existing helpers cover the lower ones), deep enough to stand on (`LEDGE.climbDepth` 0.38),
with crouch room over the take-off spot, and **no mantle skip** (tops at these heights are reached by stairs, ladders
and drops, and all of W2 is `noLedge`); `skip` names only the far side (the destination room, the stage's own pieces).
Reach: `soloTopLandingReach(t, q.top) + extra`, and `soloJumpReach(t, q.top) + extra` against each stage edge that is
not `noLedge`. Flight: along the jump's arc (feet height from `LEAP.vy` and `GRAVITY` at `SOLO_TOP_SPEED`, the body
sampled at +0.1 / +0.9 / +1.7 m); a piece blocks only if its top is over `vaultMax` 1.25 above the take-off or it is
deep enough to stand on, so a vaultable parapet or railing is no block. `tests/tallowWharf/levelGap.test.ts`
(synthetic boxes, the section 2 numbers): a level top 3.5 m from a 4.5 stage is reported and one 3.6 m away is not;
an 8.4 top 5.0 m away is reported (5.08) and one 5.1 m away is not; a 1.1 m railing between them does not block and a
1.9 m `noLedge` screen does; with a stage edge not `noLedge`, a level top 4.8 m away is reported (4.84). Done looks
like: `shell.test.ts` asserts the theme floors equal the campus values, `medkitWalls` collects every section's
stations, `throwSites` lists exactly the throws that set `dist` (none until G2; G2 then pins it in `shell.test.ts` to
**exactly two**, the pawn and lane throws, M2), `levelGap.test.ts` green, and every other shell test passes unchanged.

**G1 W1 (Sonnet).** Lamps per LP (all `on`, every switch by its door with its visible link); hide spots per A9 (stall
backs, ice benches); the first-aid box medkit (A8); any W1 stair from `EGRESS.md`. Done looks like: `w1.test.ts`
asserts no lamp off, every switch within reach of a door of the space its group lights, a hide spot within the spacing
of each W1 takedown spot (read from the sectors export), the medkit inside a W1 room and outside every W1 guard's route
view radius, **two vantage spots per encounter** (market, fish hall: room for two, out of view); a new stair's foot
gate shut from outside in `soloNav`; if the lead rules D0's TGC default, the gallery ladder (canal-steps end, top gate
bolted on the gallery side, appended to `W1_BOLTS` by G2 who owns the sectors file): `soloNav` from the canal steps
and the tea stall does not reach the gallery with the gate shut and does with it open, and `soloJumpThreats` stays
`[]` for the C1 lip; existing W1 tests unchanged.

**G2 W2 (Sonnet; heaviest slice).** (1) M2's two long throws forced (A4, A28): the pawn loft cut back to z 67.6 (west
lightwell half 4.9 m), `THROW_PAWN` and `THROW_LANE` carry `dist: 5.8`, landing edges `noLedge`, the arcade roof's edge
over the pawn loft at z 67.4 or less (or its 1.9 m screen), the fire-escape deck caged, fall-ins with their way out.
`THROW_PIE` is unchanged (2.5 m, no `dist`, the pie loft keeps z 62-70). (2) The clock-mender's door locked both sides
(A29: `locked: true, breachable: false`, its `W2_BOLTS` slot taken out with a comment, the later slots renumbered).
(3) The two enclosed way-back bridges (A5): gate at the south (approach) end bolted on the bridge side, sides and roof
`noLedge`, appended to `W2_BOLTS`, walk 12 m or less; the stair-head door (A25) appended too; `W2_ROUTES` still pass
(2+ routes, G285). (4) Plant-room roof access (A7). (5) Lights, hide spots (arcade, reading room), the beadle's office
medkit, two vantage spots per encounter, the thrower's spot marked (polish 8). (6) W3 guard 1's beat (J7 R3 hand-off,
polish 3; he is in `tallowWharfSectors.ts`, the file G2 owns): today a man pacing a 3 m line ([112.5, 46] to
[109.5, 46]); G2 gives the east-yard watchman a real round inside the yard's walk area (the gate side, the lodge door,
the fire escape foot), same role and zone, the count unchanged (A10), his `reason` naming it; only after J7 PR D (R3)
is in the base. Plus the W1 ladder gate's bolt in `W1_BOLTS` if the lead rules D0's TGC default. Done looks like
(check fixes 1 and 2):
- `throwCheck` (`helpers.ts`, taking the site length) passes on the two long-throw stages with `throwLandingOk` at
  5.8, and on the pie stage at the standard 3.2 m; `shell.test.ts` pins `throwSites` to exactly two.
- G0's `soloLevelThreats` (extra 0.2) is `[]` for the pawn stage and the C5 stage over the whole solid set, and
  `soloTopLandingThreats` / `soloJumpThreats` (extra 0.2) are `[]` for both for the lower tops: every near-side surface
  a lone player reaches is covered (the south loft floors and furniture, the arcade roof at 8.4, the west bridge's roof
  and sides, the plant room and its tank, the stair-head landing, the caged fire-escape deck and the old bridge
  landing), each `skip` naming only the far side. Section 2's -3.9 m case (the arcade roof over the pawn stage: 4.88 /
  5.80 m) is in the test by name.
- The pie stage's test says "not yet forced (M2, plank later)": it asserts the throw works and that the gap is the
  standard 2.5 m, not that it is forced (PB will).
- The hangable-lip audit (`w2.test.ts:163`) is extended to the new geometry (bridges, plant room, stair head, the new
  pawn-loft edge, the cage) and its message names them.
- `w2.test.ts:212` becomes the one-way assertion: with every bolt shut and the clock door locked, the pawn loft does
  not reach the reading room, the arcade does not reach it (stair head) and **the pie loft does not reach it** (nor
  does the clock loft: A29); with only the west bridge gate open (as the thrown partner opens it) the reading room
  reaches the pawn loft; with only the east bridge gate open the clock loft reaches the pie loft. The arcade still does
  not reach the roof alone.
- The ladder sits inside the plant room, no ladder opening is in an occupied room; `sectors.test.ts` (bolt counts and
  indexes after A29, routes, W3 guard 1's round inside the yard) green.
- Polish 2: the old-rule test `w2.test.ts:292` ("the walkway, lane-window loft, clock loft, roof and stacks are dark
  (no lamp over them)") flips to the LP rows (M1: closed spaces by night fittings, no space dark by design).

**G3 W3 (Sonnet).** Lamp 81 `on: true` (Q2) and the re-light; hide spots in the east yard and the east wing and by every
takedown spot (lodge bench, press aisles); the porter's lodge medkit; C5's landing side with no hangable lip, the stage at
x 84.4 if LP puts the widening on the W3 side (A28; one brief gives both G2's and G3's C5 coordinates); any W3 stair from
`EGRESS.md`. Done looks like: `w3.test.ts` asserts no lamp off (polish 2: `w3.test.ts:387` "group 81 (the lodge lamp)
starts off" flips to "every lamp starts on"), the hide spots, the medkit, **two vantage spots per encounter**, the
crane's red lamp has a clear line from a W3 roof spot (polish 4), `soloLevelThreats` and `soloJumpThreats` /
`soloTopLandingThreats` (extra 0.2) `[]` for the C5 stage over the whole solid set (the W2-side tops at 8.4 and above
named, the W3 side skipped as the far side), and the fire-escape cage's W3 end shut to a lone player from the deck.
If the lead rules D0's TKL default: the yard fire escape runs down east to a foot beside the east gate, and the test
reads its foot from the build (D1 re-measures the leg).

**G4 W4 (Sonnet).** The jetty drop to the canal ledge beside C10 (A6) with no solo way up; the shed three aisle and the
yard lit per LP with darkness from stacks and carts; hide spots (shed yard two or more, shed three); the shed-office
medkit. Done looks like: `w4.test.ts` asserts the drop point, the C10 lip still in the co-op band, `soloJumpThreats`
`[]` for the jetty lip from every ledge-side surface (bollards, the quay ladder cage, the rail-gap posts), the W4
hangable-lip audit extended to the rail gap, the hide spots, the medkit and **two vantage spots per encounter**.

**E8 e2e follows (Sonnet).** `toss` for the pawn throw (`:335`) and `pull` for the jetty (`:465`) take the new points,
from the section exports when the page can read them, else the numbers from G2 / G4. Done looks like: laptop
`e2e-sectorops:wharf-tgc` and `:wharf-tkl` green on PR G2's head.

**D1 graph matches the build (Sonnet; check fix 3: D0 set the design numbers, D1 confirms them).** Counts per space =
the spawned guards (A10; J7's two former dogs as armed humans, no dog text left); the W3 checkpoint tag on the space the
build restarts at (encounter checkpoints are J23); D0's links re-measured from the built geometry (bridge lengths, the
drop, the 4.9 m gaps; a measured number worse than D0's is a fix in the section, not a graph edit); each space's type
and provisional band in its `note` (a schema field waits for J12); the meta lighting note rewritten (no "lit by
default", no LR1 / G279); the G157 9 exit-run line. Ordered after the merge that brings TW23 into the engine (A20).
Validators (A22, D0 runs the same block), each from a clean extract into the slice's scratch:
```
for R in origin/master origin/feature/mission-validator; do D=<scratch>/val/${R##*/}; mkdir -p $D && git archive $R scripts docs/design | tar -x -C $D; done
node <scratch>/val/master/scripts/level-validate.mjs <abs>/docs/missions/prototypes/campaign-map/graph.json
node <scratch>/val/master/scripts/level-validate.mjs <abs map graph> <abs>/docs/missions/prototypes/three-grey-coats/graph.json
node <scratch>/val/master/scripts/level-validate.mjs <abs map graph> <abs>/docs/missions/prototypes/two-key-ledger/graph.json
node <scratch>/val/mission-validator/scripts/level-validate.mjs <abs map graph>
```
(`docs/design/metrics.json` is generated: if the extract has none, run that ref's `scripts/metrics-gen.mjs` into the
extract first, as the conformance did.) Plus the same three runs on J12's validator once S7a / S7b exist
(`origin/feature/validator-port`), where links 28 and 33 pass as `long_throw` INFO. Done looks like: master's
validator 0 ERR on all three runs (A22's two named throw-gap lines, links 28 and 33, excepted until S7a / S7b land);
the D0 link renumbering (A29) stated; the mission-validator 0 ERR on the map graph; every WARN justified in the
SPEC's validator section; outputs saved under `docs/tallow-fixes/val/D1-*` with the refs and the date; `checkCoop`
clean on the declared splits; the numbers match D0's or the difference is explained.

**P1 pages (Sonnet, from an Opus brief).** SPEC (TW23's `docs/tallowWharf-map/SPEC.md`, A20): palette and lighting line
(M1, A2, no G279), dogs gone, counts, throws force co-op (Q23, M2: the two long throws; the pie throw "not yet forced,
plank bridge later"), C2 / C8 real once J9 lands (a dated note until then), the way backs, the stair-head door, the
clock-mender's locked door (A29), the plant room, the fire-escape cage, medkits and hide spots, the validator section
from D1, and TW23's open items J8 closes (O1, O9, O11, O12, O13, O18, O19, O20, O21) marked done. The campaign-map
SIGNOFF page: the current validator result, armed guards only, the lighting basis, forced throws, the changes since the
approved drawing (for the walk). The lighting line on both pages says in plain English: "Closed rooms (pie shop, clock
loft, lane-window loft, strongroom, partners' office, shed two) have only their night and emergency lights on, as a
real closed shop would; you picked this on 2026-10-25 ('Yes, night lights only')." TGC / TKL / coop-kit SIGNOFF pages:
a pointer line to the J8 changes and a redrawn drawing only; no rule text is rewritten (lead ruling: the signed TGC
page stands as Michael signed it, killing Teale before he talks breaks the rule and he moves; a knock-out before he
talks is a section restart with Teale at his table, Michael's M6, #372 BRIEF on framework 67464e03). **The TGC
pointer line says how step 3 now plays** (check fix 3; SIGNOFF :26-29 says "The only way back out is down the lit
public stair", BEAT :49-56 that joint questioning happens only if B comes up the public stair): "Since the drawing:
the reading room's stair door opens only from inside, so the way in is the throw; the one questioning Teale can leave
quietly by the west lightwell bridge (he opens its gate at the pawn loft end, and it stays open), or down the lit
stair; once that gate or the stair door is open, the partner can walk in and question Teale with him; the clock
loft's door is locked tonight." The same line covers the BEAT, which J7 owns: P1 does not edit `BEAT.md`; the lead
sends the line to J7's owner (section 13). PLAN.svg regenerated (`node scripts/graph-svg.mjs`, the slice's own
run) and the ~18:05 drawing kept beside it as `PLAN-approved.svg` (polish 6). Done looks like: no page claims a result
the D1 output does not show; every change since ~18:05 is listed in plain English; the TGC / TKL diffs are pointer or
drawing lines only.

**S1 shutter wiring (Opus).** `World` builds `ShutterDoors(scene, level)` when the level has shutter specs, adds its
`curtainMesh` as a flashlight shadow caster (as the door leaves, `world.ts:161-162`), arms it with the doors (after the
nav grid; the one call site `gameState.ts:793` only after J7 PR F is merged, else a `World` method the existing call
reaches) and disposes it. `TeamController.fixedUpdate` (after the kit ticks) calls
`world.shutters?.update(this.devices.list)` on host and client alike. The guards' nav treats each opening as closed
(A15). Light parity (A16): the closed curtain stops lamp light in `LightField` and on screen through one path (a
bake-time occluder at the curtain plane from `placeShutter`, or a door-list entry that is always shut); the builder reads
`lightField.ts` / `lampBake.ts` first and, if either needs a change, stops and the lead clears it with Sector Ops Build
(lighting owner) before any edit. No allocation in `update` beyond today's. Section restart (A27, check fix 4):
`TeamController.resetKit()` calls S2's `resetShutter(d)` on every shutter device (drop shut, end the lift run, clear the
notice mark) and is called from `GameState.checkpointReset` (one line; `restartSection` calls it on every section
restart, `sectorMode.ts:1182-1215`); S1 reads how a client learns of the restart and how it mirrors device state
(`src/net/kitNet.ts`): if the host's device state reaches the client by the wire, nothing more; if not, it stops and the
lead opens an Opus `src/net` slice with two checkers (A19). Depends (check fix 6): S1 builds everything except two late
hunks: the `teamController.ts` hunk (the `update` call and `resetKit`) after the kit-flag fold is merged into
`feature/mission-engine` (framework STATE item 7; Campaign Build merges it) and after TD-b (section 5); the
`gameState.ts` lines after J7 PR F. Done looks like: `tests/shutterWiring.test.ts` (pure parts: slots from specs, the
nav cells over an opening blocked, the light path closed, `resetKit` leaves every shutter shut with no run) and the
existing `tests/kit/shutter.test.ts` green; on a map with no shutters nothing is built or called.

**S2 the notice (Opus; Guard AI coordination; check fix 5).** A pure `shutterNoticedBy(d, ex, ey, ez, yaw): boolean` in
`shutter.ts` (range, facing, storey; A18; the facing test as the door rule, `stealthSystems.ts:635`). The "last noticed
opening" is a numeric field `noticed` on `ShutterDevice`, set when the device is made (`-1`), so nothing is stored per
tick; `resetShutter(d)` (drop shut, end the lift run, `noticed = -1`) is S2's for S1 to call (A27).
`StealthSystems.noticeOpenShutters(dt)` on the host has **its own timer field** (`shutterNoticeT`, counted down every
fixed step, firing every `DOOR_NOTICE_EVERY`), not the door notice's `noticeT`, which only counts inside
`noticeOpenDoors` while a door is open (`stealthSystems.ts:619-621`, `:665`). It is called from the fixed step beside the
door notice, host only, and returns after one length check when `g.team.devices.list` is empty. Index loops only (no
`for...of`, no closures, no Map): for each device that `isShutterDevice` and `visible` with `opens !== noticed`, the
first calm, alive guard that passes the helper and `g.ballistics.clear(eye, noticePoint, MASK.SIGHT)` (reusing the
preallocated `noticeA` / `noticeB`) calls `e.hear(x, z, SHUTTER_NOTICE.range + 2)`, and `noticed = opens`. Nothing
grows or allocates per tick. Done looks like: `tests/shutterNotice.test.ts` (in range and facing: notice; behind, too
far, other storey, closed, or already noticed this opening: none; **a notice with no door open anywhere**; `resetShutter`
clears the mark) green; the door notice unchanged (`e2e-ctcourse` A7 data hall).

**S3 map swap (Sonnet).** W1 `standIn(b, SHUTTER)` (`:137`) and W4 (`:157`) become `placeShutter(b, spec)`; the stand-in
helper and its tag map go from the kit; the "never calls placeShutter" tests flip to "places both shutters and builds no
stand-in". Done looks like: `w1` / `w4` / `shell` tests green; the no-bypass test (`soloNav`) still finds no solo way
through either shutter.

**S4 e2e (Sonnet).** Replace the three SKIPs (`:307`, `:364`, `:464`) with the real move on both pages with pad input:
the holder lifts and holds, the partner crawls, the partner unbars the W1 back door for the holder (SPEC C2); a lone
player walking into a closed shutter stays on his side; both pages show the curtain at its gap and then shut. One notice
check: with the guard freeze lifted for one calm guard placed facing the W1 shutter within range, a held shutter raises
his suspicion (he hears it) and a closed one does not. After the wharf e2e's broken-rule restart, both pages show both
curtains shut and no lift run (A27). The page URL follows the kit-flag fold's parameter (expected `kitmoves=`; the
fold's PR names it) instead of `coopkit=1` once the fold is in the engine. Done looks like: `e2e-sectorops:wharf-tgc`
and `:wharf-tkl` green with no SKIP or teleport left for a shutter; the notice lines and the restart line printed.

## 7. Waves (full burn, file-disjoint)
- **Wave 0** (B0 at J7 R0; the J8 part after J7 PR D merges): LP (Opus), D0 (Opus, once TW23 is in the engine, A20),
  TD-a (Opus), G0 (Sonnet; the level-and-drop check and its test now, so G2 and G3 have it in wave 1; its throw-site step after TD-a), S1 (Opus, without its two late hunks), S2 (Opus). Files
  disjoint (D0 alone owns `graph.json`; TD-a alone `teamMoves.ts` / `mapDef.ts`).
- **Wave 1** (after LP, D0 and G0 merge on `feature/tallow-fixes`, D0's outputs saved and its split defaults ruled by the lead): G1, G2, G3, G4 together (one
  section file and its test each; G2 alone owns `tallowWharfSectors.ts`, `sectors.test.ts` and `helpers.ts`; G2 also
  needs TD-a merged in). S1 / S2 keep running.
- **Wave 2:** D1 once G1-G4 are merged; E8 once G2, G4 and J7 PR F are in; TD-b once the kit-flag fold is in the engine.
- **Wave 3:** P1 after D1; S1's late hunks (after TD-b and J7 PR F).
- **Wave 4:** S3, once S1 is merged on `feature/tallow-shutters` and PR G2 is merged into the engine and the engine into
  S (polish 3: it waits for PR G2's checker and laptop, so it is not wave 2).
- **Wave 5:** S4 after S2, S3, E8, J7 PR F and the fold.
- Fragments and STATE close each PR. Briefs: LP is the brief work for wave 1; TD's detail above is its brief's core;
  S1 / S2 / G0 briefs are section 16; the lead has the D0, D1, E8, P1, S3 and S4 briefs written by Opus before their
  waves (two to three ahead, RULES "Full burn").
- CPU: every builder follows the GB-briefs 0.4 CPU rule (wait while the desktop is over 85%, background check, never a
  foreground sleep). Today's 100% means wave 0 waits for the orchestrator's go.

## 8. Tests
| Slice | Vitest (`npx vitest run <files> --maxWorkers=2`, plus `npm run typecheck:fast`) |
| --- | --- |
| TD | `tests/teamMoves.test.ts`, `tests/throwSites.test.ts`, `tests/ctcourse/a5Substation.test.ts`, `tests/ctcourse/a8Strongroom.test.ts`, `tests/ctcourseGreybox.test.ts`, `tests/tallowWharf/w2.test.ts` (unchanged with no sites yet) |
| D0 | none (docs); the validator runs in its detail, saved |
| G0 | `tests/tallowWharf/shell.test.ts`, `tests/tallowWharf/levelGap.test.ts` |
| G1 / G2 / G3 / G4 | its `tests/tallowWharf/w<n>.test.ts` + `tests/tallowWharf/shell.test.ts`; G2 also `tests/tallowWharf/sectors.test.ts` and `tests/throwSites.test.ts` |
| D1 | `tests/tallowWharf/` (all; a graph-to-code text test may read the graph) + the validator runs above |
| S1 | `tests/shutterWiring.test.ts`, `tests/kit/shutter.test.ts`, `tests/kit/registry.test.ts`, `tests/kitNet.test.ts`, `tests/tallowWharf/shell.test.ts` |
| S2 | `tests/shutterNotice.test.ts`, `tests/kit/shutter.test.ts` |
| S3 | `tests/tallowWharf/{shell,w1,w4,sectors}.test.ts`, `tests/kit/shutter.test.ts` |

Laptop (every run `E2E_GPU=1`; `node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --suites "<list>" --set
<name> --requester "Night Shift | Campaign Build"`; the PR head's `affected-e2e` runs by itself):
Affected suites (polish 1, master `scripts/e2e-affected.mjs`): `src/world/maps/tallowWharf*` falls under `'src/world/'`
(`e2e-lightbake e2e-guard-carry e2e-levels e2e-anchors e2e-ctcourse`), not `e2e-sectorops`; `'src/game/'` gives
`e2e-takedown e2e-gadgets e2e-tactics e2e-park e2e-ctcourse e2e-sectorops` and no `e2e-coop`. The explicit requests below
cover the rest.
- **PR T:** affected (`src/game/` and `src/world/` as above) plus `e2e-coop e2e-netmove e2e-ctcourse` (the host landing
  check moves; Marlow Yard's throw drills must be unchanged) and `e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl`.
- **PR G1:** affected plus explicitly `e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl e2e-sectorops:mission`; and the
  look videos (section 10).
- **PR G2:** the same set (E8 is in it), plus `e2e-coop e2e-netmove` (the site throws run through the co-op request).
- **PR S:** affected (`src/game/kit/` and `src/game/` as above; `src/world/` as above), the RULES gate for `src/game`
  (`e2e-coop e2e-netmove`, the checker passes only when green), and `e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl
  e2e-sectorops:mission`.
- Every laptop failure gets an Opus triage agent at once (G319).

## 9. Checkers (one fix round per slice unless broken)
- **Plan:** one fresh Opus plan checker on both BRIEFs + this PLAN (`docs/templates/plan-check.md`): intent against
  Michael's words, gates, claims, sizes.
- **PR T** (TD): two independent fresh Opus checkers (the host's landing check in `checkTeamRequest` changes; lead
  ruling fix 1). Player Build is offered one of them through the orchestrator, not blocking.
- **PR G1** (LP, D0, G0, G1, G3): one fresh Opus checker (the batch fixes hard rule 2 / Q2 / Q3; Sonnet is not enough for
  the lighting judgement).
- **PR G2** (G2, G4, E8, D1, P1): one fresh Opus checker (forced gates, gate reach, the validator output, the pages
  against D1). A G2 FIX gets its fix round from Opus (RULES).
- **PR S** (S1-S4): two independent fresh Opus checkers of ours (AI behaviour and engine wiring); a review is also
  offered to Guard AI Build through the orchestrator (the R39 hook is theirs to accept), not blocking (lead answer 5,
  polish 7).
- Verdicts as commit statuses on the checked head (`context=checker`, "Opus PASS" / "Opus FIX").

## 10. Gates
- **J8 gate (FOLDED):** master's validator 0 ERR (map, map + TGC, map + TKL) and the mission-validator 0 ERR on the map
  (A22; the two named throw-gap lines, links 28 and 33, excepted until J12's S7a / S7b land; the pie link 29 has no
  exception), saved under `docs/tallow-fixes/val/`; D0's
  run saved before wave 1 (RULES Intake 5); plan checker PASS; PR T (two), PR G1 and PR G2 checker PASS; laptop sets
  green.
- **Look videos (RULES "Walk pacing", check fix 11):** PR G1 and PR G2 re-light every section, so each carries a 1-2 min
  look video per section it re-lights (W1, W3 in G1; W2, W4 in G2), recorded on the laptop GPU slot (port 4189,
  `E2E_GPU=1`) through Test Runner's queue (the `sector-lights-shots.mjs` pattern: a slow camera path through each
  encounter, lamps on, one circuit cut, one lamp shot), path in the PR body. The light-parity card (Q27, light-realism
  L4, handed to J11) does not exist for Tallow yet (L4 comes after L2's measures): each PR body says "parity card: not
  available yet (light-realism L4)", and LM / GBM run it when it lands.
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
| `missions` (`?missions=1`, `src/core/flags.ts`) | off | Night Shift \| Campaign Build | **2026-10-27** (A26, as `flags.ts:68` and J7; after Michael's Tallow walk; if the walk moves, J7's owner edits `flags.ts:68` in the R1-R2 PR and the orchestrator the ROADMAP row; J8 / J9 edit neither) | Michael accepts the Tallow walk items |
| `coopKit` (`?coopkit=1`; folding into Player's `kitMoves`, kit order item 7) | off | Night Shift \| Campaign Build until the fold, then Player's `kitMoves` | the kit walk's date, set by Player Build in its PR (Player's clips) | unchanged by J8 / J9 |
- No new flag. TD's throw sites exist only in Tallow's layout, behind `missions`. Every J8 change is Tallow data (the map is `unlisted` and boots only with `?missions=1`, `needsMissions`).
  J9's `ShutterDoors` and the notice run only where shutter specs exist (Tallow only); the lift is offered only with
  `coopKit`. Default players see nothing new.

## 12. Walk items (for the orchestrator's card; ranked by risk)
Until J22's lobby entry the walk opens by URL in **two browser tabs** on one PC (a solo mission start is refused, J7
A9): `?autostart=tallowWharf&mode=sector&missions=1&net=local&coopkit=1&mission=threeGreyCoats` (and
`mission=twoKeyLedger`) in both tabs; the first tab hosts, the second joins (the `?net=local` branch,
`main.ts:451-460`). Or Play > Co-op with a partner. Once the kit-flag fold is in, `coopkit=1` becomes the fold's
parameter (expected `kitmoves=`; its PR names it).
- Lights: every lamp works; dark only behind stalls, presses, chests and carts, where you cut a circuit or shoot a lamp;
  each switch is by its door - accept when no lit working space has a dark corner without a cause you can see.
- Closed rooms (your pick, "Yes, night lights only"): the pie shop, clock loft, lane-window loft, strongroom, partners'
  office and shed two have only their night and emergency lights on, like a real shop shut for the night - accept when
  these rooms read as shut for the night, not broken.
- Throws: at the pawn loft and at the lane between the roofs, try to jump the gap alone and fail (the gaps are now about
  4.9 m and the throw carries further at these two spots only, your "Mix of both" pick); the thrown partner unbolts the
  bridge gate for the other - accept when neither can be skipped solo, the long throw looks believable, and nobody is
  stuck on either side. Leave out the pie loft gap: it is still the normal short throw and one player can still jump it
  until the plank bridge comes (your pick); its door into the reading room is locked, so jumping it gets you nowhere.
- The reading room's stair door now only opens from inside (A25): the way in is the throw - accept when that reads as a
  locked library at night.
- Three Grey Coats, the reading room (changed since the page you signed): the one questioning Teale can now leave
  quietly over the west lightwell bridge, opening its gate, or down the lit stair; once that gate or the stair door is
  open, the partner can walk in and question Teale together - accept when that still feels like the mission you signed.
- The clock-mender's door is locked tonight (he is out) - accept when the clock loft reads as a locked workshop.
- If the lead takes D0's defaults: in the night market a caged ladder up to the gallery by the canal steps, its gate
  bolted at the top (the one on the gallery opens it for the other); in the counting house yard the fire escape comes
  down beside the east gate - accept when both look like they belong there.
- The fire-escape bridge over the lane is now a closed cage, its door at the counting-house end - accept when it reads
  as an escape bridge, not a way round the throw.
- The scale-sheet wording for the long throw ("a gap of at most 4.9 m, only at the two named spots") - accept the
  wording, or say how it should read.
- Shutters: alone it will not open; one holds, the other crawls; a guard facing it comes to look - accept when both
  missions finish with no teleport.
- A downed partner across any forced gate is reached in time (within 15 s).
- Medkits (one per section) and hide spots by the takedown spots; the roof hatch is inside a tank room.
- The list of changes since you approved the drawing.

## 13. Hand-offs
- **Guard AI Build:** S2 review (one of PR S's two checkers); the route-runs cause record (G1) may add a "shutter"
  cause next to the door notice; G6 waits for J15's `lookouts` and pairs; PB's "guards notice a laid plank" hook (A13).
- **Marlow Build:** J12 must accept the kit kinds, keep gate reach on throws and pulls, and give spaces a light-type
  field (D1 uses `note` until then); the G157 level-design text (J8 plans to the adopted wording). TV is unblocked by
  M2 and is J12 A27 (S7a / S7b: `exception: "long_throw"`, the 4.9 m cap, spots = links 28 and 33, checked); the
  sheet row's wording goes to Michael on the walk card; tell Marlow that D0 deletes link 30 (A29), so the C5 link
  becomes 32 (its spots match by name); J12's `plank_bridge` kind (A25) is PB's (A13). Marlow Yard's throw drills are
  unaffected by TD (no sites; its tests and `e2e-ctcourse` are in PR T's run).
- **J7 (BEAT owner; same lead, `docs/missions/prototypes/*/BEAT.md`, J7 R1 / PR D):** P1's TGC step-3 line (way in,
  way out, joint questioning, the locked clock door, check fix 3) for the BEAT's roles section; D0's ruled split
  defaults as BEAT lines (TGC: A unbolts the gallery ladder gate for B; TKL: none if the G3 route line is taken, the
  overwatch-wait line if not); Teale's spook point stays in the clock loft (respawn, no walk), and its story line ("he
  let himself in with the clock-mender's key") is J7's call.
- **Player Build:** the plank move's length and seat rules for PB (A13, A28's east-half rule).
- **Sector Ops Build (light-realism):** LP uses research/bands.md as drafted; ask them for L3-H `tallow.md` or accept LP
  as its stand-in; S1 asks before any `lightField.ts` / `lampBake.ts` edit; L0's `lux-grid.mjs` feeds LM / GBM.
- **Player Build (team moves owner):** Campaign Build sends it TD's brief before TD starts (lead ruling fix 1): TD
  changes only the throw functions in `teamMoves.ts` and `requestThrow` in `teamController.ts`, default unchanged; its
  J24 `feature/coop-kit` claims the same files (claims-check, section 4). The `coopKit` fold changes the e2e URL params
  and the offer gate in `teamController.ts`; order on that file: fold, TD-b, S1 (section 5).
- **Orchestrator:** PR C split membership for G1 / G2 / S (C8 / C9 or new members); no `big-pr` needed for them; the
  ROADMAP `missions` flag row (2026-10-27, A26) when the walk date moves; "tallow-fixes A24" names J8's throw-length
  entry (not #372's A24); the walk card items of section 12, including the long-throw row's wording for Michael.

## 14. Risks
- **Interiors become lit everywhere** (every working interior band reads 0.79 or more): stealth routes may lose their
  gaps. Mitigation: M1's closed spaces, cover, switches by doors, cut circuits and shot lamps; LP proves a shadow route
  per encounter; the PR G1 checker blocks a section whose declared routes lose their last real gap.
- **The long throw** (A24): 5.8 m in the same 1.0 s flight (`TEAM.throwTime`) is a faster flight than today's; the arc
  must clear the lightwell and the lane (G2's `throwCheck`), and the look is a walk item. If it reads wrong, a per-site
  flight time is a later change (an Opus `src/net` slice with two checkers if the flight's timing is read in `src/net`).
- **Michael rejects the long-throw wording on the walk card** (M2 approved the spots, not the row's text): Marlow
  rewords the row; the geometry and the site lengths stay. If he reverses M2 itself, the throws revert to 3.2 m and stay
  solo-jumpable (TW17) until another forcing is chosen; A4 / A28's geometry is data, so the revert is small.
- **The pie gap stays solo-jumpable until PB** (M2): a lone player reaches only the clock loft (A29 locks its door);
  after a broken rule Teale respawns there, so the retry route through the pie loft is not yet forced. Flagged on the
  walk card and in its test; PB closes it.
- **D0's split defaults add geometry** (the gallery ladder, the moved fire escape): the lead rules before wave 1;
  rejected, the fallbacks are written (D0) and the TKL one leaves one split ERR for the orchestrator.
- **Fall-ins after widening:** the lightwell drain and the lane keep a way out; G2's tests assert it.
- **The pawn loft loses 2.4 m** (A28, M2: the pie loft keeps its depth until PB): its furniture, the thrower's run-up (runner 1.3 m behind the thrower) and the
  fire-stair heads must still fit; LP checks before G2.
- **Docs in two branches** (A20): B0 / B0b bring TW23 in before D0, D1 and P1; the graph does not move.
- **e2e coordinates:** E8 travels with the geometry it follows (PR G2), S4 after E8.
- **Shutter light and nav** touch shared engine files: S1 stops and asks before a lighting-owner file; the nav block is
  map-local (only where specs exist).
- **CPU at 100%:** waves wait; full burn resumes when the orchestrator lifts the pause.
- **Provisional bands** may move after Michael's click: A2's re-tune is data only.
- **Asset licences:** a wrong licence is an IP and sale risk; FA keeps every candidate's URL and licence text reference,
  an Opus checker reads each licence before any import, and nothing downloads without the lead's go.

## 15. Open questions for the lead
Answered (lead answers below and the fix-round rulings); A1 and A24's one-clicks answered by Michael ~20:45 (M1, M2).
Open after fix round 2:
- D0's split defaults (section 6 D0: the TGC gallery ladder and legs, the TKL measured legs and moved fire escape):
  the lead rules before wave 1.
- `EGRESS.md`'s north-range row: is the bridge route to the south lofts' fire stair a second staircase under 16.2.7, or
  does G2 add the clock loft back stair? (LP proposes; Marlow, as the level-design owner, may rule.)

Original questions (kept for the record):
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
Owned: `src/world/maps/tallowWharf.ts`, `src/world/maps/tallowWharfKit.ts`, `tests/tallowWharf/shell.test.ts`,
`tests/tallowWharf/helpers.ts` (step 6's new function only), `tests/tallowWharf/levelGap.test.ts` (new). Do not
edit any section file (`tallowWharfW1-4.ts`), `tallowWharfSectors.ts` or `tallowWharfMissions.ts`.
Read first: CLAUDE.md hard rules; level-design 5.5 and 12.1 (medkit stations); light-realism research/bands.md sections
2 and 4 (`git show origin/feature/light-realism:docs/light-realism/research/bands.md`); `tallowWharf.ts` (all);
`tallowWharfKit.ts:100-160`; the campus map's theme (`src/world/maps/campusOps.ts`, its `theme` block) and how
`theme.ambient` / `theme.lightLevel` reach the light field (grep `lightLevel` and `ambient` under `src/world/`).
Do:
1. `tallowWharf.ts` theme: set `ambient` and `lightLevel` (and only those) to the campus theme's values, with a comment
   "night floors as the campus (Q2 'Never', G329; light-realism research 2 and 4): a cut circuit reads dark". If the
   campus has no direct equivalent of a field, stop and report it (do not invent a value).
2. `tallowWharfKit.ts`: add an optional `medkits?: { pos: Vector3; yaw: number }[]` to `WharfSection` with a doc comment
   (G98, "a wall station with a real reason"; hold 0.6 s, +40, single use, level-design 12.1); `emptySection` returns
   `medkits: []`. Optional so `W1`-`W4` compile untouched (polish 5); do not edit them.
3. `tallowWharf.ts` layout: `medkitWalls: SECTIONS.flatMap((s) => s.medkits ?? [])` (setup time, not a hot path).
4. `shell.test.ts`: the theme's two values equal the campus theme's; `builtWharf().layout.medkitWalls` equals the
   concatenation of the sections' `medkits`; every existing shell test passes unchanged.
5. Only after the lead says TD-a is merged into your base (A24): `WharfThrow.dist?: number` (doc comment: the site's throw
   length, Q23, A24) and the layout's `throwSites`: for each section throw with `dist`, `{ x: thrower.x, z: thrower.z, dx,
   dz, dist }` with (dx, dz) the unit direction runner -> thrower; `shell.test.ts` asserts `throwSites` lists exactly the
   throws that set `dist` (none until G2 sets them; M2 gives two, the pawn and lane throws, and G2 pins that). Push
   steps 1-4 first as their own commit.
6. The level-and-drop gap check (check fix 2; section 6 G0 detail has the full rule): in `tests/tallowWharf/helpers.ts`
   (add this function only; G2 owns the file from wave 1) `export function soloLevelThreats(solid, q: CoopTop, skip =
   () => false, extra = 0.2): string[]`, a twin of `soloTopLandingThreats` that keeps tops at or above `q.top - 0.05`,
   drops the mantle skip, adds the in-air grab against stage edges that are not `noLedge`, follows the jump's arc for
   the flight and counts a piece as a block only when it rises over `vaultMax` (1.25, `scripts/kestrel/facts.json`)
   above the take-off or is deep enough to stand on. Import the reach functions and constants from
   `tests/helpers/soloJumpReach.ts`; do not edit that file. Report strings in the same form as the existing helpers.
   New `tests/tallowWharf/levelGap.test.ts` with the six synthetic cases of the detail (3.5 / 3.6 m level; 5.0 / 5.1 m
   from 8.4; a 1.1 m railing does not block, a 1.9 m `noLedge` screen does; a 4.8 m level top against a stage edge
   that is not `noLedge`).
Checks: `npx vitest run tests/tallowWharf/ --maxWorkers=2`; `npm run typecheck:fast`.
Done looks like: checks green; the diff touches the owned files (plus the reported one-liners, if any).

### Brief S1: shutter world wiring (Opus 5.5)
Owned: `src/world/shutterDoor.ts`, `src/world/world.ts`, `src/game/teamController.ts` (the `update` call after the kit
ticks and `resetKit`), `tests/shutterWiring.test.ts` (new). `src/game/gameState.ts` only if J7 PR F is already merged
into your base (the lead says), and then only the arming call site near `:793` and one `resetKit` line in
`checkpointReset`. Do not edit `src/game/kit/shutter.ts` (S2 owns it), any map file, `src/net/**`, `src/ai/**`,
`src/world/lightField.ts` or `src/voxel/lampBake.ts`.
Order (check fix 6, lead answer 6): build and push steps 1-3, 5 and the pure tests now. Step 4 and the reset (step 7)
touch `teamController.ts`: start them only when the lead says the kit-flag fold (framework STATE item 7, on
`feature/mission-engine-flg-gb6`, merged into `feature/mission-engine` by Campaign Build) and TD-b are both in your
base. The `gameState.ts` lines wait for J7 PR F; until then report the exact lines for the lead.
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
7. Section restart (A27): `TeamController.resetKit()` calls S2's `resetShutter(d)` for every shutter device (index loop),
   called from `GameState.checkpointReset` (one line; `SectorMode.restartSection` calls `checkpointReset` on every
   section restart, `sectorMode.ts:1182-1215`). Read how a client mirrors device state (`src/net/kitNet.ts`): if the
   host's state reaches it by the wire, stop there; if not, stop and report (an Opus `src/net` slice, A19). Test:
   `resetKit` leaves every shutter shut, no run, mark cleared. Needs S2's `resetShutter` merged into your base.
Checks: `npx vitest run tests/shutterWiring.test.ts tests/kit/shutter.test.ts tests/kit/registry.test.ts tests/kitNet.test.ts tests/tallowWharf/shell.test.ts --maxWorkers=2`; `npm run typecheck:fast`.
Done looks like: checks green; with S3's map swap a lone player cannot pass a shutter and a held one lets the partner
crawl (S4 proves it on the laptop); no change on any map without shutters.

### Brief S2: guards notice a held shutter (Opus 5.5)
Owned: `src/game/stealthSystems.ts` (a new private method, its timer field and one call), `src/game/kit/shutter.ts` (the
pure helper, a `noticed` field on `ShutterDevice` and `resetShutter`, nothing else), `tests/shutterNotice.test.ts` (new),
`tests/kit/shutter.test.ts` (only if a helper test fits there). Do not edit `shutterDoor.ts`, `world.ts`, `teamController.ts`, `src/ai/**` or `src/net/**`.
Read first: DECISIONS G41 (doors noticed open), G44 (poor sight above), G143 (every detection explainable);
`src/game/stealthSystems.ts:20-40`, `:610-680` (`noticeOpenDoors`, `fixedUpdate`); `src/game/kit/shutter.ts:20-30`,
`:80-160`, `:270-295`; Player conformance R39 (`git show origin/master:docs/conformance-player/CONFORMANCE.md | grep -n R39`).
Why: R39 / J9: a held-open shutter is invisible to guards today; G41 makes guards notice a door open that should be shut.
Do:
1. `shutter.ts`: `export function shutterNoticedBy(d: ShutterDevice, ex: number, ey: number, ez: number, yaw: number):
   boolean`: true when `d.visible`, the guard is within `SHUTTER_NOTICE.range` of `shutterNoticePoint`'s x / z (use
   `hyp2`), within 1.5 m of the shutter's floor height, and facing it (`(sin(yaw) dx + cos(yaw) dz) / dist >=
   SHUTTER_NOTICE.cos`, the door rule, `stealthSystems.ts:635`). No allocation (a module-level scratch point).
2. `shutter.ts`: a numeric `noticed` field on `ShutterDevice` (the `opens` count last noticed), set to `-1` where the
   device is made, so the per-device memory is preallocated with the device (no Map, nothing built in the fixed step);
   `export function resetShutter(d)`: drop shut, end any lift run, `noticed = -1` (S1 calls it on a section restart, A27).
3. `stealthSystems.ts`: a field `shutterNoticeT` and `private noticeOpenShutters(dt: number): void` with its **own timer**
   (counted down every fixed step, fires every `DOOR_NOTICE_EVERY`): do not reuse `noticeT`, which only counts inside
   `noticeOpenDoors`, itself called only while a player-opened door exists (`stealthSystems.ts:619-621`, `:665`). Call
   it from the fixed step beside the door notice, host only (where the door notice runs); it returns after one length
   check when `g.team.devices.list` is empty. Index loops only (no `for...of`, closures or new arrays): for each device
   that `isShutterDevice`, is `visible` and has `opens !== noticed`, the first calm, alive guard that passes
   `shutterNoticedBy` and `g.ballistics.clear(eye, noticePoint, MASK.SIGHT)` (reuse the preallocated `noticeA` /
   `noticeB`) calls `e.hear(x, z, SHUTTER_NOTICE.range + 2)` and sets `noticed = opens`. Nothing grows or allocates per
   tick. A comment cites G41, R39 and A18.
4. Tests: `tests/shutterNotice.test.ts` for the helper (in range and facing; behind; too far; another storey; closed;
   `visible` false), the once-per-opening rule (`noticed`), a notice with **no door open anywhere** (the own timer runs),
   and `resetShutter` (shut, no run, `noticed` -1).
Checks: `npx vitest run tests/shutterNotice.test.ts tests/kit/shutter.test.ts --maxWorkers=2`; `npm run typecheck:fast`.
Done looks like: checks green; the door notice code path unchanged; with no shutter devices the new method returns after
one length check; the report states that nothing grows or allocates per tick.

## Lead answers to the open questions (Campaign Build, 2026-10-25 ~19:10)
1. B0: merge origin/feature/mission-framework into the engine at J7 R0 (fewer conflicts with J7 R1's graph edits).
2. TW23 (running now, feature/tallow-spec, stacked on #372) moves the Tallow spec into the map's own folder; P1 and the
   graph-reading tests follow TW23's paths once it lands (re-pin in P1's strict brief).
3. A1 (narrow reading of Q2 "Never"): stays assumed and logged; sent to the orchestrator as a one-click question for
   Michael by day. Build to A1 meanwhile; undo per A1. (Superseded: Michael picked it ~20:45, M1.)
4. Re-light now to light-realism's draft table (A2, provisional); re-tune when Michael clicks the band table.
5. PR S keeps two Opus checkers of ours; one is offered to Guard AI Build through the orchestrator, not blocking.
6. teamController.ts: the kit-flag fold (coopKit into Player's kitMoves, orchestrator order ~18:30) goes first; S1 after.
7. PR C split membership: the orchestrator's call.
8. FA: docs-only scouting list may run after the plan check passes, lowest priority; no download without the lead's go.

## Fix round 1 (Opus planner, 2026-10-25 ~20:30; plan check 1 and the lead's rulings)
Later rulings win over the lead answers above where they differ: TW23 does not move the graph (answer 2 is superseded
by A20); answer 6's order now also covers TD (section 5).

| Check item | Answered in |
| --- | --- |
| Fix 1 throws cannot be forced | Section 2 "Throws" (worked numbers: (a) fails at every allowed height); A4, A24, A28; slice TD (PR T: claims, ~250 lines, Campaign Build / Opus, two Opus checkers, laptop `e2e-coop e2e-netmove e2e-ctcourse` + wharf suites); TV hand-off to Marlow; coordination with Player Build and Marlow Build (section 13); G2's done line tests 5.8 m against both solo models with the 0.2 m margin |
| Fix 2 way backs checked for jumping | A5 (enclosed bridges, gate at the approach end), A25; G2 / G3 / G4 done lines (both threat checks over every near-side surface, the lip audit extended, `w2.test.ts:212` one-way pairs); LP briefs place every barrier at the approach end |
| Fix 3 graph validated before geometry | Slice D0 (wave 0, Opus) with the fix round's draft and master-validator numbers (section 2); D1 becomes "graph matches the build"; J8 gate (section 10) |
| Fix 4 restart and shutters | Section 2 restart fact; A27; S1 step 7 (`resetKit` from `checkpointReset`), S2 `resetShutter`; `tests/shutterWiring.test.ts`; S4 restart line |
| Fix 5 S2 hot path and timer | S2 detail and brief: `noticed` field on the device, own `shutterNoticeT` timer, index loops, the no-door-open test, `:635` |
| Fix 6 lead answer 6 in the body | Sections 4, 5, 7; S1 row, detail and brief (late hunks after the fold and TD-b; who merges the fold); E8 / S4 / walk URL follow the fold's parameter |
| Fix 7 walk and pages hide A1 | Section 12 closed-rooms item; P1's lighting line in plain English with the undo, until Michael's one-click on A1 |
| Fix 8 G157 rule 10 | Section 1 row 10; LP's `EGRESS.md` table (per building, two stairs, roof access, fixes in G1 / G2 / G3); A7's secure-building reason |
| Fix 9 TW23 and the graph path | A20 (graph stays in `campaign-map/`, helpers.ts:66 unchanged, B0 at J7 R0, B0b after TW23; D0 / D1 / P1 after the merge that brings TW23 in); section 4 claims (`docs/tallowWharf-map/SPEC.md`) |
| Fix 10 process items | `docs/tallow-fixes/BRIEF.md`, `docs/tallow-shutters/BRIEF.md` (new); A26 and section 11 (`missions`, Campaign Build, 2026-11-01); claims-check run and listed (section 4) |
| Fix 11 look videos | Section 10 "Look videos" (per section, laptop 4189, path in the PR body; parity card not available yet, L4) |
| Polish 1 affected suites | Section 8 |
| Polish 2 old-rule tests | G2 (`w2.test.ts:292`, `:212`), G3 (`w3.test.ts:387`) |
| Polish 3 S3 wave | Section 6 row, section 7 (wave 4; S4 wave 5) |
| Polish 4 vantages, crane lamp | Section 1 row 6; G1-G4 done lines; G3 crane lamp |
| Polish 5 `medkits` | G0 detail and brief (optional field) |
| Polish 6 approved drawing kept | P1 (`PLAN-approved.svg`), claims |
| Polish 7 PR S checker line | Section 9 |
| Polish 8 switch links | Section 1 row 7; LP |
| Polish 9 PR C gate, forward merges | A21 |
| Polish 10 Q2 quote | Section 0 |
| J7 re-check rulings (coordinator) | B0 at J7 R0 with the rewards removal (A20, section 6 B0 row); P1 does not rewrite TGC / TKL pages (section 4, P1); J7 numbers re-cited to J7-PLAN cc66755e (J7 A11 J8 owns geometry / lights / pages, A14 stacking, A20 B0 at R0; R6 through B4's `objectiveLines` hook) |

## Fix round 2 (Opus planner, 2026-10-25 ~21:30; plan check 2, Michael's M1 / M2, the lead's rulings)
Later rulings win over earlier text where they differ: M1 replaces A1; M2 narrows A4 / A24 / A28 to two throw spots;
J12 A27 (`exception: "long_throw"`, a 4.9 m gap cap) replaces round 1's `throw_dist` link field for TV.

| Check item | Answered in |
| --- | --- |
| Fix 1 fold M1 / M2; the pie-gap bypass | Section 0 (M1, M2, M6); section 1 row 1; section 2 "The pie gap under M2"; A1 -> M1 (walk line, P1 lighting line, section 15, BRIEF; no "until your one-click" left); A4, A5, A13 (PB: owner, files, J12's `plank_bridge`, Guard AI's hook), A22 (two named lines, links 28 / 33), A24 (M2 = approval at the two spots only; the row's wording goes to Michael on the walk card; TV unblocked = J12 A27), A28 (west half only; east-half rule for PB), **A29** (clock door locked both sides: `W2_BOLTS`, the graph, the G2 test); section 6 TD / G0 / G2 / D0 / D1 / PB; section 10; section 12 throws item (leaves the pie gap out and says why) |
| Fix 2 level and higher take-offs | Section 2 table (-3.9 / -2.4 / -2.0 m columns: 4.88 / 5.80 at -3.9) and the helpers' blind spots (level skip, mantle skip, vaultable railings); A28's rule by height; G0's `soloLevelThreats` + `levelGap.test.ts` (claims, wave 0, brief step 6); G2 / G3 done lines name it for the pawn stage and the C5 stage; the arcade roof edge at z 67.4 or a 1.9 m screen; the fire-escape deck cage (found here) |
| Fix 3 the signed TGC page | P1's TGC pointer line (way in, way out, joint questioning, the locked clock door); section 12 TGC walk item; section 13 J7 hand-off (BEAT owner); no rule text rewritten |
| Fix 4 D0 split defaults | Section 6 D0 "Split defaults": the validator's bolt blind spot; TGC legs + the gallery ladder (26.4 / 21.9 s, 17%; reach 12.7 s, real bolts named); TKL measured legs + the moved fire escape (22.7 / 20.5 s, 10%); fallbacks; the lead rules before wave 1, Michael only via the walk card; leg / role lines to J7; modelled runs in `scratch/campaign/j8-j9-val/fix2/` |
| Coordinator note (Marlow, J12 A27) | A22, A24, section 6 TV / D0 / D1, section 10, section 13: links 28 and 33 checked (0-based, master and engine, both `team_throw`); `exception: "long_throw"` + `width` 4.9 once S7a / S7b land, named ERRs until then; the pie link plain 2.5 m; A29's deletion renumbers link 33 to 32 (spots match by name) |
| Polish 1 flag date | A26, section 11: 2026-10-27; J7's owner edits `flags.ts:68`, the orchestrator the ROADMAP row; J8 / J9 edit neither |
| Polish 2 walk URL | Section 12: two tabs, `&net=local` (`main.ts:451-460`, J7 A9) |
| Polish 3 W3 guard 1's beat | G2 (sectors-file owner): row, detail item (6), `sectors.test.ts` line |
| Polish 4 M6 citation | Sections 0, 4 and P1 cite M6 (framework 67464e03); A24 is "tallow-fixes A24" to the orchestrator |
| Polish 5 claims-check | Section 4 rerun on the final blocks (`fix2/claims-*.txt`); no `world.ts` on PR T; J7's block now compared |
| Polish 6 line numbers | Section 2: `tallowWharf.ts:80-81` |
| Polish 7 B0 done | A20 and the B0 row (925fa3784 + e4eace3bd); D0 waits only for J7 PR D and B0b |
| Polish 8 throw spot | LP: G2's brief marks the thrower's spot (or deepens the stage) |
| Polish 9 C5 run-up | A28 C5 and LP: clear of the roof hatch (x 71.4-72.6) |
