# light-realism: plan check 2
Checker: Opus 5.5, 2026-10-25 19:12, PLAN at c2f9927c7 (branch head c2f9927c7; BRIEF, PLAN, SIGNOFF.md, research/bands.md).
Verdict: PASS

## Check 1 fix list
1. Claims block: fixed. Fenced `claims` block (PLAN:45-67) covers every file the slices name; claims-check parses it (brace globs expand, `scripts/glob-match.mjs:5-6`) and runs.
2. Q3 reference test: fixed. L0 "The reference test" (PLAN:149-170): one real 6 m single-arm column, engine lamp terms (`photoTerm` `lampMath.ts:93`, `LAMP_LEVEL_GAIN` `:41`, both checked on master), 5 ground distances, least-squares fit, RMS pass line, pinned by `tests/lux.test.ts`. The no-download fallback is A13 (BRIEF), shown in plain words on SIGNOFF.md ("the anchors are chosen, not measured"), so Michael's click is made knowing which. This is the A-line handling the RULES allow for a download question; reading a datasheet web page is not a download.
3. Gate-4 form: fixed. `SIGNOFF.md` follows `docs/templates/signoff.md`: to-scale SVG light map (1 m = 10 px, scale bar, north arrow), before path, 5-line intent check with the lighting unwalked count, ONE question with two options; anchors and category are what "Changes first" leads to.
4. Done looks like: fixed. L2 per PR (PLAN:239), L3-W (:255), L3-H (:271), L4 (:283), L5 (:294), all measurable.

## Intent
- ok: G329 quote (BRIEF:16-18) matches ROADMAP "Decided" :97 verbatim; G279 quote ok. Q2 "Never" and Q3 "Australian standards (Recommended)" option texts (BRIEF:27-32) match FOLDED-PLAN section 2 rows 2-3 (:66-67) and ROADMAP :87. Q26-Q28 as check 1.
- ok: every slice serves G329 / Q2 / Q3: S1 car park first (L1), then every space (L2), pockets on every live map (L3), band table approved with the light map together (Q3 option text). warehouseOps out by Q26 (A1, later pick, with undo). FOLDED-PLAN J10 :170 scope covered: S L9 (L0, L5), L12 (L2/L5 SPEC lines after #433), L14 (BRIEF/PLAN), V7 (L4 hand-off), M M10 / V5 (L3-H), breaks 20-21.
- ok: Michael's ~19:00 free-asset rule (ROADMAP :82) does not touch this job (no asset is bundled); downloads still need his OK, and the plan downloads nothing (A4, A13).

## Gates
- ok: rule fix at the walk cap, no flag (G355, A11); engine untouched (PLAN:119-122); `lux.ts` measurement only with a grep test; lamps raised, never the fill (A7, `torches.ts:36` checked); GPU only on the laptop alone slot; level standard and scale sheet change only after the click (L5).
- ok: sign-off gate. L1 builds the S1 look before the click but holds it off the train until the click (A11, PLAN L1 done line); Q3's option ("you approve the table and the car-park light map together") needs the measured map, so building it first is within his pick. L2, L3, L5 start after the click.

## Claims
- claims-check: 8 overlaps. char-shadow-meter (`docs/systems/lighting.md`); coop-kit (`scale-sheet.md`, `level-design.md`); guard-rules, guard-rules-s1, guard-rules-s2 (map campusOps); map-ready (`lighting.md`; maps campusOps, warehouse); route-runs-2 (`level-design.md`); sector-marks (map campusOps). All are named and ordered in PLAN "Overlaps and order" (guard-rules-s1/-s2 are guard-rules slice branches, covered by "guard-rules first").
- No-claims branches (manual `git diff --name-only` vs the claimed files): coop4 and slices (`tests/campusS1-S5.test.ts`), mission-engine / -gb1 / tallow-design-docs (`tests/campusS1.test.ts`), doc-level, doc-polish, player-batch-25, gm-bake-abort (docs). All named in the PLAN. No other branch touches a claimed file.

## Slices
- L0 ~770 code (+ docs / data), ~4 h: ok.
- L1 ~450 code + ~350 docs, ~4 h: ok.
- L2-S1..S5 ~350-600 each (one PR each): ok.
- L3-W ~250, L3-H ~150 docs: ok.
- L4 ~200, L5 ~150 docs: ok.
- Flags: none (A11, G355 rule fix): ok.

## Walk pacing
- Lighting 3 (AT CAP), Sector Ops 3 (AT CAP) (ROADMAP :73-77). ok: every slice is a rule fix to shipped maps (G355), nothing new switched on; each look PR carries a video.

## Polish (does not change the verdict)
- FOLDED-PLAN J10 also lists T H2 ("no test holds the campus to G329's real-world level per space type", Test Runner CONFORMANCE :63). The band is held by the `lux-grid.mjs` measure and committed write-ups, not by a standing test outside S1 (L2-S1 flips S1 tests to band tests). Name T H2's owner: a band test per section in L2, or a hand-off to J11 / J12, in the PLAN.
- L4 builds "parity cards per map", which FOLDED-PLAN J11 :171 also lists. Fine as a data hand-off; say in L4 that J11 builds the suite from these files and does not make its own cards.
- L1's new test "no occupancy cell lies between it and the floor straight below": a 0.8 m arm head toward the bays can sit over a parked car (rows are 4.5 m deep, back to back at z -71.5, `campusS1.ts:136-137`). Word it as "no cell of its own pole or arm".
- The overlap count line (PLAN "gives 6") now reads 8 (the two guard-rules slice branches).
- SIGNOFF line 5 could add Sector Ops 3 (AT CAP) beside lighting.
- If the reference test has no usable page data, the lead may ask Michael by day (with the decision pack) to allow one datasheet download, instead of waiting for the sign-off to show "chosen, not measured".
