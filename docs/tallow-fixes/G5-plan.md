# Tallow G5 plan: the TGC split fix (D1 section fixes 6-7) and the D1 rulings
Owner: Campaign Build (Opus planner, 2026-10-26, fix freeze: plan and held brief only). Brief:
`C:/NightShift/scratch/campaign/cq/campaign-tallow-g5.md` (held). Sources read: D1 brief + report
(`C:/NightShift/scratch/campaign/d1-brief-blocked.md`), `feature/tallow-d1` c8f33dcf3 (`docs/tallow-fixes/val/D1-note.md` sections 6-8, 14 and the
measuring output), S11 `scripts/level-validate.mjs` on `validator-port-c2` (:801-900 splits, `level-graph-lib.mjs` :251-273),
master `level-design.md` 11.3-11.11 (:284-331), `metrics.json`, `tallowWharfW1.ts`, `tallowWharfSectors.ts` (W1_BOLTS,
W1_ROUTES), `EGRESS.md`, J8-J9-PLAN "TGC parity and reach" (:766-780), TGC BEAT and SIGNOFF, ROADMAP Decided (Tallow).
**Pointers** (fix round 1): every map, test, graph and doc line is on origin/feature/mission-engine 7c0ddfa48 (G5's
base family: BRIEF A30, G5 builds after member (d)); every G5 file is byte-identical there to tallow-fixes-2 05302cc94.
Validator lines are on validator-port-c2 19de11b42 (S11). S3 lands before G5 and moves W1 / w1.test.ts lines: the brief
says find by text.

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
| **Chosen: merge at the fish hall + the caged ladder becomes a caged stair whose head gate A opens on landing** | 9-11% | worst on B's route ~12.3 s (market's far corner ~16.3 s: G5-Q1) | kept | **yes** |

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
  centre (6.0, 4.5, 15.1); bolted on the deck side (`W1_BOLTS` slot 2, `tallowWharfSectors.ts` :201-202, keeps its index:
  `side [-1, 0]`, `w 1.0`). `doorIn` along z hinges at `c - w/2`, the south jamb z 14.6 (kit :230), so the open leaf lies
  along the landing's south edge, clear of the flight head. The C1 boost lands at (4, 4.5, 14.6), 1.0 m from the bolt's
  reach (x 4.8-6.0): A unbolts it as his first move.
- Clear of everything that matters: LIP_STEPS (x 2.25-5.75, z 14) and LIP_MARKET (x 6, z 26.5-31.5, 2.1 m north), the
  lamp trimmer's beat (x 11), W1_ROUTES (sectors :246-259; route 1's (9, 15) -> (12, 27) passes 1.5 m east of the core),
  the canal-steps opening (x 7.5-12 left), the hide spot (12.4, 15.3).
- Story: the warden walks the gallery on his rounds and shoots the stair's head gate from the deck before going down his
  own stair. Walk card line (A12): "The gallery's caged ladder is now the market warden's caged iron stair: an enclosed
  iron box 1.5 x 10 m, 6.9 m tall (2.4 m above the deck), along the gallery's market face from its canal-steps end
  (x 6.0-7.5, z 14.4-24.4), its open foot arch facing the market's west strip; the one boosted up unbolts its head gate
  as his first move." Plan drawing note: P1's corrected PLAN.svg (A12's undo) draws the box at that size and place, the
  arch at its north end (z 24.4) and the head gate at (6.0, 4.5, 15.1). It hides the market strip x 6-12, z 14-23 from
  the gallery's market vantage pair (3, 4.5, 29.4-30.8): LP / GBM re-check that pair (W1.ts :282-283), outside G5.

