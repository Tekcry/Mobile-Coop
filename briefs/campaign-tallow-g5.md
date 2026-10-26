status: done feature/tallow-g5 481f4023983b9268336fd03bf5b11e55acb59da1

# campaign J8 G5: the TGC split meets the standard (W1 gallery stair, merge at the fish hall) (Sonnet 5.5)

Released 2026-10-26 ~19:30 by the lead (Campaign Build); fix round 1 the same day. Plan: `briefs/campaign-tallow-g5-plan.md`
on this cloud-queue branch (`git show origin/cloud-queue:briefs/campaign-tallow-g5-plan.md`). Your base's
`docs/tallow-fixes/G5-plan.md` and `briefs/G5.md` are the pre-fix copies: ignore them, never edit them (the lead
replaces them).
Gate (all must be in your base; step 1 checks them):
1. **D1 merged**: `docs/tallow-fixes/val/D1-note.md` exists and `WHARF_GUARD_EXTRAS` is `[]` in
   `src/world/maps/tallowWharfSectors.ts` (in the engine since 60a886b38).
2. G1-G4 and E8 merged (they are, under D1).
3. **S3 merged** (J9, the shutters placed): `grep -n "placeShutter(b, SHUTTER)" src/world/maps/tallowWharfW1.ts` finds
   it and `git grep -n "standIn(" -- src tests` finds nothing. G5 starts after S3, never beside it: both edit the W1
   header paragraph and `tests/tallowWharf/w1.test.ts`.
4. **Michael's answer to G5-Q1**: answer 1, "Allow this corner (Recommended)" (2026-10-26 ~19:25; plan section 8). Use
   `Michael 2026-10-26, G5-Q1` where step 6 says `Michael <date>, G5-Q1`.
Base: origin/feature/mission-d-wharf at sha `0adfd8deef75efb251ae9eef0b9f270554bef01b` (engine member (d), PR #583, with S3 merged in;
BRIEF A29-A30). New branch: feature/tallow-g5 (the lead merges it into feature/mission-d-wharf, or into a follow-up PR
once (d) is on master). `<BASE>` below = that sha. S4 (cloud, `scripts/e2e-sectorops-wharf.mjs` only) may run beside
you: no shared files. Lead: Night Shift | Campaign Build.
Pointers below are on engine 7c0ddfa48. S3 moves W1 lines after :197 (about +2) and may reflow the W1 header and
w1.test.ts :3-4, :15, :105-183: find every anchor by its text. Read `git show origin/master:docs/systems/agent-preamble.md`
("Cloud sessions") first. `<J12 ref>` = origin/feature/validator-port-c2 (S11).
Read: D1's `docs/tallow-fixes/val/D1-note.md` sections 6-8 and 14 (the TGC numbers, the section fixes, the measuring
test you reuse); `docs/tallow-fixes/EGRESS.md` rows E5 (:33), W1 0-2 (:53-55), pick 1 (:86-91); master
`docs/level-design.md` 11.3-11.11; TGC `BEAT.md` "Roles".

## Only these files
- `src/world/maps/tallowWharfW1.ts`: the header's ladder clauses only (S3 owns the rest of that paragraph), `DOORS`
  (:55-56), the ladder block (:140-148), the tea-stall `deviations` line (:290) only if a test needs it gone.
- `src/world/maps/tallowWharfSectors.ts`: `W1_BOLTS` slot 2 and its comment only (:201-202; :200 is slot 1).
- `tests/tallowWharf/w1.test.ts` (shared with S3, which lands first): the doors list (:134) and the
  `describe('W1 gallery ladder ...')` block (:526-605) only.
- `tests/tallowWharf/sectors.test.ts`: the `CORES` entry `w1-ladder-cage` (:461) and W1's `want` row (:478) only.
- `docs/missions/prototypes/campaign-map/graph.json`: the lines steps 6 and 7 name, nothing else.
- `docs/tallow-fixes/EGRESS.md`: rows E5, W1 0, W1 2, the W1 office-block row's "gallery ladder" sentence (:78), pick 1.
- `docs/tallow-fixes/val/G5-*` (new: validator outputs, `G5-graph.diff`, `G5-note.md`).
- A temporary measuring test `tests/tallowWharf/_g5measure.test.ts` you run and delete; never committed.
Not yours: the TGC / TKL graphs and BEATs (J7), the SPEC and SIGNOFF pages (P1), the validator scripts (J12), W2 / W3
geometry, every other file.

