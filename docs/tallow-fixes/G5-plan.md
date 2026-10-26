# Tallow G5 plan: the TGC split fix (D1 section fixes 6-7) and the D1 rulings
Owner: Campaign Build (Opus planner, 2026-10-26, fix freeze: plan and held brief only). Brief:
`C:/NightShift/scratch/campaign/cq/campaign-tallow-g5.md` (held). Sources read: D1 brief + report
(`C:/NightShift/scratch/campaign/d1-brief-blocked.md`), `feature/tallow-d1` c8f33dcf3 (`docs/tallow-fixes/val/D1-note.md` sections 6-8, 14 and the
measuring output), S11 `scripts/level-validate.mjs` on `validator-port-c2` (:801-900 splits, `level-graph-lib.mjs` :251-273),
master `level-design.md` 11.3-11.11 (:284-331), `metrics.json`, `tallowWharfW1.ts`, `tallowWharfSectors.ts` (W1_BOLTS,
W1_ROUTES), `EGRESS.md`, J8-J9-PLAN "TGC parity and reach" (:766-780), TGC BEAT and SIGNOFF, ROADMAP Decided (Tallow).

## 1. Why D1 is stuck (two separate faults)
- **Parity is a merge-point fault, not a measuring one.** The graph rejoins both legs in the market (the first space
  both last leg spaces reach, `level-validate.mjs` :837-839). Door to door that is 42.0 s (boost, the 31.4 m gallery,
  the office, the warden's stair) against 16.0 s (the tea stall and straight out): 62%. No geometry inside "as drawn"
  closes that gap. Michael's signed-off step 2 (TGC SIGNOFF.md, 3.2) ends the split at the fish hall shutter ("one holds
  it, the other crawls under"), and the BEAT has B "tail the coats" after the tea stall. Measured to that merge, the
  legs are even.
- **Reach is a geometry fault.** G1 put the ladder's bolt at the foot inside the cage (LP pick 1: a ladder top-out
  ignores door leaves), so D0's design line "A unbolts the ladder gate on arrival" (J8-J9-PLAN :770-775) became a 14 s
  climb down and back. And a 4.5 m ladder takes 10.0 s to climb (engine), so even an open ladder gives B 14.9 s from the
  listening spot: too thin to call a fix.

## 2. Options weighed
| Option | Parity | Reach | C1 | Verdict |
| --- | --- | --- | --- | --- |
| (a) J12 message fix only | no change | ERR stays (it is real) | kept | needed, not enough |
| (b) model "A opens the cage door" | worse (+14 s on leg a: climb down, unbolt, climb up) | 14.9 s from the stall | kept | no |
| (c) warden's stair foot unbolted | no change (62%) | 16.5 s measured | **lost** (solo way into the office) | no |
| (d) cage door plain | no change | 14.9 s | **lost** (solo twin of the boost) | no |
| Merge moved to the fish hall only | 9-11% | fails: B in the market has no way up | kept | half |
| Ladder + head pen (gate set back from the top-out) | with merge: 9-11% | B at the clock arch: 22 s (10 s climb) | kept | no |
| **Chosen: merge at the fish hall + the caged ladder becomes a caged stair whose head gate A opens on landing** | 9-11% | worst 11.8 s | kept | **yes** |

## 3. The chosen fix (G5: geometry in G1's file + the W1 graph lines)
**Geometry (map coordinates, metres; `tallowWharfW1.ts` :140-148 replaced).** Remove the ladder (6.45, 15.0), its cage and
foot door. Build the market warden's gallery stair: an enclosed iron core on the deck's east face at its canal-steps end,
outer x 6.0-7.5, z 14.4-24.4, walls to y 6.9, roofed (y 6.9-7.0), every box `noLedge`.
- Head landing x 6.0-7.4, z 14.5-15.8, solid, top 4.5 (flush with the deck x 3.6-6.0).
- Flight `stairSteps(4.5)` (27 risers, 7.7 m run, the warden's stair's pitch, :182-184), 1.3 wide (x 6.05-7.35, centre
  6.7), foot at z 23.5 (y 0) rising south to the landing at z 15.8: `b.stairs(6.7, 15.8 + len/2, 1.3, len, 4.5, steps, IRON, PI, 0)`
  (yaw PI rises south, as W3 :218). Normal pitch on purpose: the nav grid does not walk steep flights (D1 open item 6).
