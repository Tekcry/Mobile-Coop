# anim-joints J2 - checker report (move and action rows, COVERAGE gap 2)

Fresh checker, 2026-10-21. The change reviewed: the uncommitted working tree on `feature/anim-joints` on top of 001fb7d0.
The `visionIsolation` snapshot was ignored (line endings only).

## Verdict: FAIL (one fix, small, in track A's file)

The engine side of J2 is correct and well tested. The rows, the pick, the A5 composition, the bake, the partner's
team role and the outside-area lines are all right. `npm run check` and all three suites pass. The deeper group ids do
break one existing pad control in the tuner panel: LT / RT ("LT / RT state", `docs/systems/ui.md` line 266) and B
"back to the state picker" no longer work in Hands & feet, Gun in hand and Limb reach. The fix is a few lines in
`src/ui/animTunePanel.ts`, which is track A's file, so the orchestrator has to route it or approve it.

## Fix list (ranked by impact)

1. **Tuner pad: LT / RT, B and the changed dot use the deepest picker, which is now empty for every body state row.**
   - Where: `src/ui/animTunePanel.ts` line 1941 (`padGroup`: `const k = sec.levels.length - 1`), line 1932
     (`backStep`: `lv:${sid}:${sec.levels.length - 1}`) and lines 1342 / 1358 (`fillLevels`: the changed dot only on
     `k === last`).
   - Evidence: the panel's own pure functions, run on the registered sections (esbuild bundle of `tunerLayout.ts` +
     `tuneV2Sections.ts`):

     | Section | Levels | Group | Options at the last level |
     | --- | --- | --- | --- |
     | Joints | 3 | `joint.idle` | none |
     | Hands & feet | 4 | `hand.rifle.idle` | none |
     | Gun in hand | 4 | `weapon.rifle.idle` | none |
     | Limb reach | 3 | `ik.idle` | none |

     The group's own state level has 37 options in each case.

     `padGroup` returns when there are fewer than 2 options, so LT / RT does nothing on any body state row in these
     sections. `backStep` (B from a slider) lands on a disabled empty picker. The "changed" dot never shows on the state
     list. Before J2, Hands & feet / Gun in hand had 2 levels and Limb reach had 1, so all of this worked. Joints was
     already affected since T1a (`joint.rifle.aim` made it 2 levels deep); the same fix covers it.

     Also, `carryBody` -> `showLast('hand', state)` from a team row resolves `hand.rifle.team.boost.walk` to
     `...team.boost.a`, so it does not carry. That is minor and goes away once follow is on.
   - The cause is J2's group ids (`hand.<w>.team.<move>.<a|b>`, as PLAN asks), but the right fix is in the panel. The
     tests did not catch it: `tests/tunerLayout.test.ts` only checks `levelCount`, and its update to 4 / 3 is correct
     for what it asserts.
   - Done looks like:
     - In `padGroup`, `backStep` and the `fillLevels` dot, "the last level" is the group's own depth:
       `groupPath(sec.group, sec.prefix).length - 1` (capped at `sec.levels.length - 1`), not `sec.levels.length - 1`.
     - LT / RT steps through the states on `hand.rifle.idle`, `ik.idle` and `joint.idle`, and through A / B on
       `hand.rifle.team.boost.a`.
     - A unit test in `tests/tunerLayout.test.ts`, or a pure helper there, pins "the last level with choices" for a
       body row and a team row.
     - Owner: track A, or a one-function edit the orchestrator approves for J2.

## Verified (with evidence)

1. **Checks.** `npm run check` exit 0: lint 0 errors / 41 warnings (the same 41 as before, none in the touched files);
   Vitest 220 files, 2414 passed, 5 skipped; build ok. `e2e-studio` and `e2e-anim` passed in one call, then
   `e2e-netmove` passed alone (times below). `tsc --noEmit` is clean. A targeted ESLint run on the touched files is clean.

