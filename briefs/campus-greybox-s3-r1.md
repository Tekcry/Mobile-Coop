status: done feature/campus-greybox-s3-r1 5d7da838cc8335c6ec47ff164777854cf52af35b
# campus-greybox s3-r1 (cloud): Saltmarsh Park v2 greybox lane, data + unit tests

Lead: Night Shift | Sector Ops Build. Job campus-greybox (FOLDED-PLAN J17, ROADMAP Now row 16). Plan checked (checks
1-2, accepted by the lead 2026-10-25 ~20:40); V2-SEED done at 024c7c172.

- Base: `origin/feature/campus-greybox` @ 024c7c172989f1c8bf938b02459940ec63e4febe. New branch: `feature/campus-greybox-s3-r1` (create it from the base and push it; never push to
  feature/campus-greybox; the lead merges / PRs it).
- The strict brief is `docs/campus-greybox/briefs/S3.md` on that base, with the job's BRIEF.md and PLAN.md. Scope for this
  cloud brief: sub-lane r1 only: R1a (the frame; push it as its own commit and write its sha in the report at once, sub-lanes r2-r5 branch from it) then R1. Not r2-r5 (the lead queues them from the frame commit), not TAG-3.
- Cloud changes to the brief:
  - Ignore its desktop worktree path and branch guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s3-r1`.
  - Its owned-file list and never-touch list are exact. Where it says "stop and ask the lead", set `status: blocked <reason>`
    and stop that slice (finish any earlier slice first).
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Every e2e, GPU, level-measure or screenshot leg it names is "pending PC run": list it, do not run it.
  - Commit and push each slice (and each sub-step of a long slice) on `feature/campus-greybox-s3-r1`, path-limited, never `git add -A`.
- Done: every in-scope slice pushed on `feature/campus-greybox-s3-r1`; a report `docs/campus-greybox/checks/s3-r1-build.md` (per slice: files
  changed, tests with counts, assumptions taken with their undo, deviations, pending PC runs); then
  `status: done feature/campus-greybox-s3-r1 <sha>` here.

## Report (Night Shift | Cloud Builder 1, 2026-10-25)
- **R1a frame sha (cut r2-r5 from this): `3a8c6893a0f7fec6c47a914f62ba96f0c929c940`.** Final: 5d7da838c. Full report: `docs/campus-greybox/checks/s3-r1-build.md` (brief name S3-R1.md); fragment `changes/feature-campus-greybox-s3-r1.md`.
- R1a: `s3Kit.ts` (section 3 constants, circuits incl. J17 160-165, five high bays, `S3_BOX`, 24 doors `S3_DOORS` [x, z, floor] + `S3_DOOR_SWING`, helpers verbatim), frozen `s3.ts` assembler, six empty sub-file stubs, `S3_V2_COPY = false`. `tests/campusV2S3Frame.test.ts` 4/4.
- R1: `s3Shell.ts` shell, z -11 wall (roller gap, control door, observation glass), dock (gas cage, desk, pad), x 52 walls + plant doors, sealed LV / riser walls, kept hall contents, yard walls, rooms, seeds, hide spots. `tests/campusV2S3Shell.test.ts` 9/9.
- Tests (rerun by the builder session at 5d7da838c): Frame + Shell + campusS3 + campusS3Dress + campusV2 = 67/67; typecheck and eslint clean; flag-off build unchanged.
- Deviations: trench not built (P14: campus ground is one box; test asserts "not built"); plant N wall z -7 built only x 52..58 and 61.5..64 (core segment x 58..61.5 and eStairG are R3's, as are nStairW, nStairE, wStairG, wStairL1); roller door has no shutter box (no source size); R1a "no two doors within 2.0 face each other" fails on the signed plan, so the test checks D:79's gallery rule and records the others; gas-cage offsets derived (as-built cage turned to the NW corner).
- Findings for the lead: (1) facing door pairs in the signed plan: landingFire / hoist 0.6 apart, sec / eStairL1 1.1 apart; (2) 0.2 m slots behind the N and E cores (core wall z -0.35 vs shell face -0.15): not walkable but leak sight / light dock <-> control and LV <-> riser, for R3 or the lead to close; (3) `?campusv2=3` with dressing throws until R7 (`s3Dress.ts:144` skins the old N bench), tests use `dress: false`; (4) the `s3-control` HUD room also covers the N core footprint.
- Pending PC runs: e2e-sectorops:1..6 (flag off) at the S3-a head, plan-svg render vs P0, V6 light / shadow measures (hide-spot light waits on R4's lamps).
