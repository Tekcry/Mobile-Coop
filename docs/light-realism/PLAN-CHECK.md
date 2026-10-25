# light-realism: plan check 1
Checker: Opus 5.5, 2026-10-25 18:43, PLAN at 69c372b52 (branch head 99710755e).
Verdict: FIX

## Intent
- ok: G329 quote (BRIEF:16-18) matches DECISIONS G329 and ROADMAP "Decided" :94 verbatim; G279 quote (BRIEF:19-20) matches G279. Q2 / Q3 / Q26-Q28 option texts (BRIEF:27-36) match FOLDED-PLAN section 2 rows 2-3 and ROADMAP :84-85.
- ok: every slice serves G329 / Q2 / Q3 (S1 car park first, then every space, pockets on every live map; warehouseOps out by Q26, A1 logged with undo). Marlow, Tallow and campus v2 are hand-offs only (PLAN:162-172), matching FOLDED-PLAN J10 :170 "Marlow for its sets".
- FINDING: Q3's option text is "after one test that matches the game's brightness to real light units". L0 (PLAN:68-92) does not test against real units: the anchors are chosen from the meter thresholds (BRIEF A2:63-67, bands.md:19-23) and the only lux tie is a moon plausibility line (bands.md:31-36). The L0 GPU check (PLAN:87-89) matches picture to field, not field to lux. This reads "one test" as "one chosen mapping". Fix 2.
- ok: Q28 baseline. A11 (BRIEF:94-96) lets the S1 click cover later re-baselines; supported by Q3, where Michael picked "together" over the rejected "other places map by map" (FOLDED-PLAN :67). Suggest citing that rejected option in A11 (not a fix).

## Gates
- ok: G355 rule fix at the walk cap, no flag (BRIEF:44-45, A11; FOLDED-PLAN phase B :161). Engine untouched (PLAN:55-57); `src/world/lux.ts` measurement only with a grep test (PLAN:74-75). Raise lamps, never the fill (A7). GPU only on the laptop alone slot (PLAN:61-64). Level standard and scale sheet change only after the click (L5, PLAN:183-189).
- ok: sign-off sits before any re-light ships. L0 changes no look; L1 waits for the click before train-ready (PLAN:11, :126-128); L2, L3, L5 run after the click (PLAN:12-15). Building L1 before the click is what Q3 asks ("you approve the table and the car-park light map together": the map needs the build).
- FINDING: the S1 pack is not the gate-4 form. It is `signoff/S1-pack.md` (PLAN:117) with three picks in one click (PLAN:122-125), where session-method Intake 4 and `docs/templates/signoff.md` require a one-page SIGNOFF with ONE decision. The light map is not said to be to scale. Fix 3.

## Claims
- claims-check: did not run. "docs/light-realism/PLAN.md has no ```claims block". The prose claims (PLAN:44-66) are not machine-readable and name no file globs.
- Manual git diff of the job's files against origin/feature/* changed in the last 7 days: feature/coop4 (and coop4-data, -doc, -e2eai, -pol, -ui2) change `tests/campusS1.test.ts` to `tests/campusS5.test.ts`, which L1 and L2-S1..S5 edit (PLAN:104, :138-142). Not on master yet. `docs/sector-redesign/SPEC.md` vs #433 (J1) is already ordered (PLAN:58-60).

## Slices
- L0 ~1,000 lines (~650 code), ~4 h: ok size; files and checks ok; done looks like ok (PLAN:91-92).
- L1 ~450 code + ~350 docs, ~4 h: ok; done looks like ok (PLAN:127-128).
- L2-S1..S5 ~350-600 each: ok size; files and tests ok; no "done looks like" line per PR. Fix 4.
- L3-W ~250, L3-H ~150 docs: ok size; no "done looks like". Fix 4.
- L4 ~200: ok size; no "done looks like". Fix 4.
- L5 ~150 docs: ok; no "done looks like". Fix 4.
- Flags: none, by A11 (G355 rule fix). ok.

## Walk pacing
- lighting / Sector Ops: ROADMAP "Waiting on Michael" (origin/feature/menu :56-67) keeps no per-area unwalked count, so lighting's count is not recorded. ok for this PLAN: no slice switches a feature on (rule fixes, G355; FOLDED-PLAN :161), and each look PR carries a video (PLAN:112, :146, :197). The missing count is the orchestrator's, not this PLAN's.

## Fix list (FIX only, ranked)
1. Add a fenced ```claims block (files: `src/world/lux.ts`, `tests/lux.test.ts`, `scripts/light-realism/**`, `docs/light-realism/**`, `src/world/maps/campusS[1-5].ts`, `src/world/maps/warehouse.ts`, `tests/lampBoxAlign.test.ts`, `tests/campusS*.test.ts`, `tests/campusS2Board.test.ts`, `tests/campusS4NocSight.test.ts`, `tests/warehouseLamps.test.ts`, `tests/parityCards.test.ts`, `scripts/e2e-darkness.mjs`, `docs/level-design.md`, `docs/design/scale-sheet.md`, `docs/systems/lighting.md`, `docs/sector-redesign/SPEC.md`; maps: campusOps, warehouse; protocol: none; save: none). Rerun claims-check. - done looks like: claims-check runs and lists its overlaps; the coop4 overlap on `tests/campusS1-S5.test.ts` is named in the PLAN for the orchestrator to order (for example coop4 first, L1/L2 rebase on it).
2. Make L0 carry Q3's "one test that matches the game's brightness to real light units". - done looks like: L0 has a reference test in `measure/calibration.md`: one real fitting (published lumen / candela data) modelled with the engine's lamp terms, engine level at 3+ ground distances against the real lux at the same points, and the fit error against the A2 curve. The pack's anchor line cites that result, or says in one line that the anchors are a chosen mapping, not a measured match.
3. Put the S1 pack in gate-4 form. - done looks like: `docs/light-realism/SIGNOFF.md` from `docs/templates/signoff.md`: one page with a to-scale light map (scale bar), before/after shot paths, a 5-line intent check including the lighting unwalked count, and ONE question (for example "Approve the band table (P11a, anchors 1 lx / 10 lx) and the S1 light map?" / "Changes first"). The anchor and category alternatives are shown on the page as what "Changes first" leads to; heat maps, video and the L5 draft are linked, not inline.
4. Add a "done looks like" line to L2 (per PR), L3-W, L3-H, L4 and L5. - done looks like: each is measurable. L2-S<N>: `lux-grid --section N` passes every space; `measure/campus-S<N>.md` lists the remaining dark cells with their cause; the brief's route table keeps a gap on every declared route; video path in the PR body. L3-W: every strip live and in band, and e2e-darkness still finds 0.12 and 0.27 points. L3-H: three hand-offs sent and acknowledged. L4: a parity file per map passing `parityCards.test.ts`, handed to J11. L5: the docs PR links the pack click.
