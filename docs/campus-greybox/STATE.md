# campus-greybox - STATE

## Resume block (2026-10-25, P0 done; lead: Night Shift | Sector Ops Build)
- Job: Saltmarsh Park S1-S5 greybox to Michael's 2026-10-25 ~08:50 picks (BRIEF "Michael said"), merged dark per
  section. Worktree `C:/NightShift/Mobile-Coop-campus-greybox`, branch `feature/campus-greybox` (P0 + integration).
- P0 is in (no PR opened). The switch: `src/core/flags.ts:71` `campusV2`, `:76` `CAMPUS_V2_ON = []` (switch-on adds the
  section number), `:79` `readCampusV2` (`?campusv2=1,3`, `?campusv2=0`).
- The selector: `src/world/maps/campusSections.ts:29` `CAMPUS_PARTS` (v1 or v2 per section). Parts type:
  `src/world/maps/campusParts.ts`. Live parts: `campusS1Data.ts:129`, `campusS2Data.ts:141`, `campusS3Data.ts:176`,
  `campusS4Data.ts:214`, `campusS5Data.ts:194` (`S<N>_PARTS`). v2 parts: `campusV2/s<N>Data.ts` (same names) and the
  copy markers `S<N>_V2_COPY` at the end of each.
- Combiners (lead-owned): `campusSectors.ts` (tables), `campusLips.ts`, `campusOps.ts:66` `BOARD_ORDER`, `:123` the
  section builds, `campusDress.ts:32-35`, `:80`.
- Test: `tests/campusV2.test.ts` (flag off = live; flag on = v2; copies = live, whole campus equal). Lane tests go in
  `tests/campusV2S<N>*.test.ts`.
- Next: write the five lane briefs from PLAN "Slices" / "File ownership" (other agents are writing
  `docs/campus-greybox/briefs/`), make the lane worktrees `feature/campus-greybox-s<N>` from this branch's head, and the
  engine lane (S2 C18) from master after Marlow's mission-framework merges. Plan checker (Opus, fresh) on BRIEF + PLAN
  before lane builds.
- Open: V6 `--require-measured` not on master (BRIEF A3: greybox exit waits); P0 PR is ~5.5k lines (BRIEF A4, copies).
- Marlow's mission-framework adds 2 lines to `campusOps.ts` (an import after `dressCampus`, `missions:` after
  `sectors: CAMPUS_SECTORS,`): P0 kept both spots untouched; `git merge-file` against those lines merges clean.
- Checks at P0: `npm run typecheck:fast` clean; eslint on the changed files clean; vitest 28 files (tests/campus*, sectionBakeCampus, sectorItemScope, armour, securityCameraE8, weaponsCrate) 439 passed, 1 skipped; changesFragments passed.

## Done
- 2026-10-25 P0 (Opus builder): flag, parts, selector, S1-S3 data split out of `campusSectors.ts` (verbatim),
  `S4_PARTS` / `S5_PARTS`, `campusV2/` copies (15 files, re-pathed imports), `tests/campusV2.test.ts` (9 tests; a
  mutation of `campusV2/s1.ts` BOLLARD_XS fails the whole-campus case), BRIEF / PLAN / STATE, changelog fragment.

## History
- 2026-10-25 ~09:00 job started from origin/master 6c3f4a87 after Michael's S1-S5 sign-off.
