VERDICT: FIX

# Tallow G5 plan check (fresh Opus checker, 2026-10-26, read-only)
Checked: `C:/NightShift/scratch/campaign/tallow-g5-plan.md` (the plan) and `cq/campaign-tallow-g5.md` (the held brief),
against D1 (`d1-brief-blocked.md`; `origin/feature/tallow-d1` c8f33dcf3, `docs/tallow-fixes/val/D1-note.md` sections 6-8
and the section 14 output), master `RULES.md`, `level-design.md` 11, `metrics.json`, `VISION.md`, ROADMAP Decided
(feature/menu), the TGC and campaign-map SIGNOFF pages and the TGC BEAT (feature/mission-engine), J8-J9-PLAN (A11, A12,
lead rulings), `tallowWharfW1.ts` and the sectors file on tallow-fixes-2 / tallow-d1, S11's `level-validate.mjs` on
validator-port-c2 19de11b42, and briefs S3 and S4. No tsc, vitest, npm, e2e or validator was run.

**Michael's approval first? No.** The swap fits "approve as drawn ... confirm changes" (A12): it goes on the walk card,
not a one-click first. The walk card line must say how big the new object is (see Q1).

Three things to fix before release (F1-F3). Nothing is off-intent and no limit is loosened. The fixes are about wrong
numbers and file overlap.

## Findings to fix

**F1. Leg b's graph numbers do not follow, and leg b would be summed on a link nobody measured.**
Where: plan :59-60 and :66; brief step 6 :98-102, step 5 :84-85 and the Done line :133.
- The market point (16, 0, 15) is not on B's path. D1 measured listening spot -> (16, 0, 15) at 13.87 m and listening
  spot -> clock at 43.25 m. B leaves the stall by its open west side at about (12, 0, 14.4), then goes north up the
  strip west of the stall rows. Row S's counter and back wall run x 12-32 from z 20 to z 23.15 (W1.ts :126-127), so
  (16, 15) is about a 4.9 m detour.
- From (16, 15), the walk to the arch goes round row S's west end: about 6.4 + 16.6 + 12.9 = 36 m (27.5 s). The plan
  says 32.5 m (25.0 s). The plan got 32.5 by subtracting (43.25 + 3 - 13.87), and that only works if (16, 15) is on
  the path.
- Link 10 is also `w1-market>w1-fish-hall`. It is the hall's side door (DOORS `w1-hall-side` (33, 0, 44)), with
  `length` 22 and a wrong `at` of [22, 0, 44] (graph link 10). Nobody has measured it. S11 sums each hop on the
  fastest solo arc (`level-validate.mjs` :776-784, used at :858), so leg b's last hop takes link 10:
  3.85 + 16.2 + 16.9 = **36.9 s, not 45.0 s**.
- Parity still passes either way:
  - about 7.5% on the stale link 10;
  - about 16-17% if link 10 is measured (about 41 m) and link 9 is measured from (16, 15).
  But the plan's 45.0 s, 11% and "margin 9 points" do not follow, and leg b would rest on a 22 m nobody measured.
- The measured door-to-door figures (37.3 vs 40.9 s, 9%) are right: tea stall -> listening spot -> arch is
  6.94 + 43.25 + 3 = 53.2 m, which is 40.9 s.