2. **Rows.**
   - `TUNE_ROW_IDS` is the 27 body states (same order; a test keeps it equal to `BODY_GROUPS`), then `trav.<kind>` (12:
     `TRAV_KINDS` + `brace`, tested equal), then `team.<move>.<a|b>` (12, tested equal to `TEAM_MOVES`), then the 8
     action rows. The index has a null prototype.
   - `JOINT_ROWS` is the body states, then the 10 per-gun rows (indices unchanged), then the move / action rows
     appended. Every old group id is unchanged and in place (asserted).
   - The tables, saves and exports are keyed by row name / joint name / param id only (`GROUP_INDEX` = `TUNE_ROW_INDEX`;
     `handsLoad` / `handsBaseLoad` / `jointsLoad` look up by name). Track C adding joints or params needs no change here.
   - The J1 literal version 1 and version 2 exports still bake (`tests/animJointsBase.test.ts` passes). The new literal
     export (`joint.trav.vault`, `hand.rifle.reload`, `ik.air`, `joint.team.boost.b`, `weapon.pistol.throw`) bakes to
     the expected `animBase.ts` text and loads back with nothing unknown.
   - No store shape change.

3. **The pick.**
   - `AnimGraph.rowW` is written by `writeRowW` at the end of `update`. It is placed after `handClipW`, and there is no
     early return before it in `update`. Nothing in the graph reads it back; `meleeHandW` / `smoothstep` / `clamp` are
     pure.
   - Animation is unchanged for every rig, guards included. Guards pay about 10 assignments a frame and never call the
     pick (no `tuneRows` flag).
   - Swap (`swapW`) and throw (`handClipW`, from `pose.grenade`) are separate inputs and are tested apart.
   - At most 3 rows, sorted by weight with ties kept in order. The result is preallocated (`TuneRigState.pick`, `jRows`)
     and filled in place. The 1000-pick test reuses its arrays and strings.
   - No closures, iterators or temporaries in `pickTuneRows`, `jointsBeginRigRows`, `handsBeginRigRows`, `ikEase`,
     `tuneV2Frame` or `syncBackground`. The scratch is module level (`MR` / `MW`, `NO_ROWS`) and rebuilt on each call.
     No `Math.hypot`.

4. **Composition (A5).**
   - Joints: `nlerp(I, q, w)`, with the sign flipped for the shortest arc, then a Hamilton product onto the stance.
     w >= 1 is exact. Rows with no offset on a joint are skipped.
   - Hands: offsets add `w x v`. Every additive param's default is 0 (checked in `PARAMS`).
   - Gun scale and IK strength use `x (1 + (v - 1) w)`. The trigger takes the strongest row's value when w >= 0.5 and
     the value is not auto.
   - Unit tests cover identity at w 0, the row exactly at w 1 over no stance, the stance exactly with w 0, two rows at
     once, and the ease.
   - The real-rig tests cover these:
     - With nothing live, a flagged rig is bit-identical to an unflagged one through a vault and a reload.
     - A vault row applies, and the rig is bit-identical after the vault.
     - A reload row applies while reloading and not after.
     - The hit row works.
   - No leak between rigs: the windows are closed in `tuneRigEnd` (J1) and the module scratch is refilled on each call.
     J1's interleaved-rig test still passes.

5. **Outside-area edits.**
   - `src/net/remoteAvatar.ts`: one import and one pose field (`tuneTeam: mv ? teamRowOfWire(mv.m, mv.sub) : ''`;
     the strings are constants, nothing is allocated).
   - `src/game/studioStage.ts`: one line (`p.tuneTeam = r.group`; `r.group` is `team.<move>.<a|b>` from
     `teamRoleGroup`).
   - `git diff --stat` on `src/net/protocol.ts`, `src/ui/*`, `src/anim/studio.ts`, `src/anim/tuneKeys*`,
     `src/anim/tuneRows.ts`, `src/anim/moveTune.ts`, `scripts/anim-keys/*` and `src/operators/*` is empty.
     `PROTOCOL_VERSION` is still 25, so nothing on the wire changed.
   - `teamRowOfWire` was checked against `TeamController.mode` / `wireSub` / `attachBits`:
     - `brace` = role B and `boost` = role A.
     - The sub bits pick the move: rope 4, hang 2, throw 1, else the boost.
     - A ledge hang with the relay bit (1024) is the relay's role B.
     - The relay climber (`relayUp`) is wire mode `boost` with sub 0, so on the partner it reads as `team.boost.a`.
     - The revive has no wire state.

     Both limits are confirmed. They are non-blocking: they only matter when a relay-A or revive row is tuned, and they
     only change how the partner looks on the other machine; fixing them needs a wire bit and a protocol bump.