## Why
D1 found the TGC split `tgc-leads` fails: legs 42.0 vs 16.0 s door to door (62%, limit 20%) and no solo way from the
floor up to a partner downed on the gallery (limit 15 s). The parity fault is the merge point: the graph rejoins in the
market, but Michael's signed-off step 2 ends the split at the fish hall shutter (one holds, one crawls) after B tails
the coats. The reach fault is the ladder: its bolt is at the foot inside the cage, so the partner on the gallery cannot
open it on arrival, and a 4.5 m ladder takes 10.0 s to climb. G5 replaces the ladder with a caged stair whose head gate
the boosted partner unbolts as his first move (C1 stays forced: from the floor the stair ends at a bolted gate), and
declares the market part of leg b so the validator's rejoin is the fish hall.

## What to change
1. **Gate checks** (stop with `status: blocked <which>` if one fails): the four gate items above;
   `npx vitest run tests/tallowWharf/w1.test.ts --maxWorkers=2` and then `sectors.test.ts` green on the base (a red test
   is a base problem: report its message, do not fix it).
2. **The gallery stair** (`tallowWharfW1.ts`; delete :140-148, the ladder, its cage walls and foot door). Every box
   `noLedge` (the kit's `wall` and this file's `blk` already are; check). Map metres:
   - core outer x 6.0-7.5, z 14.4-24.4. East wall `wall(b, false, 7.45, 14.4, 24.4, [], 0, 6.9, 0.1, IRON)`; south wall
     `wall(b, true, 14.45, 6.0, 7.5, [], 0, 6.9, 0.1, IRON)`; north wall `wall(b, true, 24.35, 6.0, 7.5, [[6.2, 7.2]], 0, 6.9, 0.1, IRON, 2.1)`
     (the foot archway, no leaf); roof `blk(b, 5.95, 14.4, 7.5, 24.4, 6.9, 7.0, IRON, true)`.
   - the screen on the deck edge `wall(b, false, 6.0, 14.4, 24.4, [[14.6, 15.6]], 4.5, 6.9, 0.1, IRON, 2.1)` and the head
     gate `doorIn(b, false, 6.0, 15.1, 4.5, { w: 1.0 })`, its leaf swinging east onto the landing (away from the deck).
     `doorIn` along z hinges at `c - w/2` = z 14.6, the south jamb (kit :230), so the open leaf lies along the landing's
     south edge, clear of the flight head; keep it there.
   - head landing `blk(b, 6.0, 14.5, 7.4, 15.8, 0, 4.5, FLOOR)` (top 4.5, flush with the deck).
   - flight: `const gs = stairSteps(4.5);` `b.stairs(6.7, 15.8 + gs.len / 2, 1.3, gs.len, 4.5, gs.steps, IRON, Math.PI, 0)`:
     27 risers, 7.7 m, foot z 23.5 (y 0) rising south to the landing (yaw PI as W3 :218). Check the flight's foot ends
     at z 23.5 and leaves a 0.8 m foot landing to the archway; if `b.stairs` leaves a walkable void under the flight,
     fill it with `mass` as W3 :221.
   - header comment, the ladder clauses only, found by text in the header as S3 left it (on 7c0ddfa48: :12-13 "the
     trimmer's caged ladder at its canal-steps end", :15-16 "or the caged ladder (its anti-climb door ... no solo
     bypass)", :18 "No W1 stair is added (EGRESS section 3, pick 2)."): the gallery's "caged ladder" becomes "the market
     warden's caged stair at its canal-steps end (its head gate bolted on the gallery side, `W1_BOLTS` slot 2: the
     boosted partner unbolts it on landing)"; "No W1 stair is added" becomes "no stair is added to the office block
     (EGRESS pick 2); the gallery stair serves the open deck (G5)". Leave S3's shutter wording as it is.
