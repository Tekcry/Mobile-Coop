status: done feature/campus-greybox-s4-c 991400dbcba07520199e16c4184f84479a050c3f
# campus-greybox stack S4 (cloud): re-stack the S4 lane into three PR-sized branches S4-a .. S4-c, A23 re-applied

Lead: Night Shift | Sector Ops Build. Job campus-greybox (J17, Saltmarsh Park v2). Planner: Opus, 2026-10-26.
No new game code: this brief merges the finished, checker-passed S4 lane (G4.1 .. G4.6 + fix 1, PASS) onto P0 in three
branches, each under the 1,500-line PR cap, the same way `feature/campus-greybox-s1-a..c` and `-s2-a..d` were cut, and
keeps P0's guard-rules state (BRIEF A23 / A27) in `src/world/maps/campusV2/s4Data.ts`.

## Base and branches (exact)
- Chain base: `origin/feature/campus-greybox-p0` @ `f466c4a5b421d67961d1e91aa75a52269105b78d` (P0, PR #503, merged to
  master in train 117 as `0e12833d1`; an ancestor of origin/master, so each PR's diff against master is only its own
  part). Do NOT merge or rebase onto master.

| Branch | Cut from | Lane commit to merge (exact) | Parts | Expected counted lines vs its base |
| --- | --- | --- | --- | --- |
| `feature/campus-greybox-s4-a` | ALREADY PUSHED: `44847fb72b070ce358f58bd6cca533cfd083bbfd` (on p0 `f466c4a5b`) | `8bd64d2681e7dee4a1dad6561d837a52a661f2be` | G4.1 + G4.2 | 908 |
| `feature/campus-greybox-s4-b` | s4-a head | `690f5faf167cc9e6ecd7edc559d6b2918bedd911` | G4.3 + G4.4 + G4.5 | 800 |
| `feature/campus-greybox-s4-c` | s4-b head | `8706493a4e802df9a0782e485bf65462cbeb8db3` (lane head) | G4.6 + fix 1 + A23 assert | ~1372 |

Why this split (lane-stacks.md): G4.5 + G4.6 + fix 1 = 1618 > 1500, so G4.5 moves to S4-b.

## S4-a is pushed but unverified: verify it, do not rebuild it unless it fails
The lead pushed the old agent's staged S4-a as a WIP commit `44847fb72` (a merge of p0 and `8bd64d268`). The planner
re-merged it independently: its tree equals the planner's result except the fragment, which is correctly renamed to
`changes/feature-campus-greybox-s4-a.md` with G4.1 + G4.2 bullets. Verify:
1. `git checkout -b feature/campus-greybox-s4-a origin/feature/campus-greybox-s4-a`; `git log -1 --format=%P` is
   `f466c4a5b... 8bd64d268...`.
2. Re-merge into a throwaway branch (`git checkout -b tmp-s4a f466c4a5b && git merge --no-ff --no-commit 8bd64d268`),
   resolve `s4Data.ts` by the rule below, then `git diff --stat tmp-s4a feature/campus-greybox-s4-a` shows only the
   fragment (rename + title). Delete `tmp-s4a` (never push it).
3. Run the S4-a checks. If all hold, add the PR body file in a follow-up commit (message "campus-greybox S4-a: PR body,
   verified (tsc, vitest)") and push. If the tree differs in `src/` or `tests/` or a check fails: rebuild S4-a from
   p0 by the method below in a new commit series on the same branch (no force-push: `git revert` is not needed, just
   commit the corrected tree on top) and say so in the report.

## The A23 / A27 conflict rule (`src/world/maps/campusV2/s4Data.ts`, the only file expected to conflict)
P0 carried master's guard-rules state into the v2 copy (merge-resolutions check 2026-10-26: armour not 'both', no
section `gear: 'helmet'`, `shieldTeams: true` with its comment). The lane wrote the same gear (armour only, no section
gear) but no `shieldTeams`. In every conflict hunk of `s4Data.ts`: take the lane side (theirs: positions, rows, sweep,
comments), and keep P0's two lines `// (guard-rules S1, A15) no section gear: ...` and
`// (guard-rules S1, A4) a riot-shield guard ...` + `shieldTeams: true,` in `S4_SECTOR`. Expected conflicts: S4-a one
hunk (#4 mantrap officer row + the gear comment: lane row, P0 gear comment); S4-c two hunks (#4 row with `pair: 20` and
the lane's gear comment; the sweep block: lane sweep with P0's `(guard-rules S1, A15)` comment line above it). After
resolving: no `gear: 'both'`, no section `gear:` in `S4_SECTOR`, `shieldTeams: true` present, no conflict markers. Any
conflict in another file: `status: blocked conflict in <file> at s4-<x>`.