- Foot: an open archway in the north wall (z 24.3-24.4), x 6.2-7.2, 2.1 high, facing the market's west strip. No leaf.
- Head gate: a 1.0 m door in an iron screen along the deck edge (x 5.95-6.05, z 14.4-24.4, y 4.5-6.9), gap z 14.6-15.6,
  centre (6.0, 4.5, 15.1); bolted on the deck side (`W1_BOLTS` slot 2 keeps its index: `side [-1, 0]`, `w 1.0`). The C1
  boost lands at (4, 4.5, 14.6), 1.0 m from the bolt's reach (x 4.8-6.0): A unbolts it as his first move.
- Clear of everything that matters: LIP_STEPS (x 2.25-5.75, z 14) and LIP_MARKET (x 6, z 26.5-31.5, 2.1 m north), the
  lamp trimmer's beat (x 11), W1_ROUTES (:256-268), the canal-steps opening (x 7.5-12 left), the hide spot (12.4, 15.3).
- Story: the warden walks the gallery on his rounds and shoots the stair's head gate from the deck before going down his
  own stair. Walk card line (A12): "the gallery's caged ladder is now a caged stair; the one boosted up unbolts its gate".

**Split declaration (graph).** Legs a = [`w1-gallery`, `w1-warden-office`], b = [`w1-tea-stall`, `w1-market`] (B listens,
then tails the coats to the clock arch); the validator's rejoin becomes `w1-fish-hall` with no rule change. Leg a leaves
by the inspection hatch (link 8, W1_ROUTES route 0's own line). `assist: "tgc-leads"` moves from link 4 (a boost is not
one leg's act for the other) to the new stair link (A opens it for B). The gallery stays `overwatch:tgc-leads`: its two
standing vantage points now watch B's leg (the market) instead of a tea stall they cannot see.

**Expected numbers (planning; G5 measures, at 1.3 m/s legs, 3.0 m/s reach).**
| Check | Graph after G5 | Measured |
| --- | --- | --- |
| Leg a | link 3 6.2 (F to spot 4.6 m + boost 2.6) + link 6 24.2 (31.5 m) + link 8 ~9.5 = **39.9 s** | door to door 2.6 + ~1 unbolt + 24.2 + ~9.5 = **37.3 s**; F to shutter ~51.7 s |
| Leg b | link 1 3.85 (5 m) + link 2 16.2 (21 m) + link 9 25.0 (32.5 m) = **45.0 s** | door to door 0 + 16.0 + 24.9 = **40.9 s**; F to shutter ~55.1 s |
| Parity (max 20%) | **11%** | **9%** door to door, 6% to the shutter |
| split_max_s 90 | 45.0 | 40.9 |
| Partner reach (max 15) | worst 10.5 s (tea stall -> market -> stair); a side worst 8 s | B listening spot -> deck 10.9 s; B at the arch -> deck **11.8 s** (worst); A desk -> market 3.1 s (deck-edge drop) or 5.2 s (stair); A hatch 3.7 s |
| Gate reach (C1 way back) | gallery -> market (stair 3.5 / drop 2) -> canal steps 7.8 = 9.8 s | unchanged in kind |
| Assist / overwatch | stair link / gallery | - |
| C1 forced | no solo arc up (stair bolted from the deck) | soloNav: gate shut, no path from (7,0,10), (16,0,10), (22,0,41) to (4,4.5,20) |
Uncertainty about +-1.5 s per leg (the unbolt and the hatch drop are engine estimates). Margins: parity 9 points, reach 3.2 s.

## 4. Rulings
1. **(5) Climb time in `time_s`: yes.** A climb kind is not a walk kind (`level-graph-lib.mjs` :31-34, `linkTime` :268-273),
   so `time_s` is the only time the validator reads: it carries the engine's door-to-door traversal. E6 plant ladder
   `w2-lane-window>w2-arcade-roof`: `time_s` 15.1 (8.9 s climb). E5 is replaced by G5's stair (a walk kind: `length`, no
   `time_s`). The orchestrator records the engine fact (ladder 0.51 m/s + 1.2 s entry and top-out) in level-design 12 by
   its engine-fact clause.
2. **Open item 1, tea stall: `custom`, not deepen.** It is an open-air stall between the canal rail (z 6) and the market
   (z 14); break_room was D0's proxy. Deepening means moving the market room's edge and the counter for 0.5 m. Graph:
   area [12,6,20,14], size [8,8,12], `room_class` custom (a WARN with its reason, as the other five).
3. **Open item 5, story: both stand.** The warden is out on his rounds (pick 13) and locks his stair's foot behind him
   with his key from the market side; the stair side has a thumb-turn. Mechanics unchanged (opens from the stair side
   only, W1 slot 0). Text: EGRESS :53 and link 7's `reason`.
