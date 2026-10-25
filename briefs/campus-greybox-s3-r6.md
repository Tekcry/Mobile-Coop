status: done feature/campus-greybox-s3-r6 3c62afb9694b7e6037c80d014446b7165b3154c1
# campus-greybox s3-r6 (cloud): R6 co-op lips, nav reach, v2 graph + R7 dressing re-run

Lead: Night Shift | Sector Ops Build. Job campus-greybox (J17). Starts only after the join brief
(`briefs/campus-greybox-s3-join.md`: r1-r4 merged into r5, J1-J4 and J8) is `status: done`.

- Base: `origin/feature/campus-greybox-s3-r5` @ fb2666fff5575ae1fa16ccdb0470d652d2679591. New branch: `feature/campus-greybox-s3-r6` (S3.md: its own
  PR S3-f), cut from that commit and pushed; never push to r5, another lane or master. Guard:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s3-r6`; and
  `git merge-base --is-ancestor fb2666fff5575ae1fa16ccdb0470d652d2679591 HEAD` (else `status: blocked base is not the join head`).
- The strict brief is `docs/campus-greybox/briefs/S3.md` on `origin/feature/campus-greybox`, section 4 **R6** and **R7**
  (read them in full, plus sections 0-2 and 9), the job BRIEF.md / PLAN.md. Hard rules (`origin/master:CLAUDE.md`): no
  reference-game names, hot paths allocate nothing (`hyp2` / `hyp3`, never `Math.hypot`), strict TS, no `@ts-ignore`.
- Cloud changes to the brief: ignore its worktree path and toplevel guard (the branch name stays). Where it says "stop and ask the
  lead", set `status: blocked <reason>` and stop that slice (finish R6 first). Unit tests only: `npm run typecheck:fast`
  (or `npx tsc --noEmit -p .`) and single vitest files with `--maxWorkers=2`, flag on with P0's helper,
  `buildCampus(b, { dress: false })` for R6. Every e2e, GPU, level-measure, screenshot or plan-svg leg is "pending PC
  run": list it, do not run it. Commit and push each slice and sub-step, path-limited (`git add <files>`), never `git add -A`.

## Owned files (exact)
- R6: `src/world/maps/campusV2/s3Lips.ts`, `tests/campusV2S3Coop.test.ts` (new), `tests/campusV2S3Graph.test.ts` (new),
  `docs/sector-redesign/graph/v2/campusOps-S3.json`.
- R7: `src/world/maps/campusV2/s3Dress.ts`, `tests/campusV2S3Dress.test.ts` (new).
- Both: `changes/feature-campus-greybox-s3-r6.md` (new fragment, `kind: minor`), `docs/campus-greybox/checks/s3-r6-build.md`.
- Lead-approved one-liner (r5 check polish 3), its own commit: `s3Data.ts` R_VOID point 8 (20.8, -1, 7.5) -> (21.4, -1,
  7.5), a standable deck spot off the hatch hole. Nothing else in `s3Data.ts`.
- Never touch: `s3Kit.ts`, `s3.ts`, `s3Shell.ts`, `s3L1.ts`, `s3Stairs.ts`, `s3Lights.ts`, `s3Devices.ts`, `s3Data.ts`, every
  other sub-lane test (`campusV2S3{Frame,Shell,L1,Stairs,Lights,Sync,Guards}.test.ts`), `src/world/maps/campusS3*.ts`,
  `campusSectors.ts`, `campusOps.ts`, `campusLips.ts`, `src/core/flags.ts`, `src/world/anchors.ts`, `scripts/`, `SYNC.md`,
  the live `graph/campusOps-S3.json`, `graph/plan/*`. A needed change there goes in the report as a finding.

## Step 0a - the join's last fix (lead-approved, its own commit, before anything else)
The join ended blocked on one red test (`campusV2S3Shell.test.ts` "the G nav seeds and hide spots are on nav"): R2's
chamber-roof seed sits 0.25 m from R1's plant. Apply the join builder's proposal: `src/world/maps/campusV2/s3L1.ts:67`
`new Vector3(33, S3_BOX.chamberTop, -18)` -> `new Vector3(32, S3_BOX.chamberTop, -18)`, and the pinned row in
`tests/campusV2S3L1.test.ts:533` `[33, 4.4, -18]` -> `[32, 4.4, -18]`. These two lines are the only edits allowed in
those files. Commit "campus-greybox S3 join: chamber-roof seed x 32 (clear of R1's plant)", push.

## Step 0 - baseline (no commit)
Run the test list below on the base. Confirm `campusV2S3Guards.test.ts` runs its merged half (MERGED true: 6 nav cases run,
not skipped), 15 pass, A99 worst <= 12, `checkSectors` empty; the L1 landing cells (31.6, 4.5, -6.2) and (59.7, 4.5, -6.2)
are walkable after J3; no guard slot, takedown spot or reinforce point lies in `s3-wstair` / `s3-nstair` / `s3-estair`.
Record counts. A red test here: `status: blocked <test, cause>` (the join's, not yours).

## R6 - lips, nav reach, graph (S3.md R6, every test it lists)
1. `S3_COOP_LIPS`: CR3 and CR3b with S3.md R6's numbers. Wiring exists (`s3Data.ts` `coopLips: S3_COOP_LIPS` ->
   `CAMPUS_PARTS` -> `CAMPUS_COOP_LIPS`): add nothing outside `s3Lips.ts`.
2. **CR3b ledge is J8's, already in `s3L1.ts`** (`b.ledge(18, -6, 18, -3, S3_L1)` or the join's logged numbers). Do NOT add
   a second one. If it is missing on the base: `status: blocked J8 ledge missing`.
3. Lip rule (the CR8 / S5 FIX cause: lips 0.10-0.30 deep were hang-only): `canClimbUp = depth >= LEDGE.climbDepth` 0.38
   (`anchors.ts:414`); `canClimb = canClimbUp && climbRoom` (`attachController.ts:714`). Manual `b.ledge` is not in
   `generateLedges(b.boxes)`: read the built `b.anchors.ledges`. For CR3 (generated, chamber 6.0 deep) and CR3b (manual)
   assert: exactly one matching lip run, `canHang && canClimbUp` true, normal toward the boost side (CR3 nx -1, CR3b nx +1),
   and `climbRoom` clear (body fits 0.67 m inboard at top + 0.05: CR3 x 30.67, CR3b x 17.33). Each assertion must fail if
   the lip is removed or made 0.3 deep: try it once locally, record it in the report, do not commit the broken copy.
4. The S3.md R6 tests (port `tests/campusS3.test.ts:385-487`): 4.3-4.5 lift (4.4 each), out of solo reach, standables,
   no step under the lips, headroom (CR3b to the 7.5 ceiling), CR3 roof from the gallery over the bridge plate, gallery
   not solo-reachable from the hall, hatch drop 4.4 onto the pad on nav and <= 4.5, three-stairs reach on the full build,
   nav flood (void and trench off the guards' grid, nothing east of x 64), panel near-side, `CAMPUS_COOP_LIPS` holds CR3
   and CR3b once each.
5. Graph: the v2 file already equals the plan graph (7c021f01 = 9eb7b9c6 for this file): keep ids, links and `syncs`
   byte-equal (R4's Sync test reads this path); add "as built: ..." notes for P-items that moved numbers, targets
   "measured: pending V6", `meta.players` [1,2,3,4], `meta.sections` all five, compact. Keys "1".."4" per guarded space =
   guards whose slot is in that space's `area` on his storey (not `zone`, not the HUD room): #15 (44, -9.8) counts in
   `s3-view`, #8 / #11 / #16 in `s3-hall`, no guard in a stair room; sums 20 at every key; no `unavoidable`.
   `campusV2S3Graph.test.ts` per S3.md R6 (sums from `S3_GUARDS`, area cells on nav, door links within 0.6 m, solo route
   with CR3 / CR3b blocked).
6. Validator: `node scripts/level-validate.mjs` on the five v2 graphs (S3.md R6): 0 errors; list warnings by kind vs
   D:217-224, any new kind for the lead. No `--require-measured`.

## R7 - dressing re-run (S3.md R7)
`S3_ART_TAGS` for the v2 room ids (drop `s3-lobby`, `s3-back`, `s3-strip`, `s3-yard`; nearest tags for `s3-control`,
`s3-hoist`, `s3-plant`, plus the J1 stair rooms, listed in the report); skins from the v2 `S3_BOX`; keepout misses into
`S3_HERO_LOG`. Never move a greybox box; CR3's west face and the hatch's west edge get no skin lip (the J8 ledge needs
none). Tests: the campusS3Dress pattern against v2, `tests/campusDressRules.test.ts` for section 2 with the flag on, and
one `dress: true` build that does not throw. The checker fix round is a later brief, not this one.

## Tests to run (each slice, and all at the end)
`npm run typecheck:fast`; `npx vitest run --maxWorkers=2 tests/campusV2S3Coop.test.ts tests/campusV2S3Graph.test.ts
tests/campusV2S3Dress.test.ts tests/campusDressRules.test.ts tests/campusV2S3*.test.ts tests/campusS3*.test.ts
tests/campusV2.test.ts tests/campusRuntimeNav.test.ts`. Default build (flag off) unchanged.
Pending PC runs: `e2e-sectorops:1`..`:6` flag off at the head; E2E-1 CR3 / CR3b boost and climb-up; E2E-2a v2 walk
(stairs, plenum, hatch drop, void route); plan-svg render vs P0 / P45; V6 measured targets.

## Done
R6 and R7 pushed; report `docs/campus-greybox/checks/s3-r6-build.md` (per slice: files, commits, tests with counts, the
step-0 baseline, the fail-first runs, graph key table, validator warnings, `src` file:line of each lip, deviations with
undo, findings for the lead, pending PC runs); then this brief `status: done feature/campus-greybox-s3-r6 <sha>` with a
short "## Report".

## Report (Night Shift | Cloud Builder 2, 2026-10-25)
Full report: `docs/campus-greybox/checks/s3-r6-build.md` on the branch (head 3c62afb9). R6 and R7 pushed.
- Step 0a done (seed x 32, its pinned row). Baseline on fb2666ff: 12 files 177 passed; Guards merged half 16 (incl. the
  join's stair-core case), A99 worst 11, checkSectors empty. One-liner R_VOID point 8 -> (21.4, -1, 7.5) in its own commit.
- R6: `s3Lips.ts` CR3 / CR3b; the CR3b ledge is J8's (`s3L1.ts:300`), not added again. `campusV2S3Coop` 22 / 22 (lip
  ledges with climb room, lift, no solo way up, headroom, roof via the spur only, gallery not from the hall, hatch drop
  4.4, three-stairs reach per core on the full build, nav flood, panels' near side). Fail-first: lip removed / 0.3 deep
  (CR3), removed / hang-only (CR3b) each fail the ledge case (local, not committed). Graph: guard keys 1-4 (c2 1, view 4,
  gown 1, hall 6, dock 4, sec 1, writeup 1, plant 1, control 1 = 20 at every key), as-built notes on 13 spaces, targets
  "measured: pending V6", compact; ids / links / syncs unchanged. `campusV2S3Graph` 5 / 5. Validator five v2 graphs: 0
  errors, S3's warnings the nine of D:217-224, no new kind.
- R7: tags for the 17 v2 rooms (new: control noc, hoist store, plant plant, stair rooms corridor); skins on the v2 boxes;
  hero spots moved; crane girder east-west (the 19 m hall is shorter than the 20.4 m girder). `campusV2S3Dress` 10 / 10
  incl. `checkDressing` clean and a `dress: true` build that no longer throws.
- All: brief's list 15 files 214 passed; typecheck and eslint clean. (No doc-lint on this base: the script is newer.)
- Findings for the lead: the clean bench (D:215 hero) is refused by rule C everywhere in the v2 clean room (the
  clean-suite route on z -3 crosses it); the dock desk stays greybox (no kit desk fits 2.0 m; the security desk blocks
  cam-dock, K8). Data pushed for Marlow's validator re-run.
- Pending PC run: `e2e-sectorops:1`..`:6` flag off at the head; E2E-1 CR3 / CR3b; E2E-2a v2 walk; plan-svg vs P0 / P45; V6.
