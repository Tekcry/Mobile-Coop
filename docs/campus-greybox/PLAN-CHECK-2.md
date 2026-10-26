# campus-greybox: plan check 2
Checker: Opus 5.5, 2026-10-25 20:12, PLAN at 9064d99c5 (BRIEF, STATE, briefs S1-S5 at the same head).
Verdict: FIX

## Check 1 fix items
- 1 Claims block: done. PLAN:54-84 is a fenced ```claims block (every file of the section 2 table, `level-measure.mjs`,
  `exit/**`, both graph paths, map `campusOps`, wire none, save none); 2a (PLAN:98-123) gives every overlap an order or
  owner, including the no-claims-block jobs (J12, coop4, J26, signoff). One new branch since: see Claims.
- 2 A23 on five files: done. BRIEF:145-155 names `campusSectors.ts` (S1-S3, split into `campusS1Data.ts` ..
  `campusS3Data.ts`), `campusS4Data.ts`, `campusS5Data.ts`; PLAN:30-33 carries it; TAG-4 / TAG-5 say "replaced" (PLAN:203,
  `briefs/S4.md:533-541`, `briefs/S5.md:476-483`); the guard slices drop carried rows (`S4.md:421`, `S5.md:343-344`).
  The copy test skips a section once its marker is false (`tests/campusV2.test.ts:88-91`), so it stays green either order.
- 3 E2E-2 split: done. E2E-2a (PLAN:206) and E2E-2b (PLAN:207), ~4 h / ~600 lines each, each with branch, files, checks
  and done line.

## Intent
- ok. Slices trace to the picks as in check 1 (BRIEF:18-48). The new A-lines are orders, not readings of Michael:
  A26 (BRIEF:165-173) and A27 (BRIEF:174-181) loosen no Michael-only rule.
- TAG-4 / TAG-5 replacing coop4's (#317) S4 / S5 rows is consistent with Q16 "Live now" and G362: the live rows stay in
  `campusS4Data.ts` / `campusS5Data.ts` until SW-4 / SW-5 (PLAN:203), so 1-4 player scaling on the live map is
  untouched; in v2 the base list is the signed count for 1 and 2 players and TAG appends one row for 3 and one for 4
  (PLAN:139-149, G362 "One player uses the same counts ... three or four players add the guards tagged for them").
  coop4's own test reads live `CAMPUS_SECTORS` and fails a section with no tag (`origin/feature/coop4`
  `tests/sectorGuardTags.test.ts:613`), so SW-<N> cannot ship a v2 section before its TAG-<N>. The v1 rows stand on
  the v1 cage / battery / archive layout, which S4-c and S5-b re-lay; carrying them would place guards on removed geometry.

## Gates
- Sign-off before greybox: ok (BRIEF:20-29, G328).
- Greybox exit: ok as written (A3 BRIEF:75-77; PLAN section 8: validator, `--require-measured`, route-runs "Never stuck",
  walk card). One break at switch-on: Fix 2.
- Dark: ok. `flags.campusV2` default `CAMPUS_V2_ON = []` (branch `src/core/flags.ts:71-82`), owner Sector Ops Build,
  switch-on = Michael accepts the section's walk (A1). No `src/net`, wire or save path (PLAN:86-89).
- A13 vs J12's drift test: the v2 path is right while dark. `tests/levelMeasureCampus.test.ts`
  (`origin/feature/level-validator-v6e2`) reads only `graph/campusOps-S<N>.json` (:37) and builds the campus with
  default flags (:48-53), so a v2 graph under `graph/v2/` is never read and the live graphs stay J12's.
- A26: ok. sector-marks PLAN "Risks" (`origin/feature/sector-marks` `docs/archive/sector-marks/PLAN.md:89-95`) names the same
  carry; `campusV2/s4Dress.ts:177` holds the `Math.hypot` it names; the four labels sit at `campusS1Data.ts:90`,
  `campusS3Data.ts:159`, `campusS4Data.ts:182`, `campusS5Data.ts:171` on this branch.
- A27: ok against guard-rules (`origin/feature/guard-rules` `docs/guard-rules/PLAN.md:35-40` "J17 order", :103-109 the
  S4 / S5 data, :251-254 S9). The S4 / S5 briefs carry it (`S4.md:418-421`, `S5.md:340-344`). One narrowing: Fix 4.

## Claims
- claims-check (rerun 20:10, exit 1): 37 plans with claims, 35 overlaps. All are in 2a except
  `origin/feature/hud-guidance-b2` (`e2e-sectorops.mjs`, `testing-tools.md`), new since the fix round: same "no order" as
  the other hud-guidance branches (polish 1).
- Overlaps, all ordered in 2a: guard-rules, -s1, -s2 (S4 / S5 data, `e2e-sectorops.mjs`, `flags.ts`: PR1 first);
  sector-marks, -b1 (`campusSectors.ts`, S4 / S5 data, `e2e-sectorops.mjs`: sector-marks first); test-runner-j20 and 15
  slice branches (`e2e-affected.mjs`, `run-e2e.mjs`, `e2e-sectorops.mjs`, `testing-tools.md`: J20 first);
  light-realism, -l0 (live campus tests: J10 first); map-ready, sector-batch, hud-guidance (+7), char-shadow-meter,
  coop-kit, guard-ai-mission-hooks, player-batch-j19, route-runs-2 (`flags.ts` / `e2e-sectorops.mjs` /
  `testing-tools.md` lines: no order).
- Not in the block: `changes/feature-campus-greybox.md` (P0 wrote it; PLAN:48 lists it) and each lane / TAG / E2E
  branch's own fragment (polish 2).

## Slices
- P0 done (~5.5k, copies, A4). V2-SEED 0.25 h. S1-a/b/c ~800/800/750 (brief slices 2-3 h each); S2-a/b/c/d
  ~900/1000/700/700 (2-4 h each); S3 ~300-1,400 per PR (R1-R7, 1-6 h); S4-a/b/c ~900/900/1000 (2-3 h each + 1 h);
  S5-a/b/c ~800/900/600 (2-4 h each); TAG ~150 / 1-1.5 h; E2E-1 ~200 / 2 h; E2E-2a / 2b ~600 / 4 h; MEAS-0 ~50; EXIT /
  SW ~300 / 1-2 h. Line caps ok; every brief slice is ~4 h or less except S3 R2 (5 h, polish 4).
- S3 brief does not match the PLAN (Fix 1): `briefs/S3.md:24` puts every S3 slice branch in the lead's worktree
  `C:/NightShift/Mobile-Coop-campus-greybox` while R1-R4 run as four parallel lanes (S3.md:54-61); S3.md:63 sends PRs
  "slice branch -> `feature/campus-greybox`" as 7 PRs (S3.md:65-73), while the PLAN has 5 PRs S3-a..e (PLAN:195) that go
  to master (PLAN:34-35, :217 "S3-e on master" gates E2E-2a; TAG-3 after "R5 merges"); S3.md:75 / :326 request only
  `e2e-sectorops:6`, PLAN:290 asks `:1`..`:6`.
- S2 parallel builders share a file (Fix 3): `briefs/S2.md:560` runs G6a (builder C, `s2Data.ts`) beside G1 (builder A),
  which sets `S2_V2_COPY` in the same `s2Data.ts` (S2.md:78, :194, :569 "Merge both by block"); RULES "A job":
  parallel agents never edit the same files.

## Walk pacing
- Sector Ops 3 AT CAP, Lighting 3 AT CAP (ROADMAP "Waiting on Michael"). ok: every section builds dark; SW-<N> only after
  Michael accepts its walk (A10, PLAN section 9); nothing switches on a 4th feature.

## Fix list (ranked)
1. Align `briefs/S3.md` with the PLAN: each parallel S3 sub-lane (R1a / R1 / R2 / R3 / R4, then R5-R7) works in its own
   worktree `C:/NightShift/Mobile-Coop-campus-greybox-s3-r<N>` on `feature/campus-greybox-s3-r<N>` (never the lead's
   folder); the PR target and grouping are the PLAN's (either S3.md lists S3-a..e as PLAN:195, or PLAN:195 and the E2E-2a
   gate list the brief's 7 PRs by name); laptop suites as PLAN section 10. Done looks like: S3.md:24, :63-75 and :326
   agree with PLAN:34-35, :195, :217, :290, and no brief tells an agent to check out a branch in
   `C:/NightShift/Mobile-Coop-campus-greybox`.
2. Switch-on re-measures every campus graph. V6's `measureGraph` stores one whole-map `geom` (light-set hash + nav hash,
   `origin/feature/level-validator-v6e2` `src/world/levelMeasure.ts:202-204`, copied to every space at :261), and the
   drift test fails on any stale `geom` (`tests/levelMeasureCampus.test.ts:61`, :73). Turning a section on changes the
   whole campus, so after SW-<N> the other four live graphs are stale and the moved v2 graph's EXIT-<N> values were taken
   under a different flag set: PLAN:281-283 ("the drift test ... builds the section as v2 and must stay green") does not
   hold. Done looks like: PLAN section 9 and BRIEF A13 say SW-<N> runs `node scripts/level-measure.mjs
   docs/sector-redesign/graph/campusOps-S{1..5}.json --write` with the new `CAMPUS_V2_ON`, then the drift test green in
   the same PR; 2a's J12 row says SW-<N> re-writes the `measured` values of all five live files (J12 told).
3. `briefs/S2.md` section 8: no two parallel builders edit `s2Data.ts`. Either G6a also owns the `S2_V2_COPY` line and G1
   leaves `s2Data.ts` alone, or G6a starts after G1 is pushed; a parallel builder gets its own worktree and branch. Done
   looks like: S2.md:78, :194, :560 and :569 name one editor of `s2Data.ts` per wave.
4. A27 covers every lane PR, not only S4 / S5: P0's commits (which edit `campusS4Data.ts` / `campusS5Data.ts`) ride in
   every lane PR until P0 is on master, so an S1-S3 lane PR that trains first would land them before PR1. PLAN:13 says
   so; PLAN:214-215 and the S1-S3 rows of section 5 do not. Done looks like: PLAN:214-215 reads "every lane PR (S1-S5)
   while it still carries P0's commits trains after PR1".

## Polish (not blocking)
1. 2a: 35 overlaps now; add `hud-guidance-b2` to the hud-guidance row (PLAN:100-101, :113).
2. Claims block: add `changes/feature-campus-greybox*.md` (each branch's fragment).
3. `briefs/S2.md:54` cites the P0 WIP at 66df0833; PLAN:34 says `c2f1f131` or later. Use one.
4. S3 R2 is a 5 h single slice (S3.md:165); ~4 h is the rule of thumb (R1 is 5 h with R1a split out already).
5. A26: a lane that re-lays its section and renames rooms keeps an objective label that names a room of its v2
   `S<N>_ROOMS` (sector-marks' `tests/campusObjectivePlace.test.ts` reads the live section, so it checks v2 at SW-<N>).
6. Section 8 step 5: the walk card line tells every co-op peer to open the same `?campusv2=` link (BRIEF A9; the layout
   is not on the wire, branch `flags.ts:70`); a mismatched client sees v1 walls under v2 guards.
7. Section 9: name TAG-<N> merged as an SW-<N> precondition (coop4's test enforces it; say it where the lead reads it).
