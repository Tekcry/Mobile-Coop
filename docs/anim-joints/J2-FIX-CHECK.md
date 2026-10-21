# anim-joints J2 - fix round checker report

Fresh checker, 2026-10-21. Reviewed: `feature/anim-joints` at 4a6bdc9a. Scope: the fix commit 6f65d2f8 (J2-CHECK fix 1),
and the master merges f5006a92 (4.39.0, T2) and 3d201f2f (4.41.0: #87 key timing, #89 tuner on phones).

## Verdict: PASS

No fix items.

## Verified

1. **The fix closes J2-CHECK fix 1, and it is minimal.**
   - `ownLevel(sec)` is in `src/ui/animTunePanel.ts` lines 136-140:
     `max(0, min(groupPath(sec.group, sec.prefix).length, sec.levels.length) - 1)`. This is the formula J2-CHECK asked for.
   - It replaces `sec.levels.length - 1` in exactly 3 places:
     - the `fillLevels` changed dot (line 1673)
     - `backStep` (line 2818)
     - `padGroup` (line 2827)

     No other `levels.length - 1` is left. Line 1376 is list navigation and is unrelated.
   - `git diff 59586af2 HEAD -- src/ui/animTunePanel.ts` (master tip vs branch) is the fix and nothing else: +6 / -1 x3
     plus one comment line.
   - The test in `tests/tunerLayout.test.ts` (4 cases: joint, hand, weapon, ik) checks these, with the panel's own pure
     helpers on the registered sections:
     - The deepest picker is empty for a body row. This is the bug.
     - LT / RT on a body row steps the states: more than 20 states, `walk` among them, the same depth, and a round trip.
     - A team row has exactly `['a', 'b']`, and A / B round-trips.
     - A trav row steps the trav kinds (`vault` and `mantle`) and stays on `.trav.`.
   - B lands on the own level, which always has the group's own segment, so it never lands on a hidden picker. The dot
     uses the same level, so it marks the row's own picker.

2. **The merges.**
   - f5006a92 conflicted in `docs/systems/ui.md` only. J2's bullet is kept, and master's renamed "(tuner-ui, the layout
     before T2 ...)" lead line replaces the old one. The resolution is correct.
   - 3d201f2f conflicted in `CHANGELOG.md` only: "Unreleased - anim-joints J2" sits above 4.41.0, with a blank line
     between them. The resolution is correct.
   - `git diff 59586af2 HEAD -- CHANGELOG.md` is the Unreleased section alone. The released sections equal master's.
   - #89 left the fix intact. `src/ui/tunerPhone.ts` has no level or pad-step logic, and #89's panel changes do not
     touch `fillLevels` / `backStep` / `padGroup`.
   - Track A's key timing is unchanged:
     - `src/anim/tuneBake.ts`, `tuneKeys*.ts`, `scripts/anim-keys/*` and `src/ui/tunerPhone.ts` are byte-identical to
       master.
     - The keys-only `time` rule is at lines 66 / 73.
     - The `keyMetaText` write is at lines 748-761.
     - The J1 base-table routing (`isBase`, `BAKE_BASE_SECTIONS`) is at line 595, and J2's rows go through it, as
       `tests/animMoveRows.test.ts` passing shows.
   - The other J2-side source files are the same as reviewed in J2-CHECK: `player.ts`, `studioStage.ts`,
     `characterRig.ts` and the `e2e-studio.mjs` steps.

## Polish (optional, non-blocking)

1. The test copies the `ownLevel` formula instead of importing it, because the panel class is DOM-bound. Moving
   `ownLevel` into `src/ui/tunerLayout.ts` as a pure export, which the panel then calls, would pin the real code.
2. On a body row, the state level also lists the branch segments `trav` and `team` (and the action rows). LT / RT past
   the last state steps into `trav.<first kind>`. From there LT / RT cycles only the trav kinds, so getting back to the
   states needs the picker or B. This is expected for the nested ids, but it may surprise Michael on a pad.
3. `npm run check` rewrites `tests/__snapshots__/visionIsolation.test.ts.snap` with LF line endings. The content is
   unchanged (`--ignore-cr-at-eol` diff is empty), as in J2-CHECK. It is left modified in the working tree, not reverted
   (this check was read-only).

## Commands

| Time | Command | Result |
| --- | --- | --- |
| 21:48 | `npx vitest run tests/tunerLayout.test.ts tests/animMoveRows.test.ts tests/tuneKeysTime.test.ts` | 54 passed (7 s) |
| 21:48-21:59 | waited on `heavy.lock` (anim-skeleton #88 fix) | - |
| 21:59 | lock taken ("CT Core Build \| anim-joints J2 fix check"), port 4191 freed | - |
| 22:00-22:01 | `npm run check` | exit 0 (1 m 46 s): lint 0 errors / 41 warnings (unchanged); Vitest 223 files, 2473 passed, 5 skipped; build ok |
| 22:02-22:04 | `E2E_PORT=4191 E2E_JOBS=1 node scripts/run-e2e.mjs e2e-studio e2e-anim` | all passed: e2e-studio ok 95 s (J2 team.boost.b and trav.vault steps, #87 retime steps), e2e-anim ok 29 s; no console errors |
| 22:04 | port 4191 freed, lock removed | - |

e2e-menus was not run on this desktop: it hits the known Havok stall (`J2-STALL.md`). It runs on the laptop with the J2
PR's full e2e.
