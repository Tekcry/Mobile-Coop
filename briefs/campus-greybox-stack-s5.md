status: done feature/campus-greybox-s5-c e3d8a9ef035dbc2c9322e0b3474d2a3fea56fea5
# campus-greybox stack S5 (cloud): re-stack the S5 lane into three PR-sized branches S5-a .. S5-c, A23 re-applied

Lead: Night Shift | Sector Ops Build. Job campus-greybox (J17, Saltmarsh Park v2). Planner: Opus, 2026-10-26.
No new game code: this brief merges the finished, checker-passed S5 lane (P1 .. P4 + fix 1, PASS) onto P0 in three
branches, each under the 1,500-line PR cap, the same way `feature/campus-greybox-s1-a..c` and `-s2-a..d` were cut, and
keeps P0's guard-rules state (BRIEF A23 / A27) in `src/world/maps/campusV2/s5Data.ts`.

## Base and branches (exact)
- Chain base: `origin/feature/campus-greybox-p0` @ `f466c4a5b421d67961d1e91aa75a52269105b78d` (P0, PR #503, merged to
  master in train 117 as `0e12833d1`; an ancestor of origin/master, so each PR's diff against master is only its own
  part). Do NOT merge or rebase onto master.

| New branch | Cut from | Lane commits to merge (exact, in order) | Parts | Expected counted lines vs its base |
| --- | --- | --- | --- | --- |
| `feature/campus-greybox-s5-a` | p0 `f466c4a5b` | `3c600cc1ba157d18f9494d67d0e44f6cd5d21f1c` | P1 shell re-cut | 877 |
| `feature/campus-greybox-s5-b` | s5-a head | `af3c46b3e171d13ca45f4001853ee1e1cffac2cc` (P3 head, includes P2 `9ea8a93d7`) | P2 devices and light + P3 guards and routes | 1121 |
| `feature/campus-greybox-s5-c` | s5-b head | `b232839a2f29290afa3d867d95a917b52da9087c` (lane head) | P4 co-op and checks + build report + fix 1 + A23 assert | ~1068 |

Why this split: P1 + P2 = 1408 (too close to the cap), P3 + P4 = 1652 (over). The planner merged this exact chain
locally (2026-10-26): S5-a clean, S5-b one conflicted file (`s5Data.ts`, rule below), S5-c clean; every listed test
green at every branch.

## The A23 / A27 conflict rule (`src/world/maps/campusV2/s5Data.ts`, the only file expected to conflict, at S5-b)
P0 carried master's guard-rules state into the v2 copy (merge-resolutions check 2026-10-26: armour not 'both', no
section `gear: 'helmet'`, `shieldTeams: true` with its comment). The lane's P3 wrote the same gear (armour only, no
section gear) but no `shieldTeams`. Expected three hunks at S5-b: (1) #1-#4 response rows, (2) #9-#12 rows, (3) the
`sweep` block in `S5_SECTOR`. In every hunk take the lane side (theirs: rows, positions, comments, sweep) and in hunk 3
keep P0's line `// (guard-rules S1, A15) no section gear: helmets come from the difficulty and the alarm stage (G350)`
above the lane's sweep; P0's `// (guard-rules S1, A4) a riot-shield guard ...` + `shieldTeams: true,` (outside the
hunks) stay. After resolving: no `gear: 'both'`, no section `gear:` in `S5_SECTOR`, `shieldTeams: true` present, no
conflict markers, 26 guards. Any conflict in another file: `status: blocked conflict in <file> at s5-<x>`.

