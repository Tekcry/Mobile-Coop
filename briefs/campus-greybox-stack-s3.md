status: done feature/campus-greybox-s3-f 644c0ae70b0578a35494428c44b9eeca98891720
# campus-greybox stack S3 (cloud): re-stack the S3 rounds into six PR-sized branches S3-a .. S3-f

Lead: Night Shift | Sector Ops Build. Job campus-greybox (J17, Saltmarsh Park v2). Planner: Opus, 2026-10-26.
No new game code: this brief merges finished, checker-passed lane commits (S3 r1 .. r6, all PASS) onto P0 in six
branches, each under the 1,500-line PR cap, the same way `feature/campus-greybox-s1-a..c` and `-s2-a..d` were cut.

## Base and branches (exact)
- Chain base: `origin/feature/campus-greybox-p0` @ `f466c4a5b421d67961d1e91aa75a52269105b78d` (P0, PR #503, merged to
  master in train 117 as `0e12833d1`; it is an ancestor of origin/master, so each PR's diff against master is only its
  own part). Do NOT merge or rebase onto master.
- Each branch is cut from the previous one and pushed before the next starts:

| New branch | Cut from | Lane commits to merge (exact, in this order) | Parts | Expected counted lines vs its base |
| --- | --- | --- | --- | --- |
| `feature/campus-greybox-s3-a` | p0 `f466c4a5b` | `cb43b6cee0b156aa7df44b89da0bf2ea55348b24` | R1a frame | 1030 |
| `feature/campus-greybox-s3-b` | s3-a head | `5d7da838cc8335c6ec47ff164777854cf52af35b` (r1 head), then `107f426537e04bb2fafb2b1f752aaa71df103110` (r2 head), then cherry-pick `5f00ff6cc74676b2d8f93a06d750abcbcd308bfb` | R1 shell and G, R2, the join's chamber-roof seed fix | 1356 |
| `feature/campus-greybox-s3-c` | s3-b head | `4dd20af192974478cfde3233afd9ebc6b57691b3` (r3 head) | R3 fire stairs | 757 |
| `feature/campus-greybox-s3-d` | s3-c head | `e37b265659ba0bfb9dc473d7f47c8fa88145a80d` (r4 head) | R4 lamps, devices, sync | 659 |
| `feature/campus-greybox-s3-e` | s3-d head | `fb2666fff5575ae1fa16ccdb0470d652d2679591` (r5 head) | R5 20 guards + join J1-J4, J8 | 834 |
| `feature/campus-greybox-s3-f` | s3-e head | `3c62afb9694b7e6037c80d014446b7165b3154c1` (r6 head, lane end) | R6 lips / coop / graph, R7 dressing | ~931 |

Why the split (lane-stacks.md): r1 alone is 1517 counted, so S3-a is the R1a frame only and S3-b takes r1's shell / G
re-lay with r2. The planner merged this exact chain locally (2026-10-26): every merge is clean (no conflicts), the end
tree equals r6 plus P0, and every listed test file is green at every branch, with one exception fixed by the cherry-pick:
at S3-b, r1 + r2 together turn `campusV2S3Shell.test.ts` "the G nav seeds and hide spots are on nav" red (r2's
chamber-roof seed 0.25 m from r1's plant; the join found it). `5f00ff6cc` (s3L1.ts:67 x 33 -> 32 and the pinned row in
`campusV2S3L1.test.ts`) fixes it; r6 carries the same change, so S3-f's merge stays clean.