3. **Door and bolt.** `DOORS` (:55-56): replace `'w1-gallery-ladder': [6.6, 0, 14.4]` with
   `'w1-gallery-stair-gate': [6.0, 4.5, 15.1]` and its doc comment. `W1_BOLTS` slot 2 (sectors :201-202):
   `{ at: at2(W1.doors['w1-gallery-stair-gate']!), side: [-1, 0], w: 1.0 }` with the comment "the gallery stair's head
   gate, bolted on the gallery side (EGRESS E5, J8 G5): the boosted partner unbolts it on landing; no solo bypass of C1".
   The index stays 2; the counts stay `[3, 7, 5, 2]`.
4. **Tests.** `w1.test.ts` :134 (S3's added control test sits just above it): the sorted list with
   `w1-gallery-stair-gate` in place of `w1-gallery-ladder`. Replace the ladder block (:526-605) with
   `describe('W1 gallery stair (J8 G5, EGRESS E5)')`:
   - the core's walls, roof, landing and flight stand where step 2 says (the flight is 1.3 wide; the landing top is 4.5);
   - the gate is a 1.0 m door at (6.0, 4.5, 15.1), hinged at z 14.6, whose leaf opens toward +x; the open leaf leaves at
     least 0.6 m clear from the flight head (6.7, 4.5, 15.8) to the deck;
   - gate shut (`ShutDoor` at [6.0, 15.1], y 4.5, w 1.0, along z) with the warden-stair foot shut: no solo path from
     (7, 0, 10), (16, 0, 10) or (22, 0, 41) to the deck (4, 4.5, 20); but a path from the archway (6.7, 0, 25) to the
     landing (6.7, 4.5, 15.1) (the stair itself is open);
   - control, gate open: all three reach the deck;
   - C1 stays forced: keep the lip checks; replace the ladder top's level-run check by one that proves the head landing
     reaches the deck only through the gate (the soloNav case above). If `soloLevelThreats` reports the landing because
     it ignores the screen, exclude the landing with a one-line reason and keep the soloNav proof.
   `sectors.test.ts`: :461 `'w1-gallery-stair': [6.0, 14.4, 7.5, 24.4]` in place of `w1-ladder-cage`; :478 W1's third
   pair `['w1-gallery', 'w1-gallery-stair']`.
5. **Measure** (temporary `_g5measure.test.ts`, D1-note section 14 as the template: `navLen`, `soloNav`, the engine
   constants; paste source and output into `G5-note.md`, then delete it). At 1.3 m/s (legs) and 3.0 m/s (reach):
   - leg a: F (7, 0, 10) -> boost spot (4, 0, 13.5); the boost; landing (4, 4.5, 14.6) -> the bolt spot (5.0, 4.5, 15.1)
     and the unbolt's engine time; landing -> office door (4, 4.5, 46); door -> desk (3, 4.5, 50) -> hatch (7.4, 4.5, 53.1);
     the hatch and its 4.5 m drop (fall time + the crouch); landing below -> shutter (22, 0, 57.2);
   - leg b: F -> the stall's open side (12, 0, 10) -> listening spot (18.8, 0, 8.6) -> clock (22, 0, 41) -> arch
     (22, 0, 44) -> shutter (22, 0, 57.2). **P** = the point where the nav path listening spot -> clock first crosses
     z 14.5 (about (12, 0, 14.5): B leaves round the counter's west end and goes up the strip west of the stall rows);
     report P and split that path at it: listening spot -> P and P -> clock. Do not use (16, 0, 15): it is off B's path;
   - the side door: P -> `w1-hall-side` (33, 0, 44) (link 10);
   - the stair link door to door: archway (6.7, 0, 24.4) -> gate (6.0, 4.5, 15.1);
   - reach: listening spot -> deck and arch -> deck (gate open); desk -> market (gallery door, the deck edge at
     (5.7, 4.5, 43.5), the 4.5 m fall, (6.4, 0, 43.3)) and by the warden's stair; hatch -> market by the stair;
     (4, 4.5, 15) -> market down the stair. A drop is nav to the edge + fall time + nav from the landing point;
   - report only (G5-Q1, never a stop): the market's north-east end (35.7, 0, 43.7) -> deck and the side door's market
     side (33, 0, 43.5) -> deck, gate open.
   Plan's expected values: legs door to door ~37.3 vs ~40.9 s (9%); link 2 ~16 m, link 9 ~37 m, link 10 ~44 m; graph
   legs 39.9 vs ~44.8 s (~11%, S11 summing link 9); reach on B's route worst ~12.3 s (arch -> deck); the far corner
   ~16.3 s, the side door ~15.5 s. **Stop and report** if a measured leg pair is over 20% apart, a leg over 90 s, a
   reach on B's route or A's side over 15 s, or the graph parity (step 6's values) over 20%; report any within 1 s of a
   limit, and flag it if link 10 comes out shorter than link 9 (S11 would then sum the side door, not B's route).
6. **Graph, W1 (name links `from>to`, A22, plus the kind where two links share a name: 9 `w1-market>w1-fish-hall`
   (`opening`) and 10 (`door`); 4 `w1-market>w1-gallery` (`coop_boost`) and 73 (`fire_stair`); each touched note gains
   "measured from the build (J8 G5, <date>)").**
   - link 73 (`w1-canal-steps>w1-gallery`, `ladder`) becomes `w1-market>w1-gallery` (`fire_stair`): `kind` "fire_stair", `route` "high", `width` 1.3, `level_change` 4.5,
     `length` = step 5's stair (about 10.5), no `time_s`, `bolted` true, `assist` "tgc-leads", `at` [6.7, 0, 24.4],
     `reason`: the market warden's caged stair up the gallery's canal-steps end, its head gate bolted on the gallery side
     at night; the one boosted up unbolts it on landing (EGRESS E5; split tgc-leads: B's way up).
   - link 4 `w1-market>w1-gallery` (`coop_boost`): delete its `assist`.
   - links 1 (`w1-canal-steps>w1-tea-stall`) `length` = F -> open side (~5); 2 (`w1-tea-stall>w1-market`) `length` = open
     side -> listening spot -> P (~16); 3 (`w1-canal-steps>w1-gallery`, `coop_boost`) `time_s` = F -> spot / 1.3 + the
     boost (~6.2); 6 (`w1-gallery>w1-warden-office`) `length` = landing -> office door (~31.5); 8
     (`w1-warden-office>w1-fish-hall`) `time_s` = office door -> desk -> hatch / 1.3 + the hatch and drop (~9.5); 9
     (`w1-market>w1-fish-hall`, `opening`, the arch) `length` = P -> clock -> arch (~37); 10 (`w1-market>w1-fish-hall`,
     `door`, the side door) `length` = P -> (33, 0, 44) (~44) and `at` [33, 0, 44] (was [22, 0, 44]). Lengths on the
     0.5 m grid. Then sum both legs as S11 does (leg a: 3 + 6 + 8; leg b: 1 + 2 + the shorter of 9 / 10) and write the
     sums and parity in `G5-note.md`.
   - `w1-market` tags gain `split:tgc-leads:b`; its note: B listens at the tea stall, then tails the coats to the clock
     arch; the legs rejoin in the fish hall at the shutter (signed-off step 2). If G5-Q1's answer is 1, add: "the
     market's north-east end, off B's route, is about <measured> s from the gallery stair (Michael <date>, G5-Q1)".
   - `w1-tea-stall`: `room_class` "custom", `area` [[12, 6, 20, 14]], `size` [8, 8, 12], note "custom: an 8 x 8 open-air
     tea stall between the canal rail (z 6) and the market (z 14); no sheet class (lead ruling, G5 plan ruling 2)".
   - `w1-gallery` note: the ladder sentence becomes the stair and its head gate.
   - link 7 (`w1-market>w1-warden-office`) `reason`: the warden locks the foot door behind him with his key as he goes out
     on his rounds (LP pick 13); a thumb-turn on the stair side opens it.
7. **Graph, the lead's rulings on D1's held numbers** (D1-note section 7's measured values; no new measure):
   `w3-roof>w3-west-wing` `time_s` 13.9; `w3-east-yard>w3-east-wing` `time_s` 2.0; `w3-roof>w3-east-wing` `time_s` 14.8
   (its `width` stays 1.3: the built 1.2 is G6's, a named open line on the J8 gate list, plan ruling 5); `w2-arcade>w2-reading-room` `width` 1.7; the plant ladder
   `w2-lane-window>w2-arcade-roof` `time_s` 15.1. Each note says "lead ruling (G5 plan)".
8. **EGRESS.md.** E5 (:33): the stair link as step 6. W1 0 (:53): "the warden locks it behind him with his key going out
   on his rounds (LP pick 13); a thumb-turn on the stair side". W1 2 (:55): the head gate (6.0, 4.5, 15.1), side the
   gallery (`[-1, 0]`), "the warden shoots it from the deck on his rounds; an exit from the deck opens without a key".
   :78: "the new gallery ladder (E5)" becomes "the gallery stair (E5)". Pick 1 (:86): one line "superseded by J8 G5: the
   gate moved to a stair's head, where no top-out applies".

## Validator runs (save under `docs/tallow-fixes/val/`, names `G5-<ref>-<run>.txt`; D1's run block, plain node, no npm)
- master and `<J12 ref>`: map, map + TGC, map + TKL; master TKL-state as D1. `G5-graph.diff`: `git diff <BASE> -- docs/missions/prototypes/campaign-map/graph.json`.
- **TGC-state run** (scratch copy, not committed): the stair link `bolted: false` (the gate after A opens it), on
  `<J12 ref>` alone. It shows what Marlow's assist rule will give: expect no `tgc-leads` parity or reach line; name any
  other line the unbolt causes (a solo-twin line is expected in this scratch run only).

## Checks (cloud: no e2e, no GPU)
- `npm run typecheck:fast`.
- One file at a time, `--maxWorkers=2`: `npx vitest run tests/tallowWharf/w1.test.ts`, then `sectors.test.ts`, then
  `shell.test.ts` (graph boxes). A test outside your files that the change breaks: report it with its message.
- `npx eslint src/world/maps/tallowWharfW1.ts src/world/maps/tallowWharfSectors.ts tests/tallowWharf/w1.test.ts tests/tallowWharf/sectors.test.ts`.

## Done
- Measured: tgc-leads legs within 20% (both conventions: door to door, and F to the shutter), each under 90 s, worst
  partner reach on B's route and A's side under 15 s (the two far-corner points reported against G5-Q1), C1 proven by
  the soloNav tests. Graph: links 2, 9, 10 from P; leg sums and parity within 20%, with the link S11 sums named.
- `<J12 ref>`: the split's parity line gone; one named ERR left on tgc-leads (partner reach through the bolted stair,
  cleared by Marlow's assist rule); the two throws INFO. TGC-state run: no tgc-leads line.
- Master: the same 3 ERR as D1 (the two A22 throw lines, `split tgc-leads leg a: no solo link leads into w1-gallery`).
- WARNs: D1's 10, plus `w1-tea-stall` custom and `w2-arcade>w2-reading-room` width 1.7, each with its reason. No new ERR.
- `G5-note.md`: refs and shas, the measured numbers against the plan's expected ones, the graph lines changed (named),
  validator tables, the step 5 appendix.
- Commits on feature/tallow-g5 prefixed `tallow G5:`, trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
  `git add <file>` per file, never `-A`. Never merge, rebase, force-push, or push to feature/mission-engine,
  feature/tallow-fixes-2 or any feature/mission-* branch.
- Size: ~35 code lines (W1, sectors), ~70 test lines, ~45 JSON lines, ~10 doc lines; 2.5 h.

## Report (append below, then set line 1 to `status: done feature/tallow-g5 <sha>`)
Measured legs and reach against the plan's expected values (P; links 2, 9, 10; which link S11 sums; both graph sums
and parity; the two far-corner reach times); ERR / WARN per run with file names; the graph lines changed (named by kind
where two share a name); test results; deviations (any place step 2's coordinates had to move, and why); open items for
the lead (the J7 BEAT line "A unbolts the stair's head gate as he lands", leg a by the inspection hatch; Marlow's two
S11 changes; G6 on the J8 gate list; the market vantage pair re-check for LP / GBM; P1's walk-card line and PLAN.svg
note, which give the stair's real size and place: an enclosed iron box 1.5 x 10 m, 6.9 m tall (2.4 m above the deck),
x 6.0-7.5, z 14.4-24.4, plan section 3; anything within 1 s of a limit).

## Report (Night Shift | Cloud Builder 6, 2026-10-26)
**Branch:** feature/tallow-g5, head 481f4023983b9268336fd03bf5b11e55acb59da1, base 0adfd8dee. The full record, with tables
and the measuring-test appendix, is `docs/tallow-fixes/val/G5-note.md`.

**Commits:**
- 74ba6662: the stair, door, bolt and tests.
- ac64f016: the void fill under the flight.
- f85103f9: the graph.
- 481f4023: EGRESS, the validator runs, `G5-graph.diff` and the note.

**Gate:** all four items pass (D1 note present and `WHARF_GUARD_EXTRAS` `[]`; G1-G4 and E8 in; S3 merged with no
`standIn(`; G5-Q1 answer 1). Base tests: w1 49 and sectors 43, green.

### Measured (1.3 m/s legs, 3.0 m/s reach), against the plan
- **P** = (11.83, 0, 14.5), where B's path from the listening spot to the clock crosses z 14.5. The path runs round the
  counter's west end and up x 11.25.
- **Door to door:** leg a **36.47 s** (plan ~37.3), leg b **41.18 s** (~40.9): **11.4%** (plan 9%).
- **F to the shutter:** leg a 50.80 s, leg b 55.18 s: **7.9%**. Every leg is under 90 s.
- **Engine times:** the unbolt is 0 s (the bolt item's hold time is 0; the plan estimated ~1 s). The hatch is 1.63 s (crouch
  0.22 + fall 0.71 + landing recovery 0.70).
- **Links:** 1 = 5.0; 2 = 16.64 (16.5); 3 = 6.1 s; 6 = 31.4 (31.5); 8 = 9.2 s; **9 = 36.9 (37)**; **10 = 44.47 (44.5), at
  [33, 0, 44]**; stair 73 = 10.96 (**11**; the brief said about 10.5).
- **S11 sums link 9 (the arch).** Link 10 is longer than link 9, so there is nothing to flag. The graph sums, read from an
  instrumented scratch copy of S11: a 39.53 s, b 45.00 s, **12.2%** (plan ~11%). TKL `tkl-wings` is 23.5 vs 19.6 s (16.6%).
- **Reach on B's route, gate open:** listening spot -> deck 11.47 s; the clock 12.24 s; **the arch 12.77 s (worst; plan
  ~12.3)**; P 8.21 s.
- **Reach on A's side:** desk -> market by the deck-edge drop 3.25 s, by the warden's stair 5.23 s; hatch 3.70 s; gallery
  head -> market down the stair 4.44 s.
- **Far corner (G5-Q1, report only):** NE end (35.7, 0, 43.7) **16.90 s** (plan ~16.3); the side door's market side
  **15.97 s** (~15.5).
- **Limits:** none is within 1 s, and there was no stop.
- **C1:** soloNav proves it (gate and foot shut: no path from (7, 0, 10), (16, 0, 10) or (22, 0, 41) to the deck; the arch
  reaches the head landing). It is also a w1 test.

### Validator (`docs/tallow-fixes/val/G5-*.txt`)
- **Master** (map / map+TGC / map+TKL / TKL-state / TKL-state+TKL): 3 ERR, 12 WARN on every run. The ERRs are the same 3
  as D1: the two A22 throws and `split tgc-leads leg a: no solo link leads into w1-gallery`.
- **`<J12 ref>`** (validator-port-c2 bdef649b3) on map / map+TGC / map+TKL: 1 ERR, 12 WARN.
  - The parity line is gone.
  - One named ERR is left: `split tgc-leads: a downed partner at w1-tea-stall cannot be reached from the other leg`. That
    is the reach through the bolted stair, which Marlow's assist rule clears.
  - The two throws are INFO.
- **TGC-state** (the stair `bolted: false`, scratch): no tgc-leads line. The only other line is the expected solo twin
  `w1-market -> w1-gallery (coop_boost) has a solo twin ... (fire_stair)`.
- **WARN:** D1's 10, plus `w1-tea-stall: room_class custom` and `link w2-arcade -> w2-reading-room (open_stair): width 1.7
  m below 2.4 m`, each with its reason in the note. No new ERR.

### Graph lines changed
- **W1 links:**
  - 73 `w1-canal-steps>w1-gallery` (`ladder`) is now `w1-market>w1-gallery` (`fire_stair`): high, assist tgc-leads, 1.3
    wide, 4.5 rise, length 11, bolted, at [6.7, 0, 24.4].
  - 4 `w1-market>w1-gallery` (`coop_boost`): assist removed.
  - 1 (`opening`), 2 (`opening`), 3 (`coop_boost`), 6 (`door`), 8 (`drop`), 9 (`opening`, the arch) and 10 (`door`, the
    side door, length and `at`) are measured, with notes.
  - 7 (`fire_stair`): reason updated (LP pick 13).
- **W1 spaces:** `w1-market` gets the `split:tgc-leads:b` tag and the G5-Q1 note line ("about 17 s", Michael 2026-10-26,
  G5-Q1). `w1-tea-stall` is custom [12, 6, 20, 14], size [8, 8, 12]. The `w1-gallery` note names the stair.
- **Lead rulings:** `w3-roof>w3-west-wing` 13.9; `w3-east-yard>w3-east-wing` (`door`) 2.0; `w3-roof>w3-east-wing` 14.8
  (width stays 1.3); `w2-arcade>w2-reading-room` width 1.7; `w2-lane-window>w2-arcade-roof` 15.1. Each note says "lead
  ruling (G5 plan)".

### Tests
- w1 48, sectors 43, shell 20, w2 79, w3 54, w4 52 and levelGap 6: all passed.
- `npm run typecheck:fast`: clean.
- eslint on the four named files: clean.
- `node scripts/doc-lint.mjs`: 0 errors, and no warning on G5's files.
- The temporary measuring test was deleted and never committed. Its source and output are in the note's appendix.

### Deviations
1. **Void fill.** The nav grid had floor cells at y 0 under the flight's upper half (heightAt(6.7, 16.5 / 18, 0) = 0). As
   the brief says, three stepped `mass` boxes fill it: z 15.8-17.8 to 2.9, z 17.8-19.8 to 1.75, z 19.8-21.3 to 0.9, each
   under the ramp's underside. Afterwards heightAt returns the ramp surface, and no number changed. No coordinate in step 2
   moved.
2. **Flight run.** It is 7.695 m (27 x 0.285, the brief's "7.7"), so the foot is at z 23.495 and the foot landing 0.805 m.
   The tests assert those values.
3. **soloLevelThreats exclusions.** The head landing is left out (its one way onto the deck is the gate, which soloNav
   proves; the brief allowed this). The core's roof is left out too: the helper reported "top 7.00 at (6.725, 19.4)", but
   it has no way up (2.5 m over the deck, more than `SCREEN`, noLedge). A control block over the core is still reported.
4. **EGRESS office-block row.** "The gallery stair (E5)" would otherwise be followed by "is exterior climbing, not a counted
   stair", which is wrong for a stair. It now reads: "serves the open deck, not the office (its head gate opens onto the
   gallery), so it is not one of the office's counted stairs".
5. **Stair link length.** It is 11, not "about 10.5" (measured 10.96).

### Open items for the lead
- **J7 BEAT line:** "A unbolts the stair's head gate as he lands"; leg a leaves by the inspection hatch.
- **Marlow's two S11 changes:** the reach message's end, and the assist link counting as open in that split's reach only.
  Until then, one named tgc-leads ERR stays.
- **G6:** the W3 bulkhead width (1.2 built against 1.3) stays on the J8 gate list.
- **LP / GBM:** re-check the market vantage pair (3, 4.5, 29.4 / 30.8). The core hides the strip x 6-12, z 14-23.
- **P1:** the walk-card line and the PLAN.svg note. The stair is an enclosed iron box 1.5 x 10 m, 6.9 m tall (2.4 m over the
  deck), x 6.0-7.5, z 14.4-24.4, with the arch at z 24.4 and the gate at (6.0, 4.5, 15.1). The corner line should say
  "about 17 s": it measures 16.9 s, against "about 16" in the G5-Q1 question.
- **Stale deviation:** `tallowWharfW1.ts` `deviations` still has the tea-stall line ("z max 14, not 14.5"). The graph is now
  z 14, so it no longer differs, but no test needs it gone, so it is left as is.
- The engine's pre-fix `docs/tallow-fixes/G5-plan.md` and `briefs/G5.md` are untouched.
- **Pending PC run:** `e2e-sectorops:wharf-tgc` and the affected set. No e2e or GPU check ran here.