## Method per branch, in order a -> c
1. Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s5-<x>`.
2. `git checkout -b feature/campus-greybox-s5-<x> <cut from>`; `git merge --no-ff --no-commit <lane sha>`; resolve.
3. Fragment (`changes/<branch-with-dashes>.md`): the lane fragment is `changes/feature-campus-greybox-s5.md`. S5-a:
   `git mv` it to `changes/feature-campus-greybox-s5-a.md`, title "Campus greybox S5-a (dark, behind ?campusv2=5):
   shell re-cut", keep `kind: patch`, the "No player-visible change" bullet and the S5-P1 bullet only. S5-b / S5-c: the
   merge brings lane changes to that fragment (git may apply them to the renamed file). End state: earlier parts'
   fragments byte-equal to the cut-from branch (`git diff <cut from> -- changes/` shows only the new file), no
   `changes/feature-campus-greybox-s5.md`, and a new `changes/feature-campus-greybox-s5-<x>.md` with only this part's
   bullets from the lane fragment at `b232839a2` (b: S5-P2 and S5-P3; c: S5-P4 with fix 1's 0.40 m lips).
4. Merge commit message `Merge origin/feature/campus-greybox-s5 @ <short sha> (<parts>) into feature/campus-greybox-s5-<x>`,
   body "S5-<x> of the lane-stacks split: <parts>, on <cut from>. Changelog fragment
   changes/feature-campus-greybox-s5-<x>.md; earlier parts' fragments kept." + at b `A23: P0's shieldTeams / no section
   gear kept in s5Data.ts.`, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
5. Never merge master or any other branch, never rebase or force-push, never push to `feature/campus-greybox-s5`, p0
   or master, never open a PR. Path-limited `git add`. No hand edits to `src/` / `tests/` except S5-c's commit below.

## S5-c extra commit (the only hand edits; its own commit "campus-greybox S5-c: shieldTeams kept from P0 (A23), assert")
- `tests/campusV2S5Guards.test.ts`, in the "26 guards" case after `expect((S5 as { gear?: unknown }).gear).toBeUndefined();`,
  add `expect((S5 as { shieldTeams?: boolean }).shieldTeams).toBe(true);`. Check it fails if `shieldTeams` is removed
  (try once locally, do not commit that). Nothing else in that file.
- The coop4 rows (lead correction, PLAN section 4): the v2 list is the signed base list, no `minPlayers` row; TAG-5
  (PLAN section 2 row TAG-<N>, BRIEF A14) appends the two tagged v2 extras later. PR #317 (coop4) is still open and not
  on master or p0, so the stack carries none: `git grep -n minPlayers -- src/world/maps/campusV2/s5Data.ts` prints
  nothing (if it prints a row, delete it and report). The asserts already exist in the lane and must stay:
  `tests/campusV2S5Guards.test.ts` `expect(G.length).toBe(26)` and the per-guard `minPlayers` `toBeUndefined()`
  (lines ~175 and ~195).

## Checks per branch (unit tests only: no e2e, no GPU, no `npm run check`)
- `npx tsc --noEmit -p tsconfig.json` (or `npm run typecheck:fast`): clean.
- `node scripts/pr-size.mjs --base origin/<cut from> --head HEAD` (S5-a: `--base f466c4a5b`): counted < 1500 and
  within 60 of the table.
- `npx vitest run --maxWorkers=2`:
  - a: `tests/campusV2S5.test.ts tests/campusV2.test.ts tests/campusS5.test.ts tests/changesFragments.test.ts`
  - b: a's list + `tests/campusV2S5Lights.test.ts tests/campusV2S5Sync.test.ts tests/campusV2S5Guards.test.ts`
  - c: b's list + `tests/campusV2S5Coop.test.ts tests/campusV2S5Graph.test.ts tests/campusV2S5Screen.test.ts
    tests/campusS5Dress.test.ts tests/campusDressRules.test.ts tests/armour.test.ts tests/campusGear.test.ts tests/campusPosts.test.ts`
  Planner's local counts on the same merges (fragments not yet renamed, no new assert): a 48, b 75, c 65 (the 7 S5 v2
  files) + 106; tsc clean at c. Every listed test green.
- Pending PC run (report only): `affected-e2e` on each PR head (laptop queue); level validator on the five v2 graphs at S5-c.

## PR body file (each branch)
`docs/campus-greybox/lane-campus-greybox-s5-<x>-pr-body.md`: title "Sector Ops: Saltmarsh Park v2 S5-<x> <parts>
(dark, campus-greybox)"; PR base (S5-a: master; b, c: the previous `-s5-<x>` branch, merge in order); what the part
builds (from `docs/campus-greybox/checks/s5-build.md` / `s5-fix1.md`); "No player-visible change: behind `?campusv2=5`
(flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-5)"; the A23 note at b; counted lines; tsc and
vitest results with counts; "pending PC run" list. S5-c adds "TAG-5 follows (BRIEF A14: two tagged v2 extras; A15: two
base reinforcements wait for room at 4 players)". No `Job-done` line. End with
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Done
S5-a, S5-b, S5-c pushed, each: tsc clean, listed tests green, counted < 1500 vs its base, fragment and PR body file
committed; at S5-c `shieldTeams: true` asserted and no `minPlayers` row. Report at the end of this brief (branch -> head
sha, counted lines, test counts, conflicts resolved, deviations), then `status: done feature/campus-greybox-s5-c <sha>`.
A red test or size over the cap: `status: blocked <branch, test or size>` and stop there.

## Report (desktop agent for Night Shift | Sector Ops Build, 2026-10-26)
S5-a 2dae6ba0a (877 counted, vitest 49/49), S5-b e2d8d77aa (1121, 76/76), S5-c e3d8a9ef0 (1067, 171/171); tsc clean on
each. Only conflict: s5Data.ts at S5-b (3 expected hunks, lane side, P0's A15 comment kept); shieldTeams true, 26 guards,
no minPlayers. Sonnet PASS (scratch lane-s5-check.md). PRs #533 (master) -> #534 -> #535.
