# campus-greybox - STATE

## Resume block (2026-10-25 ~20:40, plan check 2 fix round done; lead: Night Shift | Sector Ops Build)
- Job: Saltmarsh Park S1-S5 greybox to Michael's 2026-10-25 ~08:50 picks (BRIEF "Michael said"), merged dark per
  section. Worktree `C:/NightShift/Mobile-Coop-campus-greybox`, branch `feature/campus-greybox` (P0 + integration).
- P0 is in (no PR opened). The switch: `src/core/flags.ts:71` `campusV2`, `:76` `CAMPUS_V2_ON = []`, `:79`
  `readCampusV2`. Selector `src/world/maps/campusSections.ts:29` `CAMPUS_PARTS`. Copy test `tests/campusV2.test.ts:89`.
- Check 1 (PLAN-CHECK.md) fixed at 9064d99c5. Check 2 (PLAN-CHECK-2.md, FIX) fixed in this round:
  1. Worktrees: PLAN section 2 "Worktrees" (every branch but this one has its own folder
     `C:/NightShift/Mobile-Coop-campus-greybox-<suffix>`; no agent works in the lead's folder). `briefs/S3.md` section 2:
     six sub-lanes r1-r6, each worktree / branch / base, PRs S3-a .. S3-f to master (= PLAN section 5 S3 rows), laptop
     `e2e-sectorops:1` .. `:6` (S3.md section 6). S1 / S2 / S4 / S5 / TAG briefs name their worktrees too.
  2. Switch-on re-measure: PLAN section 9 and BRIEF A13: SW-<N> runs `level-measure --write` on all five live graphs
     with the new `CAMPUS_V2_ON`, drift test green in the same PR; 2a J12 row says so.
  3. `briefs/S2.md` section 8: one `s2Data.ts` editor per wave (G1 marker, then G6a on `-s2-g6a` beside G2-G4, merged
     before G5a); S2-c carries G6a, S2-d = G6b.
  4. A27 on every lane PR (S1-S5): PLAN section 5 order paragraph and S1-S3 rows, 2a guard-rules row, BRIEF A27.
  - Polish: 2a reran claims-check (39 plans, 37 overlaps: + hud-guidance-b2, guard-rules-s5, marlow-replan); claims
    block + `changes/feature-campus-greybox*.md` and `tests/campusObjectivePlace.test.ts` (SW only); P0 sha c2f1f131 in
    S1 / S2 briefs; S3 R2 split R2a / R2b; A26 room-name note; walk card same `?campusv2=` link; SW precondition TAG-<N>.
- Order once check 2 passes: P0 master take (carries per A23, A26, A27) once J15 PR1 lands; V2-SEED; the lead cuts the
  lane worktrees (S1, S2, S4, S5 from this head; S3 r1, then r2-r5 from r1's frame commit). TAG-3 waits for S3-f.
- Tell Marlow Build (J12): each SW-<N> rewrites `measured` on all five live campus graphs (PLAN 2a J12 row).
- Open: V6 `--require-measured` not on master (A3: exit waits); P0 PR ~5.5k lines (A4, copies); J15 PR1 not yet open.
- Marlow's mission-framework adds 2 lines to `campusOps.ts`; P0 kept both spots untouched (`git merge-file` clean).
- 2026-10-25 ~20:55 (new account): check-2 fixes verified, plan accepted at 9f36223c1; V2-SEED done 024c7c172 (byte-equal
  to signoff 9eb7b9c6). Lanes queued on cloud-queue (014c1750e): briefs/campus-greybox-{s1,s2,s3-r1,s4,s5}.md -> branches
  feature/campus-greybox-<lane> from 024c7c172 (no TAG, no S2 G5b; S3 r2-r5 queue from r1's frame commit).
Next: on each done brief: checker on the lane branch + laptop e2e-sectorops part; queue S3 r2-r5 at r1's frame commit

## Done
- 2026-10-25 ~20:40 plan check 2 fix round (Opus planner): worktree per parallel branch, S3 sub-lanes r1-r6 / PRs S3-a .. f
  to master, SW-<N> re-measures all five live graphs, S2 one `s2Data.ts` editor per wave, A27 on every lane PR, polish 1-7.
- 2026-10-25 ~20:00 plan check 1 fix round (Opus planner): claims block + overlaps (PLAN 2a), A23 five files, TAG-4 / TAG-5
  replace coop4 rows, E2E-2a / 2b, A26 sector-marks, A27 J15 PR1 first, A13 v2 graph path (briefs re-pathed).
- 2026-10-25 P0 (Opus builder): flag, parts, selector, S1-S3 data split out of `campusSectors.ts` (verbatim),
  `S4_PARTS` / `S5_PARTS`, `campusV2/` copies (15 files, re-pathed imports), `tests/campusV2.test.ts` (9 tests; a
  mutation of `campusV2/s1.ts` BOLLARD_XS fails the whole-campus case), BRIEF / PLAN / STATE, changelog fragment.

## History
- 2026-10-25 ~09:00 job started from origin/master 6c3f4a87 after Michael's S1-S5 sign-off.