**Split declaration (graph).** Legs a = [`w1-gallery`, `w1-warden-office`], b = [`w1-tea-stall`, `w1-market`] (B listens,
then tails the coats to the clock arch); the validator's rejoin becomes `w1-fish-hall` with no rule change. Leg a leaves
by the inspection hatch (link 8, W1_ROUTES route 0's own line). `assist: "tgc-leads"` moves from link 4 (a boost is not
one leg's act for the other) to the new stair link (A opens it for B). The gallery stays `overwatch:tgc-leads`: its two
standing vantage points now watch B's leg (the market) instead of a tea stall they cannot see.
Same-named links are named by kind as well (A22's `from>to` alone does not tell them apart): 9 `w1-market>w1-fish-hall`
(`opening`, the arch) and 10 `w1-market>w1-fish-hall` (`door`, the side door (33, 0, 44)); 4 `w1-market>w1-gallery`
(`coop_boost`) and 73 `w1-market>w1-gallery` (`fire_stair`, the new stair; today `w1-canal-steps>w1-gallery` `ladder`).

**Leg b's market point P (fix round 1).** B leaves the stall round the counter's west end and goes up the strip west of
the stall rows (row S x 12-32, z 20-23.15; row N z 32.85-36; W1.ts :128-131). D1's nav path listening spot -> clock is
43.25 m on that line. P is where that path enters the market, about (12, 0, 14.5) (G5 takes the path's crossing of
z 14.5 and reports it). Links 2, 9 and 10 are all measured from P, so 2 + 9 is B's measured walk and 10 is the side
door's real length. D0's (16, 0, 15) is off the path (a ~4.9 m detour) and is dropped.

**Expected numbers (planning; G5 measures, at 1.3 m/s legs, 3.0 m/s reach).**
| Check | Graph after G5 | Measured |
| --- | --- | --- |
| Leg a | link 3 6.2 (F to spot 4.6 m + boost 2.6) + link 6 24.2 (31.5 m) + link 8 ~9.5 = **39.9 s** | door to door 2.6 + ~1 unbolt + 24.2 + ~9.5 = **37.3 s**; F to shutter ~51.7 s |
| Leg b | link 1 3.85 (5 m) + link 2 ~12.5 (~16 m: stall side 6.9 + listening spot -> P ~9.3) + link 9 ~28.4 (~37 m: P -> clock ~34 + 3) = **~44.8 s**; link 10 (P -> side door) ~44 m, 33.8 s, is longer than 9, so S11 sums link 9 | door to door 0 + 16.0 + 24.9 = **40.9 s**; F to shutter ~55.1 s |
| Parity (max 20%) | **~11%** (39.9 vs ~44.8) | **9%** door to door, 6% to the shutter |
| split_max_s 90 | ~44.8 | 40.9 |
| Partner reach (max 15) | worst ~8.8 s (tea stall -> market by link 2 ~5.3 + the stair ~3.5, once Marlow's assist rule lands); a side worst 8 s | on B's route: listening spot -> deck 10.9 s; the arch -> deck **~12.3 s** (worst, corner clearance); A desk -> market 3.3 s (deck-edge drop) or 5.2 s (stair); A hatch 3.7 s. Off B's route (G5-Q1): the market's north-east end (35.7, 0, 43.7) -> deck **~16.3 s**, the side door's market side (33, 0, 43.5) ~15.5 s |
| Gate reach (C1 way back) | gallery -> market (stair 3.5 / drop 2) -> canal steps 7.8 = 9.8 s | unchanged in kind |
| Assist / overwatch | stair link / gallery | - |
| C1 forced | no solo arc up (stair bolted from the deck) | soloNav: gate shut, no path from (7,0,10), (16,0,10), (22,0,41) to (4,4.5,20) |
Uncertainty about +-1.5 s per leg (the unbolt and the hatch drop are engine estimates). Margins: parity ~9 points (graph
and measured), reach on B's route ~2.7 s.

**Leg b's graph sum depends on which `w1-market>w1-fish-hall` link S11 sums** (it takes the fastest solo arc per hop,
`level-validate.mjs` :776-784, :858). Honest readings against leg a's 39.9 s:
| Link 2 | Link 10 (side door) | S11 sums | Leg b | Parity |
| --- | --- | --- | --- | --- |
| old plan 21 m | stale 22 m (D0, `at` wrong [22, 0, 44]) | 10: 16.9 s | 36.9 s | ~7.5% |
| from P ~16 m | stale 22 m | 10: 16.9 s | ~33.2 s | **~17%** |
| from P ~16 m | measured from P ~44 m | 9: ~28.4 s | ~44.8 s | **~11%** (G5's target) |
| to (16, 15) 21 m | measured ~41 m (checker) | 9 from (16, 15): ~27.7 s | ~47.7 s | ~16% |
All pass 20%, but only the third rests on measured links that follow B's path. So G5 must write link 10 (`length` from
P and `at` [33, 0, 44]); leaving it stale makes the validator sum a side door nobody walks. G5 reports: P, links 2, 9
and 10 as measured, which of 9 / 10 is shorter (the one S11 sums), both graph leg sums and the parity; it stops if the
graph parity is over 20%, and flags it if link 10 comes out shorter than link 9 (the sum would then be the side door,
not B's route).

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
   **J8 gate-list line (fix round 1).** `fire_stair_w` is ERR-level (`level-validate.mjs` :300), so the lead adds to
   J8-J9-PLAN section 10's J8 gate (:1101-1106 on 7c0ddfa48): "W3 bulkhead flights (`w3-roof>w3-east-wing`, E10): built
   1.2 m against `fire_stair_w` 1.3; G6 widens the core 0.2 m east before the J8 gate closes. Until then the graph's
   `width` 1.3 is a named open line (D1 section fix 3, G5 plan ruling 5), not a pass."

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
D1 merges (done: in the engine since 60a886b38) -> S3 merges (J9, the shutters placed) -> engine member (d) lands
(BRIEF A30) -> Michael answers G5-Q1 -> G5 (cloud, Sonnet, from the brief, base = the engine head after (d)) -> fresh
checker -> J7 BEAT line ("A unbolts the stair's head gate as he lands"; leg a leaves by the inspection hatch, checker
polish 3) -> Marlow's two S11 changes -> TKL measure (ruling 4) -> G6 (bulkhead width, on the J8 gate list).
**S3 before G5, never beside it** (checker F2): both edit the W1 header paragraph (W1.ts :15-18 names the caged ladder
and the stand-in in one paragraph) and `tests/tallowWharf/w1.test.ts` (S3: :3-4, :15, :105-183; G5: :134, :526-605;
S3's new control test lands just above :134). G5 edits only the ladder clauses of the header as S3 leaves it, found by
text. S3's brief needs no change.

## 8. Assumptions (assume and log; none loosens a Michael-only rule: the one that would, A1, is G5-Q1 instead)
- **A1 (NOT assumed: Michael question G5-Q1, below).** Reach was measured from each leg's farthest route point to the
  nearest walkable point of the other leg's spaces (D1's method; the validator walks space to space). From the market's
  north-east end (35.7, 0, 43.7) the only way up is round row N's west end, the arch, the flight and the gate: about
  37.8 m of floor + 11.2 m = 49 m, **~16.3 s** (the side door's market side ~15.5 s); G5 measures both, report only.
  Verdict: level-design 11.6 (master :293-296) says "From any point of one leg of a split". G5 tags the whole 30 x 30 m
  market `split:tgc-leads:b`, so the north-east end is a point of leg b as G5 declares it, and the rule does not say "a
  point on the leg's route". Players stray; the rule covers a reviver wherever he stands in his leg. Reading it as route
  points only is a loosening of a Michael rule (G284 (4): 15 s), so it is Michael's call. No geometry fits cheaply
  (checker F3: the gate must sit at the boost landing; the arch is already 2.1 m short of LIP_MARKET).
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
- **A10** D1 merges first (done); G5 re-measures W1 itself. Undo: hold D1, run D1b after G5.
- **A11** TKL item 3 goes to the lead / J7 (ruling 4), not G5.
- **A12** S3 merges before G5 starts (gate 3 in the brief). Undo: narrow G5's header edit and name a conflict owner.

**G5-Q1 ANSWERED 2026-10-26 ~19:25 (native multiple choice, via the orchestrator; ROADMAP Decided): "Allow this corner
(Recommended)" = answer 1.** One named exception on the Tallow map: the market's far corner by the fish hall side door
is ~16 s from the gallery against the 15 s reach rule. G5 builds as briefed.

**Michael questions: one (G5-Q1), asked by day before G5 releases.** Nothing else relaxes a limit (20%, 90 s, C1). The
stair goes on the walk card (A12).

> **G5-Q1. In the Tallow market, a player at the far corner by the fish hall's side door needs about 16 seconds to get
> up to a partner downed on the gallery. The rule is 15. Everywhere on the planned route it is 12 seconds or less. What
> do we do?**
> 1. **Allow it for this corner (recommended).** Write it down as one named exception on this map. Costs: nothing to
>    build; the helper still arrives with about 11 seconds of the 30-second revive time to spare.
> 2. **Build a second locked stair at the gallery's far end**, which the gallery player opens as he walks past. Costs: a
>    second big iron box on the gallery you approved, about 1 more hour of building, the gallery player stops twice;
>    the corner comes down to about 13 seconds (estimate).
> 3. **Change the rule for every map** to count only the points on each player's planned route. Costs: the 15-second
>    rule gets looser on every map; corners off a route stop being checked.

Answer 1: G5 builds as briefed and writes the exception into the `w1-market` note and `G5-note.md`; the walk card adds
"a partner who strays to the market's far end is about 16 s from the gallery". Answer 2: the lead re-plans G5 before
release (a second core, a second assist, A's route and the vantage pair re-checked). Answer 3: the lead takes the
level-design 11.6 wording to the orchestrator; G5 builds as briefed.

## Fix round 1 (Opus, 2026-10-26; checker `tallow-g5-plan-check.md` VERDICT FIX; plan and brief only, nothing run)
- **F1 leg b.** Links 2, 9 and 10 re-derived from one point P on B's real path (about (12, 0, 14.5), where D1's nav path
  listening spot -> clock enters the market); (16, 0, 15) dropped. Link 2 ~16 m, link 9 ~37 m, link 10 ~44 m (measured
  by G5, `at` fixed to [33, 0, 44]). Graph leg b ~44.8 s vs leg a 39.9 s: ~11%; the stale-link readings (7.5%, 17%) and
  the checker's 16% are tabled under section 3. Link 10 added to the brief's step 5 measure and step 6 lines;
  same-named links named by kind (9 / 10, 4 / 73). The builder reports P, the three lengths, which link S11 sums and both
  graph sums.
- **F2 S3 order.** G5 starts after S3 merges (brief gate 3); the header edit is the ladder clauses only, found by text;
  w1.test.ts named as shared and sequenced (section 7, A12). S3's brief is unchanged.
- **F3 A1.** Corrected to ~16.3 s from the market's north-east end (side door ~15.5 s); G5 measures both, report only.
  Verdict: the corner is a point of leg b (the whole market is tagged leg b; 11.6 says "any point"), so A1 would loosen
  a Michael rule: not assumed; G5-Q1 written (section 8) and put in the brief's gate.
- **Pointers.** `W1_BOLTS` slot 2 is sectors :201-202 (not :200-202); W1_ROUTES is sectors :246-259 (not :256-268); the
  ladder test block is w1.test.ts :526-605; W1 rows are W1.ts :128-131. All rebased onto origin/feature/mission-engine
  7c0ddfa48 (same lines as tallow-fixes-2 for every G5 file). The brief's `<BASE>` is the engine head after member (d)
  lands (BRIEF A30).
- **J8 gate line** for the 1.2 m bulkhead flights (ruling 5, fix 3): text for J8-J9-PLAN section 10 (:1101-1106).
- **Walk card** line gives the stair's real size and place (1.5 x 10 m, 6.9 m tall, 2.4 m above the deck) with the
  PLAN.svg drawing note and the vantage-pair re-check for LP / GBM.
- Also: arch -> deck expected ~12.3 s (checker polish 4); graph reach ~8.8 s; head gate hinge named (the south jamb,
  `doorIn`'s own `c - w/2`) with a 0.6 m clear-path check (polish 1); J7's BEAT line names the hatch (polish 3).
- The engine holds the pre-fix copies (`docs/tallow-fixes/G5-plan.md`, `briefs/G5.md`, commit 05302cc94): the lead
  replaces them with these files at release.