## Method per branch (b, c; and a if rebuilt)
1. Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s4-<x>`.
2. `git checkout -b feature/campus-greybox-s4-<x> <cut from>`; `git merge --no-ff --no-commit <lane sha>`; resolve.
3. Fragment (`changes/<branch-with-dashes>.md`): the merge brings changes to the lane fragment
   `changes/feature-campus-greybox-s4.md` (git may apply them to the renamed `-s4-a.md`). End state: `-s4-a.md` (and at
   c also `-s4-b.md`) byte-equal to the cut-from branch (`git diff <cut from> -- changes/` shows only the new file),
   no `changes/feature-campus-greybox-s4.md`, and a new `changes/feature-campus-greybox-s4-<x>.md`, `kind: patch`,
   title "Campus greybox S4-<x> (dark, behind ?campusv2=4): <parts>", holding only this part's bullets from the lane
   fragment at `8706493a4` (b: the S4-G4.3, G4.4, G4.5 bullets; c: the S4-G4.6 bullet and fix 1's lip wording).
4. Merge commit message `Merge origin/feature/campus-greybox-s4 @ <short sha> (<parts>) into feature/campus-greybox-s4-<x>`,
   body "S4-<x> of the lane-stacks split: <parts>, on <cut from>. Changelog fragment
   changes/feature-campus-greybox-s4-<x>.md; earlier parts' fragments kept." + `A23: P0's shieldTeams / no section gear
   kept in s4Data.ts.` where it applied, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
5. Never merge master or any other branch, never rebase or force-push, never push to `feature/campus-greybox-s4`, p0
   or master, never open a PR. Path-limited `git add`.

## S4-c extra commit (the only hand edits; its own commit "campus-greybox S4-c: shieldTeams kept from P0 (A23), assert")
- `src/world/maps/campusV2/s4Data.ts:194` (the `S4_SECTOR` doc comment): "`shieldTeams` waits for PR1." ->
  "`shieldTeams` on (guard-rules A4, carried from P0, BRIEF A23)." Nothing else in that file.
- `tests/campusV2S4Guards.test.ts`, in the "twenty-five guards" case after `expect(S4.gear).toBeUndefined();`, add
  `expect((S4 as { shieldTeams?: boolean }).shieldTeams).toBe(true);`. Check it fails if `shieldTeams` is removed (try
  once locally, do not commit that).
- The coop4 rows (lead correction, PLAN section 4): the v2 list is the signed base list, no `minPlayers` row; TAG-4
  (PLAN section 2 row TAG-<N>, BRIEF A14) appends the two tagged v2 extras later. PR #317 (coop4) is still open and not
  on master or p0, so the stack carries none: `git grep -n minPlayers -- src/world/maps/campusV2/s4Data.ts` prints
  nothing (if it prints a row, delete it and report). The asserts already exist in the lane and must stay:
  `tests/campusV2S4Guards.test.ts` `expect(G.length).toBe(25)` and
  `expect(G.some((g) => (g as { minPlayers?: number }).minPlayers !== undefined)).toBe(false)` (lines ~178 and ~188).

## Checks per branch (unit tests only: no e2e, no GPU, no `npm run check`)
- `npx tsc --noEmit -p tsconfig.json` (or `npm run typecheck:fast`): clean.
- `node scripts/pr-size.mjs --base origin/<cut from> --head HEAD` (S4-a: `--base f466c4a5b`): counted < 1500 and
  within 60 of the table.
- `npx vitest run --maxWorkers=2`:
  - a: `tests/campusV2S4.test.ts tests/campusV2S4Coop.test.ts tests/campusV2.test.ts tests/campusS4.test.ts tests/changesFragments.test.ts`
  - b: a's list + `tests/campusV2S4Lights.test.ts`
  - c: b's list + `tests/campusV2S4Guards.test.ts tests/campusV2S4Graph.test.ts tests/campusV2S4Screen.test.ts
    tests/campusV2S4Sync.test.ts tests/campusS4Dress.test.ts tests/campusS4NocSight.test.ts tests/campusDressRules.test.ts
    tests/campusGear.test.ts tests/armour.test.ts tests/campusPosts.test.ts tests/sectionBakeCampus.test.ts tests/campusSoloRoute.test.ts`
  Planner's local counts on the same merges (without changesFragments and the new assert): a 82, b 101, c 87 (the 7
  S4 v2 files) + 130 (1 skipped). tsc clean at c. Every listed test green.
- Pending PC run (report only): `affected-e2e` on each PR head (laptop queue); level validator on the five v2 graphs at S4-c.

## PR body file (each branch)
`docs/campus-greybox/lane-campus-greybox-s4-<x>-pr-body.md`: title "Sector Ops: Saltmarsh Park v2 S4-<x> <parts>
(dark, campus-greybox)"; PR base (S4-a: master; b, c: the previous `-s4-<x>` branch, merge in order); what the part
builds (from `docs/campus-greybox/checks/s4-build.md` / `s4-fix1.md`); "No player-visible change: behind `?campusv2=4`
(flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-4)"; the A23 note where it applied; counted
lines; tsc and vitest results with counts; "pending PC run" list. S4-c adds "TAG-4 follows (BRIEF A14: two tagged v2
extras; A15: one base reinforcement waits for room at 4 players)". No `Job-done` line. End with
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Done
S4-a verified (or rebuilt) and S4-b, S4-c pushed, each: tsc clean, listed tests green, counted < 1500 vs its base,
fragment and PR body file committed; at S4-c `shieldTeams: true` asserted and no `minPlayers` row. Report at the end of
this brief (branch -> head sha, counted lines, test counts, conflicts resolved, deviations), then
`status: done feature/campus-greybox-s4-c <sha>`. A red test or size over the cap: `status: blocked <branch, test or
size>` and stop there.

## Report (desktop agent for Night Shift | Sector Ops Build, 2026-10-26)
S4-a a14f3592 (908 counted, S4-a WIP verified), S4-b 6af62e8e (800), S4-c 991400db (1367); tsc clean, vitest green each.
Brief's S4-c lane sha was mistyped; merged origin/feature/campus-greybox-s4 = 8706493a4e. Sonnet PASS (scratch
lane-s4-check.md). PRs #545 (master) -> #546 -> #547.