4. **Open item 3, TKL from the C5 landing: a real breach.** A split starts where the partners part; the fork-space
   convention hides the roof walk (A lands in the corner bay and opens the bridge door; B crosses later: 29-34% apart).
   Not a G5 item. Fix order for the lead before the J8 gate: (i) measure TKL from the parting point (the bridge door's W3
   side, (82, 8.4, 69.2)) to each key post (the synced turn is the merge's joint action, not the passage doors); (ii) if
   over 20%, a J7 BEAT line first: the partner thrown over C5 takes the long east leg while the thrower crosses by the
   bridge (estimate 15-18%, to be measured); geometry does not help (moving the fire escape head west moves its foot
   away from the gate: net about -1 s).
5. **Section fixes 1-4.** 1 (`w3-roof>w3-west-wing` 13.9 s) and 2 (`w3-east-yard>w3-east-wing` 2.0 s): accept and write
   (TKL graph parity then 23.5 vs 19.6 s, 17%; reach 13.3 s). 3 (`w3-roof>w3-east-wing`): write `time_s` 14.8; the 1.2 m
   flights are geometry (`fire_stair_w` 1.3 is an ERR-level size): a later small W3 brief (G6) widens the core 0.2 m
   east (inner x 112.6-115.0 is 2.4 m today, W3 :210-220); the graph keeps 1.3 until then, listed. 4 (`w2-arcade>w2-reading-room`
   1.7 m): accept and write 1.7; `open_stair_w` is WARN-level, the stair hall is as Michael approved it; P1 writes the reason.

## 5. The validator's part (J12, Marlow Build): note to send
> Tallow G5 needs two S11 changes in `checkCoop` partner reach (`level-validate.mjs` ~887-900 on validator-port-c2):
> 1) the walk from `src` is the reviver's, so the ERR should read "a partner downed in <other leg> cannot be reached from <src>" (it names the wrong end);
> 2) a `bolted` link carrying `assist: "<split>"` whose bolt side (`to`) is a leg's first space counts as open both ways in that split's reach only (the leg opens it on arrival: 11.6's "ladder kicked down"), never in forced-gate, solo-twin, rejoin or gate-reach checks; until it lands S11 keeps one named tgc-leads reach ERR.

## 6. D1 order
Merge D1 as is, with the TGC lines open and named as G5's. Its counts, lighting, rooms, vantages, checkpoint and exit
lines do not depend on W1's split. G5 shares `graph.json` with it, so it must start after D1, and a D1 re-run after G5
would redo work that does not change. G5 carries its own W1 re-measure (D1's appendix test is the template), so no D1b.
D1's "0 ERR" bar moves to G5's Done for the tgc-leads lines.

## 7. Order of work after the freeze
D1 merges -> G5 (cloud, Sonnet, from the brief) -> fresh checker -> J7 BEAT line ("A unbolts the stair's head gate as he
lands") -> Marlow's two S11 changes -> TKL measure (ruling 4) -> G6 (bulkhead width).

## 8. Assumptions (assume and log; none loosens a Michael-only rule)
- **A1** Reach is measured from each leg's farthest route point to the nearest walkable point of the other leg's spaces
  (11.6 "reaches the other leg"; the validator's space-to-space walk; D1's method). Risk: a measure from every nav cell
  of the market (its NE corner) reads about 15 s. Undo: re-plan with a second way up in the north (none fits with C1).
- **A2** A gate a leg opens as its first move counts as open for that split's reach (the standard's own "ladder kicked
  down", 11.6). Undo: drop `assist` from the stair link; the reach ERR returns.
- **A3** The merge is the fish hall shutter (signed-off step 2), so the market is in leg b. Undo: remove the market's
  `split:tgc-leads:b` tag (rejoin falls back to the market, parity fails).
- **A4** Both legs are timed from the start point F (7, 0, 10), where the partners part (links 1 and 3). Undo: door to
  door from the fork's doors (9%, still within).
- **A5** The ladder becomes a stair: a J8 fix inside the approved drawing (A12, walk card). Undo: revert G5's W1 hunk.
- **A6** Tea stall `custom` (ruling 2). Undo: a G slice deepens it to z 14.5 with the market room from z 14.5 over x 12-20.
- **A7** Story fix by text only (ruling 3). Undo: text.
- **A8** Climb `time_s` carries the engine time (ruling 1). Undo: restore 5 on E6.
- **A9** Section fixes 1, 2, 4 accepted, 3 split into time (accepted) and width (G6). Undo: per line.
- **A10** D1 merges first; G5 re-measures W1 itself. Undo: hold D1, run D1b after G5.
- **A11** TKL item 3 goes to the lead / J7 (ruling 4), not G5.

**Michael questions: none.** Nothing here relaxes a limit (20%, 15 s, 90 s, C1). The stair goes on the walk card (A12).