- Fix:
  1. Measure links 2, 9 and 10 from one market point on B's real path, where the nav path from the listening spot to
     the clock enters the market (about (12, 0, 14.5)). Then links 2 + 9 are about the measured walk, and the graph's
     leg b is about 3.85 + 40.9 = 44.8 s (11%: the plan's figure then holds).
  2. Add link 10 (`w1-market>w1-fish-hall`, `door`: its `length` from that point to (33, 0, 44), and its `at`) to
     step 6 and to the file list's "lines step 6 names".
  3. Name the same-name links by kind as well:
     - 9 (`opening`) and 10 (`door`) are both `w1-market>w1-fish-hall`;
     - 4 (`coop_boost`) and the new 73 (`fire_stair`) are both `w1-market>w1-gallery`.
     A22's `from>to` names alone do not tell these pairs apart.

**F2. G5 is not file-disjoint from S3 (open, held).**
Where: brief :20-23 against `cq/campaign-tallow-s3.md` :22-25 and its step at :50-54.
- S3 edits the `tallowWharfW1.ts` header `:15-18` and `:11` (the stand-in wording), the `SHUTTER` doc `:42`, and the
  shutter tests in `tests/tallowWharf/w1.test.ts`.
- G5 edits the same header `:11-18`. Lines 15-18 are one paragraph that names both the caged ladder (G5's) and the
  stand-in (S3's), so the two edits will conflict.
- S3's base is feature/tallow-shutters, and both merge into tallow-fixes-2.
- Fix, either way:
  - gate G5 on "S3 merged into feature/tallow-fixes-2"; or
  - narrow G5's header edit to the ladder clauses (:12-13 and the "or the caged ladder ..." clause on :15-16, plus
    :18's "No W1 stair is added" sentence) and write the merge order and who resolves the conflict into both briefs.
- Also list w1.test.ts as shared with S3. The blocks are separate (:134 and :526-605 against S3's shutter tests), so
  git should merge them cleanly.
- S4 (`scripts/e2e-sectorops-wharf.mjs` only) is disjoint.

**F3. A1's number is low, and G5 does not measure it.**
Where: plan :62 and :109-111.
- From the market's north-east end, by the fish hall's side door (about (35.7, 0, 43.7)), the only way up is round
  row N's west end (W1.ts :128-129) to the archway:
  - floor: about 25.1 + 12.6 m;
  - archway, flight and landing to the gate: about 11.2 m;
  - total about 49 m = **about 16.3 s** at 3.0 m/s, not "about 15 s".
- Everything in the strip north of row N, east of about x 31, is over 15 s (the side door itself about 15.5 s). B's
  own route is all under 15 s: the worst point, the arch (22, 0, 44), is about 12.3 s by my sum, against the plan's
  11.8 s.
- Is it a real breach? `level-design.md` 11.6 says "From any point of one leg", and G5 tags the whole 30 x 30 m
  market as leg b.
  - A1 reads "a point of the leg" as a point on B's route. That is how D0 and D1 measured, and how the validator walks
    (space to space). B's route (stall, west strip, clock, arch) never goes to the north-east end.
  - So I read A1 as a faithful reading, not a loosening.
- **No geometry margin now.** None fits:
  - the head gate must sit at the boost landing so that opening it is A's first move;
  - the foot archway at z 24.4 is already 2.1 m short of LIP_MARKET (z 26.5);
  - a second bolted way up at the gallery's north end means a second assist and changes A's route.
- Fix:
  1. Correct the plan's A1 number to about 16 s.
  2. Add "(35.7, 0, 43.7) -> deck" and "(33, 0, 44.5) -> deck" to the brief's step 5 reach list, to measure and
     report only, not to stop on.
  3. The walk card line says a partner who strays to the far end of the market is about 16 s from the gallery (inside
     the 30 s revive window).
- If the lead instead reads 11.6 as every point of a tagged space, then A1 loosens the level standard, RULES Intake
  step 2 makes it a one-click question by day, and the plan's "Michael questions: none" (:126) is wrong.

## The five questions

**Q1. Michael's words: confirm on the walk, no one-click first.**
- His drawing has no ladder at all: "the trimmer took his ladder home" (campaign-map `SIGNOFF.md`:16; graph link 3's
  reason). The caged ladder was already a J8 fix (G1, A12, J8-J9-PLAN :296-298), and the lead ruled that kind of
  change goes on the walk card with no question first (J8-J9-PLAN :1457-1461).
- G5 swaps one J8 addition for another, in the same place, doing the same job: a bolted way up that only the boosted
  partner opens.
- The drawing already has the same kind of object: the warden's enclosed stair core (W1.ts :174-183, x 6.2-7.8,
  z 44-52, 7.5 m high).
- What does not change:
  - no new space, route or kit move (A13), and the heights stay as approved;
  - C1 and C2 stay forced (VISION :24);
  - roles and merge match his words: B tails the coats, and the legs meet at the fish hall shutter (TGC SIGNOFF
    step 2; BEAT.md :46-48).
- It is not a map re-plan or a look pass (RULES :62, G288). The 12 level-rule changes and Q23 "Force co-op" (throw
  gaps) are not touched.
- Caveat: it is a much bigger object than the ladder: an iron box 1.5 x 10 m, 6.9 m tall (2.4 m above the deck),
  along the gallery's south third, beside the canal-steps opening.
  - The plan's walk line (:47, "the caged ladder is now a caged stair") undersells it. It must give the size and
    place.
  - P1's corrected PLAN.svg (A12's undo) must draw it.

**Q2. The level standard (metrics: 1.3 / 3.0 m/s, 90 s, 20%, 15 s; master and S11 agree).**
- 11.3: legs 37.3 / 40.9 s measured, under 90 s; parity 9% (6% to the shutter). The graph sums are wrong (F1) but
  pass either way.
- 11.4: the assist moves to the stair link, where A opens it for B (sound).
- 11.5: the overwatch on the gallery is kept.
- 11.6: B's route is worst about 12.3 s and A's side about 3.3 s (see F3 for the market's far end). Gate reach:
  gallery -> market -> canal steps 9.8 s.
- 11.10 / VISION: C1 stays forced (a bolted gate at the stair head; soloArcsOf honours the bolt, `level-graph-lib.mjs`
  :250-254). C2 the shutter is unchanged.
- The stair meets `fire_stair_w` 1.3: the flight is 1.3 m wide, with 1.35-1.4 m clear between the screen or deck face
  and the east wall.
- Nothing is loosened. The Marlow note's assist rule is limited to split reach and encodes 11.6's own "ladder kicked
  down".

**Q3. The arithmetic.** I re-added every sum from D1's pieces.
These hold:
- link 3: 4.61 / 1.3 + 2.6 = 6.15
- link 6: 31.4 m = 24.2 s
- leg a, graph: 39.9 s
- leg a, door to door: 37.3 s
- links 1 and 2: 3.85 s and 16.15 s
- leg b, door to door: 40.9 s
- the F-to-shutter figures: about 51.7 and 55 s
- TKL after ruling 5: 23.5 vs 19.6 s (17%)
- reach: listening spot -> deck about 10.8 s; desk -> market about 3.3 s (plan 3.1)

These do not follow:
- link 9's 32.5 m;
- leg b's graph 45.0 s and its 11% (F1);
- A1's "about 15 s" (F3).

**Q4. The brief.**
- Pointers that exist as given:
  - W1.ts :11-18, :55-56, :140-148, :290;
  - w1.test.ts :134 and :526-605;
  - sectors.test.ts :461 and :478;
  - EGRESS :33, :53, :55, :78, :86-91.
- One pointer is off: the brief gives W1_BOLTS slot 2 at sectors :200-202 on the D1 head, but it is :201-202 (:200 is
  slot 1, the hall's back door).
- The checks are fine for a cloud builder: typecheck:fast, single vitest files at maxWorkers 2, eslint on four files,
  and plain-node validator runs.
- Done is clear apart from its F1 numbers.
- File overlap: F2.
- The rulings:
  - **Ruling 1 (time_s carries the climb): sound.** E6's 15.1 is the 1.3 m/s door-to-door time, so on a 3.0 m/s
    reach path it overstates (the safe side). It lies on no way-back path: the gate reach for links 28, 29 and 31 runs
    over links 70, 71 + 27 and 32. So no new ERR.
  - **Ruling 2 (tea stall `custom`): sound.** A stall is not a break room, and `custom` is the standard's own
    WARN-with-reason (five others already).
  - **Ruling 3 (the warden's key): sound.** It changes text only and matches W1_BOLTS slot 0 `side [0, 1]`.
  - **Ruling 4 (TKL routed to the lead): sound.** It must sit on the J8 gate list.
  - **Ruling 5: sound for fixes 1, 2 and 4** (truthful numbers). For fix 3 the graph keeps `width` 1.3 against the
    built 1.2 m. `fire_stair_w` is ERR-level (`level-validate.mjs` :300), so this is acceptable only because it is
    listed and G6 is scheduled. Put G6 on the J8 gate, or the graph hides a rule miss (D1 brief :38-39).

**Q5. D1 order: safe.**
- D1 commits no number that G5 relies on and that is wrong. D1 kept D0's values where the measurement was worse, and
  noted them. G5 overwrites all of these: links 3, 6, 8 and 73 and the tea-stall box.
- What G5 still reads from the graph, and why that is fine:
  - link 0 (23.5 m, gate reach) and link 7 (time_s 8, against a measured 5.2 s at 3.0 m/s) are conservative;
  - link 5 (drop, 2 s) is plausible;
  - the one stale value, link 10, predates D1 (F1).
- Master keeps the same 3 ERR. S11 is not on master, and the merge target is tallow-fixes-2. So "merge D1 as is" is
  safe.

## Polish (not blocking)
1. **Head gate leaf.** Name the hinge jamb as the south one (z 14.6), so the open leaf lies against the south wall.
   Hinged at z 15.6, the leaf would swing across the flight's head and leave only 0.4 m past its free end (the
   landing is x 6.0-7.4). Add a check that the open gate leaves a 0.6 m path from the flight head to the deck.
2. **The market vantage.** The core and screen hide the market strip x 6-12, z 14-23 from the gallery's market
   vantage pair (3, 4.5, 29.4-30.8). LP or GBM should re-check that pair's coverage. The market note's light sentence
   ("west strip by the gallery x 6-9") should name the core later (P1 or LP: outside G5's lines).
3. **BEAT wording.** BEAT.md :47 says A "drops back to the floor at the gallery's far end"; G5's leg a leaves by the
   inspection hatch. J7's BEAT line should say the hatch, alongside "A unbolts the stair's head gate as he lands".
4. **Arch -> deck reach.** With corner clearance it is about 12.3 s, not 11.8 s, leaving a 2.7 s margin. G5 measures
   it anyway.
