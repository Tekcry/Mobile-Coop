# campus-greybox: plan check 1
Checker: Opus 5.5, 2026-10-25 ~19:10, PLAN at 3ad2939a8 (blob unchanged at branch head 4eeb05a0f; BRIEF at 0f3e697db).
Verdict: FIX

## Intent
- ok. Every slice traces to a pick: S1-S5 counts (BRIEF:18-28 = ROADMAP:95 / G328) in the lane guard slices (PLAN:69-77,
  :108-123); "Two players" / G362 in A14 (BRIEF:98) and TAG-<N> (PLAN:124-125); Q2 "Never" and G329 in A19 (BRIEF:120)
  and PLAN:93-100; Q7 "Never stuck" and "Bot route-runs + your walk" in PLAN:180-189; Q4 in PLAN section 7 row 13; Q16 as
  the J4 dependency (PLAN:7-17); Q20 left to J18 (A22); Q26 closes C13 (PLAN:135); Split Shift / Code Relay devices
  (PLAN:137-158, "re-askable, no hard countdown" kept, G334). FOLDED-PLAN J17 row (menu FOLDED-PLAN:178) fully covered
  ("Rule index errors" = C15, PLAN:110-123). Quotes verified against ROADMAP:83, :85, :88, :95 and DECISIONS G289, G329.
- Two places read Michael more widely than he said, both correctly sent to him: A15 extends Q10 (named S5) to S4
  (BRIEF:105, PLAN:219-221); the Split Shift page's "bridge pair door's solo line" (mission-framework SIGNOFF.md:42-43,
  approved 18:05) vs Q21 "No, two players" (16:50), default the stricter Q21 (BRIEF:84, PLAN:217-218). ok.
## Gates
- Sign-off before greybox: ok (S1-S5 one-click 2026-10-25 ~08:50, BRIEF:18-28; plan graphs 0 ERR per checks-signoff).
- Greybox exit: ok. Validator 0 ERR at every lane PR (PLAN:86-91), measured `--require-measured` pass (PLAN:182-184,
  waits J12), bot route-runs "Never stuck" (PLAN:185, waits J13), walk card (PLAN:187-189); A3 (BRIEF:75) blocks exit
  until both land. VISION 5 and RULES Intake 5 met.
- Hard rules: ok. Dark behind `flags.campusV2` with owner and switch-on condition (A1); no src/net, wire or save change
  (PLAN:45-48); 32 cap kept (G332); team doors stay two-player (G280, LD 11.10) unless Michael picks otherwise.
## Claims
- claims-check: did not run. `node scripts/claims-check.mjs --plan docs/campus-greybox/PLAN.md --name
  feature/campus-greybox` prints "has no ```claims block". PLAN section 2 is a table, not the fenced block.
- Manual overlap scan (feature branches committed in the last 7 days, merge-base diff vs master, this job's files):
  - level-validator-v6, -v6e, -v6e2, mission-validator, mission-validator-dims (J12, Marlow): all five
    `docs/sector-redesign/graph/campusOps-S<N>.json` (lane-owned) and `scripts/level-measure.mjs` (MEAS-0, unclaimed).
  - coop4, coop4-data, -doc, -e2eai, -pol, -ui2 (J4, #317): `campusSectors.ts`, `campusS4Data.ts`, `campusS5Data.ts`,
    `tests/campusS1..S5.test.ts`, `tests/sectorGuardTags.test.ts`, `scripts/e2e-sectorops.mjs`, `src/core/flags.ts`.
  - mission-engine, mission-flg, mission-gb*, mission-net*, mission-pol1 (J26, Campaign): `campusOps.ts` (lead-owned),
    `src/core/flags.ts`, `tests/campusS1.test.ts`, `tests/sectorGuardTags.test.ts`.
  - sector-redesign-signoff: `docs/sector-redesign/signoff/SYNC.md`. guard-ai-docs-j1: `campusSectors.ts`.
  - Many branches: `src/core/flags.ts`, `docs/systems/testing-tools.md` (shared files, one-line additions).
## Slices
- P0 done (~5.5k, copies, A4). S1-a ~800/5 h, S1-b ~800/6 h, S1-c ~750/4.5 h, S2-a ~900/6.5 h, S2-b ~1000/7 h, S2-c
  ~700/5.5 h, S2-d ~700/3 h, S3-a..e ~600-1200/2-6 h, S4-a ~900/6 h, S4-b ~900/5.5 h, S4-c ~1000/6 h, S5-a ~800/4 h,
  S5-b ~900/5 h, S5-c ~600/3 h: all under the line cap; each is a two-slice PR group of brief slices. ok.
- TAG-<N> ~150/1-1.5 h, E2E-1 ~200/2 h, MEAS-0 ~50/1 h, EXIT-<N>, SW-<N> ~300/1 h: ok.
- E2E-2 ~1200 / 8 h, one Opus slice (PLAN:127): twice the ~4 h cap; "split ... if over" ties the split to lines only.
- A23 (BRIEF:140) covers only the S1-S3 lists in `campusSectors.ts`; #317 also appends two tagged rows each to
  `campusS4Data.ts` and `campusS5Data.ts`. If #317 lands first, the S4 / S5 v2 copies differ from live and
  `tests/campusV2.test.ts` (copy = live) fails; TAG-4 / TAG-5 do not say whether coop4's S4 / S5 rows are kept or replaced.
## Walk pacing
- Sector Ops: 3 unwalked, AT CAP (ROADMAP:75); Lighting 3 AT CAP (:77). ok: every section builds dark, SW-<N> only after
  Michael accepts its walk (A10 BRIEF:90, PLAN:191-196); nothing switches on a 4th feature.

## Fix list (FIX only, ranked)
1. Add a fenced ```claims block to PLAN.md: every file / glob of section 2 plus `scripts/level-measure.mjs` (MEAS-0),
   `docs/campus-greybox/exit/**`, the EXIT-<N> graph writes, map `campusOps`, wire: none, save: none; then run
   claims-check and record the overlaps above in section 0 / 2 with the order for each (who writes the five graph files
   first, J12 or the lanes; MEAS-0 vs J12's `level-measure.mjs`; J26's `campusOps.ts` lines). Done looks like:
   claims-check prints its overlap list, and each overlap has a named order or owner for the orchestrator to settle.
2. Widen A23 and PLAN:27 to all five data files (`campusSectors.ts` S1-S3 plus `campusS4Data.ts`, `campusS5Data.ts`) and
   say in TAG-4 / TAG-5 whether coop4's live S4 / S5 rows carry into v2 or are replaced by the TAG rows. Done looks
   like: A23 names five files; the equality test stays green whichever of P0 / #317 lands first.
3. Split E2E-2 into two slices (~4 h each, e.g. S1-S3 / S4-S5 probes), each with its files, checks and done line. Done
   looks like: two rows in PLAN section 5, each <= ~4 h.
