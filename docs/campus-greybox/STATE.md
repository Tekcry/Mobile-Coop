# campus-greybox - STATE

## Resume block (2026-10-25 ~20:00, plan check 1 fix round done; lead: Night Shift | Sector Ops Build)
- Job: Saltmarsh Park S1-S5 greybox to Michael's 2026-10-25 ~08:50 picks (BRIEF "Michael said"), merged dark per
  section. Worktree `C:/NightShift/Mobile-Coop-campus-greybox`, branch `feature/campus-greybox` (P0 + integration).
- P0 is in (no PR opened). The switch: `src/core/flags.ts:71` `campusV2`, `:76` `CAMPUS_V2_ON = []`, `:79`
  `readCampusV2` (`?campusv2=1,3`, `?campusv2=0`). Selector `src/world/maps/campusSections.ts:29` `CAMPUS_PARTS`.
- Live parts: `campusS1Data.ts:129`, `campusS2Data.ts:141`, `campusS3Data.ts:176`, `campusS4Data.ts:214`,
  `campusS5Data.ts:194`; v2 parts `campusV2/s<N>Data.ts`, copy markers `S<N>_V2_COPY` at each file's end.
- Test: `tests/campusV2.test.ts` (copies = live, :89; whole campus equal). Lane tests `tests/campusV2S<N>*.test.ts`.
- Plan check 1 (PLAN-CHECK.md, FIX) fixed in BRIEF / PLAN / briefs:
  1. PLAN section 2 has the ```claims block; claims-check: 36 plans, 34 overlaps, each with an order in PLAN 2a (plus
     the no-claims-block jobs: J12, coop4, J26, signoff).
  2. BRIEF A23 covers all five data files; PLAN section 5 TAG-4 / TAG-5: coop4's live S4 / S5 rows are replaced, not
     carried (dropped by S4-c / S5-b, v2 rows appended by TAG).
  3. E2E-2 split: E2E-2a (part 7, S1-S3, 4 h) and E2E-2b (part 8, S4-S5, 4 h), each with files, checks, done line.
  4. BRIEF A26: sector-marks first; the lead carries its 4 labels and `campusV2/s4Dress.ts:177` `hyp2` at the next take.
  5. BRIEF A27 + PLAN 0 / 5: J15 guard-rules PR1 on master before any J17 edit to `campusS4Data.ts` / `campusS5Data.ts`
     (P0's PR and S4 / S5 lane PRs wait; lanes build now); briefs S4 G4.6 / S5 P3 use PR1's gear rule.
- Found in the fix round: J12's drift test `tests/levelMeasureCampus.test.ts` measures the live graphs with every flag off,
  so v2 graphs now live in `docs/sector-redesign/graph/v2/` (BRIEF A13 CHANGED; briefs re-pathed); V2-SEED (lead) copies
  the five plan graphs @9eb7b9c6 there before the lane worktrees are cut; SW-<N> moves the file over the live one.
- Next steps after check 2 passes: P0 master take (carries per A23, A26, A27) once PR1 lands; V2-SEED; lane worktrees
  `feature/campus-greybox-s<N>` from this branch's head.
- Open: V6 `--require-measured` not on master (A3: exit waits); P0 PR ~5.5k lines (A4, copies); J15 PR1 not yet open.
- Marlow's mission-framework adds 2 lines to `campusOps.ts`; P0 kept both spots untouched (`git merge-file` clean).
Next: fresh Opus plan checker (check 2)

## Done
- 2026-10-25 ~20:00 plan check 1 fix round (Opus planner): claims block + overlaps (PLAN 2a), A23 five files, TAG-4 / TAG-5
  replace coop4 rows, E2E-2a / 2b, A26 sector-marks, A27 J15 PR1 first, A13 v2 graph path (briefs re-pathed).
- 2026-10-25 P0 (Opus builder): flag, parts, selector, S1-S3 data split out of `campusSectors.ts` (verbatim),
  `S4_PARTS` / `S5_PARTS`, `campusV2/` copies (15 files, re-pathed imports), `tests/campusV2.test.ts` (9 tests; a
  mutation of `campusV2/s1.ts` BOLLARD_XS fails the whole-campus case), BRIEF / PLAN / STATE, changelog fragment.

## History
- 2026-10-25 ~09:00 job started from origin/master 6c3f4a87 after Michael's S1-S5 sign-off.
