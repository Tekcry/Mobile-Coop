# anim-joints J2 - fix round (J2-CHECK fix 1)

2026-10-21. Implementer. Working tree on `feature/anim-joints` (on f5006a92, T2 merged). Not committed.

## What changed

The tuner panel's pad controls used the deepest picker level (`sec.levels.length - 1`). Since J2 the group ids nest
to different depths per section, so on a body-state row that level is empty. They now use the current group's own
level: `groupPath(sec.group, sec.prefix).length - 1`, capped at the level count.

`src/ui/animTunePanel.ts` (T2 line numbers after the edit):

| Line | Place | Before | After |
| --- | --- | --- | --- |
| 126-131 | new module function `ownLevel(sec)` | - | `Math.max(0, Math.min(groupPath(sec.group, sec.prefix).length, sec.levels.length) - 1)` |
| 1525 | `fillLevels`: the changed dot | `const last = sec.levels.length - 1;` | `const last = ownLevel(sec);` |
| 2593 | `backStep` (B from a slider) | `` `lv:${sid}:${sec.levels.length - 1}` `` | `` `lv:${sid}:${ownLevel(sec)}` `` |
| 2597 | `padGroup` doc comment | "at its last level" | "at its group's own level" |
| 2602 | `padGroup` (LT / RT) | `const k = sec.levels.length - 1;` | `const k = ownLevel(sec);` |

Everything else in T2 is unchanged (hidden pickers with no choice stay hidden). The own level always has at least
the group's own segment, so B never lands on a hidden picker.

Result per row (from the test):
- A body-state row (`joint.idle`, `hand.rifle.idle`, `weapon.rifle.idle`, `ik.idle`): LT / RT steps through the states.
- A `trav.<kind>` row: LT / RT steps through the trav kinds.
- A team row (`*.team.boost.a`): LT / RT steps between A and B.

B returns to that same level, and the dot marks options at that level.

`CHANGELOG.md` not touched: there is no "Unreleased - anim-joints" section on this tree.

## Test

`tests/tunerLayout.test.ts`, new block "LT / RT, B and the changed dot use the group own level (anim-joints J2 fix)".
The block has 4 cases: Joints, Hands & feet, Weapon and IK strength. Each case does this:
- Asserts that the deepest picker is empty for the body row. This was the bug.
- Steps the body row at its own level. It checks that there are more than 20 states, including `walk`, that the step
  lands on another state at the same depth, and that a step back returns to the row.
- Steps the team row. It checks that the options are exactly `['a', 'b']` and that A <-> B round-trips.
- Steps a trav row. It checks that the options include `vault` and `mantle` and that the step stays on `.trav.`.

The panel class is DOM / Babylon-bound and not importable in the node test env. The test therefore mirrors
`ownLevel` with the same formula over the pure `tunerLayout` helpers (`sharedPrefix`, `levelCount`, `groupPath`,
`levelOptions`, `groupForPath`). The panel builds its levels and prefix from those same helpers.

## Results

| Time | Command | Result |
| --- | --- | --- |
| 19:56 | `npx vitest run tests/tunerLayout.test.ts` | 22 passed (1.5 s) |
| 19:57 | `npx eslint` on the two touched files, `npx tsc --noEmit -p .` | clean, exit 0 |
| 19:57-20:10 | waited on `heavy.lock` (anim-skeleton S2) | - |
| 20:10 | lock taken ("CT Core Build \| anim-joints J2 fix"), port 4191 freed | - |
| 20:10-20:12 | `npm run check` | exit 0 (1 m 45 s): lint 0 errors / 41 warnings (unchanged); Vitest 221 files, 2438 passed, 5 skipped; build ok |
| 20:12-20:25 | `E2E_PORT=4191 E2E_JOBS=1 node scripts/run-e2e.mjs e2e-studio e2e-anim e2e-menus` | e2e-studio ok 89 s, e2e-anim ok 31 s, e2e-menus killed at the 600 s suite limit (614 s) |
| 20:25-20:35 | `e2e-menus` alone | killed at the limit again (610 s) |
| 20:36-20:47 | baseline: `HEAD`'s `animTunePanel.ts` put back temporarily, `vite build`, `e2e-menus` alone | killed at the same point (613 s); the fix was then restored (diff checked) |
| 20:47 | `npm run build` (dist back to the fixed tree), port freed, lock removed | build ok |

## e2e-menus: a stall that predates this fix

In all three runs, every tuner pad check passes:
- `RT switches the state (walk -> jog)`
- `B from a slider goes back to the state picker (lv:body:0)`
- the run through `Menu closes it and the game runs`

Each run then stalls at the next step, until the runner kills it. That step is the `(tuner-camera)` block in
`scripts/e2e-menus.mjs`: `frames(P, 30)`, a requestAnimationFrame wait, then the `camBoomAdd` slider.

The stall reproduces at `HEAD` without this fix, so the fix does not cause it. Before this branch the suite passed in
187 s (`docs/ct-prototype/T2-E2E.md`). The stall arrived with the T2 merge (f5006a92) or with J2, and it was not
bisected further. The J2 checker did not run e2e-menus. This needs an owner before the merge: a full `npm run e2e`
will fail on it.
