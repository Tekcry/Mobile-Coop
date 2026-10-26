# tallow-fixes - STATE
Owner: Campaign Build. Status: current.

## RESUME 2026-10-26
- PR G1 = feature/tallow-fixes (base feature/mission-engine). Engine merge c544226bd (PR D, E, F) was local; this push carries it.
- Merged, each with its checker verdict and report (scratch/campaign/):
  - LP light plan (96eb0bc60): PASS on round 3, tallow-lp-check4.md; tallow-lp-report.md.
  - G0 shell level-gap check (55514bad6): PASS, tallow-g0-check.md.
  - D0 graph and validator pass (799364de9): tallow-d0-check.md, FIX on one G2 brief line, fixed in db0e068ee.
  - W2 roof, E11 downpipe walkway (1640e3ba0): graph, design and validators PASS, tallow-d0-check.md; tallow-w2roof-report.md.
  - MB mission-scoped bolt, A30 (57679530d): PASS, tallow-mb-check.md.
  - G1 W1 fixes (b16d4bc56): PASS, tallow-g1-check.md.
  - G3 W3 fixes (3b786864c): PASS, tallow-g3-check.md.
- Not in PR G1: TD-b throw sites (feature/tallow-throw 6c4219cd2, checker PASS). It rides PR G2's base.
- PR G2 (feature/tallow-fixes-2, base 24964a624) still has: G2, G4, E8, D1, P1, FG2.
- Expected validator output until J12 lands: 3 ERR, 8 WARN. ERR 1 and ERR 2 below are the only ERR lines.
  - ERR (A22): throw-gap, w2-pawn-loft>w2-reading-room (long throw, named exception).
  - ERR (A22): throw-gap, w2-arcade-roof>w3-roof (long throw, named exception).
  - ERR: "split tgc-leads leg a: no solo link leads into w1-gallery", until Marlow's validator-port-s11 (J12 A28).
- Open items:
  - Map SPEC "Drainpipes" row and element register need E11's pipe (P1 / D1).
  - E8 needs an e2e row for the pipe climb.
  - EGRESS E11 guard-sight text is too optimistic (EGRESS.md:144-149).

## Polish list
LP (tallow-lp-check4.md, tallow-lp-report.md):
- J8-J9-PLAN.md:856-857 (G1 detail) still says the gate is "appended to W1_BOLTS by G2". Should say foot gate (pick 1) and bolt in G1 (pick 14). Fold in at the next plan edit.
- LIGHT.md:310 says the table lamps keep pools. They light the tables only; a body beside them reads 0.14. Fix the text.
- Switches 74 and 75 stand 0.1 m and 0.3 m east of their tables, facing -x. If the prop draws as a plate, mount on the table's east face (yaw PI/2).
- Row S and N string lamps hang from no canopy or post. Dressing; the lead ruled it out of J8.
- W2 table lamps 74 and 75 give 0.14 at the tables. Raise them if the lead wants real pools (tuning item).
- Latched W3 sash approach (108.8, 0, 51) reads 0.40 from the gate lamp (LP report, round 1).

G0 (tallow-g0-check.md):
- helpers.ts:465 flight-sample skip is untested and effectively dead. Delete it, or narrow it to the d = 0 case with a test.
- helpers.ts:462-470 skip(p) keeps stage pieces in walls. G2 and G3 callers pass q as the stage piece's whole plan; say so in the doc comment.
- tallowWharf.ts:48-50 night floor of 0.14 drops every unlit room to 0.14 until LP's room zones are built. The pending PC e2e covers any look change.

D0 and W2 roof (tallow-d0-check.md, tallow-w2roof-report.md):
- EGRESS.md:144-149 guard sight is too optimistic: the beadle sees the lit foot through the C3 railing gap from the west end of his loop. Correct the text and the designer report line.
- EGRESS.md:120 and G2.md step 6b: the rainwater head (z 61.45-61.75) stands 0.09 m proud of the pipe front (61.54). Set back to z 61.55-61.8, or note it for E8.
- G2.md step 6b: the story names an eaves gutter but only the head is built. Add a visual-only gutter strip (x 44-54, z ~61.75-61.85, y ~8.1-8.25).
- G2.md MB test: add expect(k).toBeGreaterThanOrEqual(0). The W3 index is -1 before step 12, so the test passes vacuously.
- G2.md header :12-14: the add-on cites TD-b 6c4219cd2, but the new throwCheck uses only TD-a functions. Say so.
- G2 step 0b: confirm layout.throwSites is built inside build(). G0's throw-site step never landed.
- EGRESS.md:128 time_s 6 counts the whole 3.9 m; the engine climbs about 2.1 m before the pull-up. Harmless.

TD-b throw sites (feature/tallow-throw, lead-notes):
- P4 (important for G2 and E8): helpers.ts throwCheck replica still uses 3.2 m, so it refuses C4 and C5 once sites exist.
- P1: the yaw-fallback test cannot fail (runner at z +0.03). Make it fail or drop it.
- P2: sample the arc per snapshot.
- P5: maps build throwSites inside build(); check dispose identity (G2 step 0b).

MB (tallow-mb-check.md):
- tests/sectorBolt.test.ts:225 fake nearest uses Math.hypot. The file's convention is hyp2 (test code only).
- Add an 'm3' case: a two-id list fits bolt (1,1) and still unfits (0,0).
- G2: pin that no TGC or TKL step reads W3-bolt4. An unfitted bolt's mission poll reads drawn from the start (sectorMission.ts:674).
- A free Sector Ops run on Tallow with no mission bound leaves the bulkhead unfitted. E8 must not expect it locked outside TKL.
- If a forward merge with J7 R6 stops on the sectorMode hunk, keep R6's deletion and MB's build argument (sectorMode.ts:371).

G1 (tallow-g1-check.md):
- Route 2 leg (33,45) to (22,56.8) crosses the east ice bench in plan. Add waypoint (33,50) if the walk validator reads straight legs.
- Group 62 facade conduit runs along x at y 3.6, z 44.6, across the arch opening (x 20.25-23.75). Visible under the lintel; check on the walk.
- Vantage hall-b at z 53.6 sits on the hatch edge; the body hugs the jamb. Check on the walk.
- Medkit yaw PI/2 is unverified (box should face +x off the west wall). Confirm on the PC walk.
- C1 test mass skip could be narrowed to the W1 mass blocks. Not needed.

G3 (tallow-g3-check.md):
- Hide spot (85, 0, 44.6) is unreachable with the coal-yard door shut (pre-existing). Add a reachability assert once the door state is settled.
- w3.test.ts pins desk clearance only. Add a test for cover clearance from guard routes and door bands before G2's route edits.
- West vantage-b reads 0.380, 0.07 under the 0.45 cap. A G2 lamp change on the west wing could push it over.
- Medkit z 69.15 sits 0.05 m off the wall face (69.2). Fine; check the pickup visual on the PC run.
- w3-east-yard deviation text dropped the old "half landing out of the 1.8 m mantle" reason. The test still asserts it.

Next: laptop set and look videos W1 / W3 on the PR G1 head, then merge into the engine after PR T.