## Guard and rules
- Before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = <the branch you are on now>`.
- Merge only the lane commits above (`git merge --no-ff --no-commit <sha>`), cherry-pick only `5f00ff6cc`. Never merge
  master or any other branch, never rebase, never force-push, never push to a lane branch (`-s3-r*`), p0 or master.
  Never open a PR. Commit path-limited (`git add <files>`), never `git add -A` / `.`.
- No hand edits to `src/` or `tests/` (the merges carry the code). The only files you write yourself:
  `changes/feature-campus-greybox-s3-<x>.md` (one per branch), `docs/campus-greybox/lane-campus-greybox-s3-<x>-pr-body.md`
  (one per branch), and this brief's report. A merge conflict in `src/` or `tests/` was not expected:
  `status: blocked conflict in <file> at s3-<x>` and stop.

## Per branch, in order a -> f
1. `git checkout -b feature/campus-greybox-s3-<x> <cut from>`; `git merge --no-ff --no-commit <sha>` (S3-b: merge
   `5d7da838c` and commit, then merge `107f42653` and commit, then `git cherry-pick 5f00ff6cc`, keeping its message).
2. Changelog fragment (rule: one fragment per branch, `changes/<branch-with-dashes>.md`, `changes/README.md`):
   the merge brings the round fragment `changes/feature-campus-greybox-s3-r<k>.md`. `git mv` it to
   `changes/feature-campus-greybox-s3-<x>.md`, keep its `kind`, title "Campus greybox S3-<x> (v2, dark): <parts>", and
   keep only this branch's bullets (S3-a: r1's fragment describes frame + shell + ground floor in one bullet: cut it
   to the frame only, "shared plan boxes, doors and light circuits"; S3-b: a new `-s3-b.md` with the shell and ground
   floor plus r2's upper-floor bullet, then `git rm` r2's fragment). After the merge `ls changes/feature-campus-greybox-s3*` lists only `-s3-a.md` .. this
   branch's fragment, and `git diff <cut from> -- changes/feature-campus-greybox-s3-<earlier>.md` is empty (earlier
   parts' fragments unchanged; a round fragment that comes back with a later merge is deleted).
3. Merge commit message: `Merge origin/feature/campus-greybox-s3-r<k> @ <short sha> (<parts>) into feature/campus-greybox-s3-<x>`,
   body "S3-<x> of the lane-stacks split: <parts>, on <cut from branch>. Changelog fragment
   changes/feature-campus-greybox-s3-<x>.md; earlier parts' fragments kept." and the trailer
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
4. Checks (below), then the PR body file, commit it, `git push -u origin feature/campus-greybox-s3-<x>`.

## Checks per branch (unit tests only: no e2e, no GPU, no `npm run check`)
- `npx tsc --noEmit -p tsconfig.json` (or `npm run typecheck:fast`): clean.
- `node scripts/pr-size.mjs --base origin/<cut from> --head HEAD`: counted < 1500 and within 60 of the table.
- `npx vitest run --maxWorkers=2` with, per branch:
  - a: `tests/campusV2S3Frame.test.ts tests/campusV2.test.ts tests/campusS3.test.ts tests/changesFragments.test.ts`
  - b: a's list + `tests/campusV2S3Shell.test.ts tests/campusV2S3L1.test.ts`
  - c: b's list + `tests/campusV2S3Stairs.test.ts`
  - d: c's list + `tests/campusV2S3Lights.test.ts tests/campusV2S3Sync.test.ts`
  - e: d's list + `tests/campusV2S3Guards.test.ts` (confirm its merged half runs: no skipped nav cases)
  - f: e's list + `tests/campusV2S3Coop.test.ts tests/campusV2S3Graph.test.ts tests/campusV2S3Dress.test.ts
    tests/campusS3Dress.test.ts tests/campusDressRules.test.ts tests/campusPosts.test.ts tests/sectionBakeCampus.test.ts`
  Planner's local counts (fragments not yet renamed, so without changesFragments): a 45, b 70, c 95, d 111, e 128,
  f 165 + 53 (1 skipped). Every listed test green.
- Pending PC run (list in the report, do not run): `affected-e2e` on each PR head (laptop queue), the level validator
  on the five v2 graphs at S3-f.

## Last branch (S3-f): the coop4 rows (lead correction, PLAN section 4)
The v2 guard list is the signed base list with no `minPlayers` row; TAG-3 (PLAN section 2 row TAG-<N>, BRIEF A14)
appends the two tagged v2 extras later. PR #317 (coop4) is still open and not on master or p0, so this stack carries no
coop4 row. At S3-f: `git grep -n minPlayers -- src/world/maps/campusV2/s3Data.ts` must print nothing (if it prints a
row, delete that row and say so in the report). The vitest asserts already exist on r5 / r6 and must stay:
`tests/campusV2S3Guards.test.ts` `expect(G.length).toBe(20)` and "no guard has `minPlayers`" (r6 lines ~104 and ~115).
No new test is needed; if either assert is missing at S3-f, `status: blocked coop4 assert missing`.

## PR body file (each branch)
`docs/campus-greybox/lane-campus-greybox-s3-<x>-pr-body.md`: title line "Sector Ops: Saltmarsh Park v2 S3-<x> <parts>
(dark, campus-greybox)"; PR base (S3-a: master; S3-b .. f: the previous `-s3-<x>` branch, merge in order); one
paragraph of what the part builds (from the round's build report in `docs/campus-greybox/checks/s3-r<k>-build.md`); "No
player-visible change: behind `?campusv2=3` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-3)";
counted lines; tsc and vitest results with counts; "pending PC run" list; deviations (S3-b's cherry-pick). S3-f's body
adds "TAG-3 follows (BRIEF A14: two tagged v2 extras)". No `Job-done` line. End with
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Done
Six branches pushed, each: tsc clean, listed tests green, counted < 1500 vs its base, fragment and PR body file
committed. Report at the end of this brief (branch -> head sha, counted lines, test counts, deviations), then
`status: done feature/campus-greybox-s3-f <sha>`. Any red test or size over the cap: `status: blocked <branch, test or
size>` and stop at that branch (earlier branches stay pushed).

## Report (desktop agent for Night Shift | Sector Ops Build, 2026-10-26)
S3-a a077ff1a (1030 counted) .. S3-f 644c0ae7 (929); tsc clean, vitest green each (S3-f 218 pass, 1 skipped); all merges
clean; coop4 asserts present. Sonnet PASS (scratch lane-s3-check.md). PRs #539 (master) -> #540 -> #541 -> #542 -> #543 -> #544.
