status: done feature/campus-greybox-s4 8379670b2b817436876b70e55b64f01f51c5b497
# campus-greybox s4 (cloud): Saltmarsh Park v2 greybox lane, data + unit tests

Lead: Night Shift | Sector Ops Build. Job campus-greybox (FOLDED-PLAN J17, ROADMAP Now row 16). Plan checked (checks
1-2, accepted by the lead 2026-10-25 ~20:40); V2-SEED done at 024c7c172.

- Base: `origin/feature/campus-greybox` @ 024c7c172989f1c8bf938b02459940ec63e4febe. New branch: `feature/campus-greybox-s4` (create it from the base and push it; never push to
  feature/campus-greybox; the lead merges / PRs it).
- The strict brief is `docs/campus-greybox/briefs/S4.md` on that base, with the job's BRIEF.md and PLAN.md. Scope for this
  cloud brief: every build slice in the brief's order, except TAG-4 (waits for #317). J15 guard-rules PR1 is not on master yet: follow the brief and job BRIEF A27 (no section gear tags; the lane builds now, its PR waits for PR1).
- Cloud changes to the brief:
  - Ignore its desktop worktree path and branch guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s4`.
  - Its owned-file list and never-touch list are exact. Where it says "stop and ask the lead", set `status: blocked <reason>`
    and stop that slice (finish any earlier slice first).
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Every e2e, GPU, level-measure or screenshot leg it names is "pending PC run": list it, do not run it.
  - Commit and push each slice (and each sub-step of a long slice) on `feature/campus-greybox-s4`, path-limited, never `git add -A`.
- Done: every in-scope slice pushed on `feature/campus-greybox-s4`; a report `docs/campus-greybox/checks/s4-build.md` (per slice: files
  changed, tests with counts, assumptions taken with their undo, deviations, pending PC runs); then
  `status: done feature/campus-greybox-s4 <sha>` here.

## Report (Night Shift | Cloud Builder 2, 2026-10-25)
Resumed from 8bd64d26 (G4.1-G4.2 by Cloud Builder 1, rechecked 7 files 102/102, not redone). Built: G4.3 0eadcb49, G4.4
50dc6f38, G4.5 690f5faf, G4.6 data 41e52722, G4.6 tests and report 8379670b (`docs/campus-greybox/checks/s4-build.md`, a
section per slice, plus the s4.ts / s4Data.ts line of every sync node and lead for SYNC.md). Fragment
`changes/feature-campus-greybox-s4.md`. Only the lane's owned files touched (lane diff from 024c7c17: 13 files, +3272 / -220,
mostly tests: over the ~1.5k PR cap if it goes up as one PR).
- Tests (`--maxWorkers=2`): 12 files 156/156: campusRuntimeNav 3, campusS4 41, campusS4Dress 14, campusS4NocSight 3,
  campusV2 9, campusV2S4 19, campusV2S4Coop 29, and new campusV2S4Graph 6, Guards 11, Lights 9, Screen 1 (worst point sees
  8 guards, cap 12), Sync 11. typecheck:fast clean. Validator on the five v2 graphs: 0 errors, none naming an `s4-` space.
- Deviations (undos in the report): A1 G4.4 the brief's NOC hatch ladder faced north and stepped off at z 48.05 inside the
  2.0 m deck screen with rails on the other three sides (no way out): built on the east rim `b.ladder(6.95, 47.2, S4_NOC,
  S4_DECK, PI / 2)` with a 0.5 m east-rail gap. A2 G4.5 `b.noLedge(34.6, 22.4 / 23.6, 0.5)` also killed the CR10 east lip
  (ends 0.45 m away): radius 0.4. A3 / A4 G4.6: #12's takedown spot moved along his route to (-5.5, 35.4) (K3 #19 saw the
  brief's spot through battCC); #22's two z 32.4 points off the nav grid, moved to z 32.5; #25 an M8 overlap exception with
  #5 / #6 (same room). A27: `gear: 'helmet'` removed from the v2 section and `'armour'` from #6, #14, #15 (no section helmet
  until PR1). s4Dress.ts: its one `Math.hypot` -> `hyp2`; NOC desk and video-wall hero candidates adjusted for the new stair.
- Findings: the validator does not know `unavoidable` (`s4-cc`, for J12); the dressed hero log omits NOC desk 2; battery
  racks stay unskinned (the 1.2 m kit piece fits only at 1.3 scale); graph-note file:line refs are as of each slice commit.
- Pending PC runs: e2e-sectorops:1..6 default flags; E2E-1 / E2E-2 on v2 (CR8 / CR8-west / CR10 climbs, the A1 hatch
  ladder, escape ladder, fire stair, kp-riser, deck exit); V6 level-measure targets and lit-lamp screenshots;
  `--require-measured` (EXIT-4); then tell Marlow "S4 v2 data pushed at <sha>" so Code Relay re-runs its validator.
