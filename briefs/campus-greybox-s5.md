status: done feature/campus-greybox-s5 589f9b69d28728bc619ffa70d0c37e1be4174489
# campus-greybox s5 (cloud): Saltmarsh Park v2 greybox lane, data + unit tests

Lead: Night Shift | Sector Ops Build. Job campus-greybox (FOLDED-PLAN J17, ROADMAP Now row 16). Plan checked (checks
1-2, accepted by the lead 2026-10-25 ~20:40); V2-SEED done at 024c7c172.

- Base: `origin/feature/campus-greybox` @ 024c7c172989f1c8bf938b02459940ec63e4febe. New branch: `feature/campus-greybox-s5` (create it from the base and push it; never push to
  feature/campus-greybox; the lead merges / PRs it).
- The strict brief is `docs/campus-greybox/briefs/S5.md` on that base, with the job's BRIEF.md and PLAN.md. Scope for this
  cloud brief: every build slice in the brief's order, except TAG-5 (waits for #317). J15 guard-rules PR1 is not on master yet: follow the brief and job BRIEF A27 (no section gear tags; the lane builds now, its PR waits for PR1).
- Cloud changes to the brief:
  - Ignore its desktop worktree path and branch guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s5`.
  - Its owned-file list and never-touch list are exact. Where it says "stop and ask the lead", set `status: blocked <reason>`
    and stop that slice (finish any earlier slice first).
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Every e2e, GPU, level-measure or screenshot leg it names is "pending PC run": list it, do not run it.
  - Commit and push each slice (and each sub-step of a long slice) on `feature/campus-greybox-s5`, path-limited, never `git add -A`.
- Done: every in-scope slice pushed on `feature/campus-greybox-s5`; a report `docs/campus-greybox/checks/s5-build.md` (per slice: files
  changed, tests with counts, assumptions taken with their undo, deviations, pending PC runs); then
  `status: done feature/campus-greybox-s5 <sha>` here.

## Report (Night Shift | Cloud Builder 1, 2026-10-25)
- Resumed from the old-account builder's head af3c46b3 (P1 3c600cc1, P2 9ea8a93d, P3 af3c46b3; all green on resume, 88 tests).
- P4 built at 5c57c05f: `S5_COOP_LIPS` CR8-s5 / CR9-s5 / CR10-s5 and `S5_LIP_SEGMENTS` exactly as briefed (s5.ts:173-203),
  `S5_PARTS.coopLips` (s5Data.ts:232); new tests `campusV2S5Coop` (20: lip rules 1-5, one ledge per lip, LD 11.8, CR7 two
  players only, K4), `campusV2S5Graph` (6: LD 15, solo past the team doors, LightField at the vantages), `campusV2S5Screen` (1:
  worst 7 of cap 12); graph keys "1".."4" = 26 at every key, `s5-ante` unavoidable, notes BUILT P4.
- Report `docs/campus-greybox/checks/s5-build.md` (P1-P4, guard table, sync-node lines, light and screen readings) at 589f9b69.
- Tests: typecheck and eslint clean; slice set 11 files 115 / 115 (S5 v2 64, v1 29 + 10 + 9 + 3); changesFragments 1 / 1.
- Validator (five v2 files): 0 errors, 141 warnings; the S5 kinds as D:196-198 plus one new kind: `unknown tag 'unavoidable'`.
- Deviations: none in the data. Findings for the lead (K4 angles: sash 45 deg off #9, shaft door 30 deg off #28; the solo well
  route ~24 s; roof NW sees 6, not 8; lit back hall and three hide spots) are in the report.
- TAG-5 not built (waits for #317). Pending PC run: `e2e-sectorops:1`..`:6` default flags, `affected-e2e`, the measured
  validator / V6, J13 route-runs, any look check.