6. **The panel.**
   - The new groups are reachable through the registry with no UI change. The pickers split on the dots (`trav` >
     `vault`, `team` > `boost` > `b`, `reload`), and the test asserts `groupForPath` for each.
   - The `tests/tunerLayout.test.ts` update (Hands 4 levels, Joints 3) is legitimate: it states the new depth, it is not
     a hidden regression. The panel's pad navigation does regress (fix 1).
   - `tests/tuneV2Sections.test.ts` (group counts) is updated correctly.

7. **The background sync.** Per frame it copies 3 Joints rows, 12 Hands & feet + Weapon rows and 3 IK rows, plus up to
   3 active move rows. That is about 1000 keyed property reads a frame, with setters only on a real difference and no
   allocation. Every row is refreshed within about 0.4 s (69/3, 295/12 and 59/3 frames). The cost is negligible.

8. **The e2e checks are real.**
   - `e2e-studio`: the team row is checked with the studio paused (dt 0 = at once), comparing the same pose with and
     without the row: 40.0 deg. The vault check steps inside one evaluate until 8 frames are on the row, then pauses
     and compares with the row and after a reset. The "after" check needs 60 frames off the row, `live` 0 and `w === 1`
     exactly.
   - `e2e-anim`: needs more than 60 frames on the reload row and more than 30 deg, then exactly 0 deg 1.5 s after.
   - `e2e-netmove`: waits on the copy's offset quaternion reaching cos 20 deg and on `live` going 0 -> 1.
   - None of these uses a fixed wait as the pass condition. Each would fail if the pick or the composition broke.

9. **Docs.**
   - `CHANGELOG.md` has a bullet under "Unreleased - anim-joints".
   - `TESTING.md` has two checklist items.
   - `BAKE.md`'s group -> base key mapping matches the test's expected text (`weapon.pistol.throw` ->
     `hands.pistol.throw`).
   - `ui.md` describes the rows, the weights, the composition, the follow and the partner's limits accurately.

## Polish list (non-blocking)

- `e2e-netmove`'s angle assertion (47.1 deg) compares a moving partner, not a paused one. The real check is the
  `until` on the offset quaternion plus `live` 0 -> 1. The angle line could compare the offset only.
- The curl params compose additively (stance + w x move), so the result can go past -1..1. The downstream clamp, if
  any, decides; this is cosmetic.
- The trigger switches at w 0.5 by design (A5); other modes would flicker only with two rows that disagree.
- `HIT_ROW_K` assumes a full hit's kick of 4.5; a lighter hit gives a lighter row weight (fine), a heavier one clamps
  at 1.
- `carryBody` / `showLast` from a team row does not carry a body state (see fix 1). Follow on hides it.
- The report's open items stand: action weights are one frame late, and `trav.split` / `trav.rappel` stay on for the
  whole attach.

## Commands run

| Time | Command | Result |
| --- | --- | --- |
| 18:22 | `npx vitest run` on `animMoveRows`, `animJointsBase`, `tuneV2Sections`, `tunerLayout` and `animTuneBake` tests | 5 files, 69 passed (4.4 s) |
| 18:23 | `npx tsc --noEmit -p .` | exit 0 |
| 18:24 | `npx eslint` on the touched src / tests | 0 errors |
| 18:25 | esbuild bundle of `tunerLayout.ts` + `tuneV2Sections.ts` (scratchpad), the picker simulation | the table in fix 1 |
| 18:17-19:29 | waited on `C:/NightShift/heavy.lock` (another job's full e2e) | - |
| 19:29 | lock taken ("CT Core Build \| anim-joints J2 check \| 19:29"), port 4191 freed | - |
| 19:29-19:31 | `npm run check` | exit 0: lint 0 errors / 41 warnings; Vitest 220 files, 2414 passed, 5 skipped; build ok |
| 19:31-19:33 | `E2E_PORT=4191 E2E_JOBS=1 node scripts/run-e2e.mjs e2e-studio e2e-anim` | all passed: e2e-studio 102 s, e2e-anim 34 s |
| 19:34-19:39 | `E2E_PORT=4191 E2E_JOBS=1 node scripts/run-e2e.mjs e2e-netmove` | passed, 310 s (partner team row 47.1 deg) |
| 19:39 | port 4191 freed, lock removed | - |

No reruns were needed and there were no failures. No GPU checks apply.
