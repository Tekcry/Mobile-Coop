# anim-joints J2 - implementer report (move and action rows, COVERAGE gap 2)

## Built
- `src/anim/tuneMoveRows.ts` (new, pure, no runtime imports: type-only imports of `tune.ts` / `moveTune.ts`, so no
  import cycle with the registry modules; a test keeps its lists equal to `BODY_GROUPS`, `TRAV_KINDS`, `TEAM_MOVES`):
  `TUNE_ROW_IDS`, `TUNE_ROW_INDEX` (null prototype), `TUNE_MOVE_ROW_IDS`, `pickTuneRows`, `tuneRowPick`,
  `tuneRowFollow`, `TuneActionWeights`, `teamRowOfWire` (the partner's role from the wire), `TEAM_WIRE_BITS`.
- The Joints, Hands & feet, IK strength and Weapon tables and their registry sections are keyed by `TUNE_ROW_IDS`; the
  rig composes up to 3 move / action rows over the stance row (A5); the local panel follows the strongest move row at
  weight 0.5 or more; `RigPose.tuneTeam` is set for the local player, the studio's pair puppets and the co-op partner.

## The rows (`TUNE_ROW_IDS`, 59)
1. The 27 body states (`BODY_GROUPS`, same order: every old index and group id unchanged).
2. Move rows: `trav.vault`, `trav.mantle`, `trav.step`, `trav.climbUp`, `trav.windowVault`, `trav.rappel`, `trav.drop`,
   `trav.hop`, `trav.roll`, `trav.wallKick`, `trav.split`, `trav.brace`; `team.<move>.a` / `.b` for boost, relay,
   throw, hang, rope, revive.
3. Action rows: `air`, `land`, `slide`, `melee`, `reload`, `swap`, `throw`, `hit`.

Joints: `JOINT_ROWS` = the body states, the 10 per-gun armed rows (unchanged, armed states only), then the 32 move /
action rows (69 rows). Hands & feet / Weapon: 5 weapons x 59 rows. IK: 59 rows. Group ids `joint.trav.vault`,
`joint.team.boost.b`, `joint.reload`, `hand.rifle.reload`, `hand.none.trav.vault`, `ik.air`, `weapon.pistol.throw`, ...
Old saves, presets and exports load as before (unknown-to-them groups start at identity; no store shape change).

## How the weights are picked (per rig, `pickTuneRows`, inside the rig's own `animate`)
- Stance row: the body state as J1 (`selectBodyGroup`), '' during a move with no body state (vault, boost assist).
- Traversal: weight 1 while `pose.traverse` is that kind (the kinds with a body state, ladder / pipe / ledge / hang /
  vent / crawl, have no move row). The rig's joint ease (`JOINT_EASE_TAU` 0.06 s) smooths the on / off.
- Team: weight 1 while `pose.tuneTeam` names a row.
- Actions, from the anim graph's own blends, exposed read-only as `AnimGraph.rowW` (written at the end of `update`
  by `writeRowW`; nothing in the graph reads it, animation unchanged): air = `weights.air` and slide =
  `weights.slide` (the lower-state fades); land = an envelope over the landing clip (`landT`: in over 0.1 s, out over
  the clip's last part, `LAND` / `LAND_DEEP` duration); melee = `meleeHandW(melee)` (the elbow arc's hand weight);
  reload = `reloadW`; swap = `swapW` (the swap overlay); throw = `handClipW` (the grenade hands, from `pose.grenade`, so
  a swap and a grenade throw are apart); hit = the flinch spring |x| scaled so a full hit's peak is 1.
  The rig picks before its graph updates, so the action weights are last frame's (one frame late).
- Without a graph (tests, tools): 1 while the pose field is on (`grounded` false, `landing` > 0.5, `slide` / `melee` /
  `reload` / `swap` / `grenade` >= 0).
- Weights below 0.001 are no row; at most 3 rows, strongest first, a tie in pick order (traversal, team, then the
  action order). The result is preallocated (`TuneRigState.pick`), filled in place.

## Composition (A5, in `jointsBeginRigRows` / `handsBeginRigRows`)
- Joints per joint: target = stance x nlerp(identity, move, w) for each live move row in turn (w >= 1: the row's
  quaternion as is). A stance of -1 is identity, so a vault's row applies over identity. Rows with no offset on the
  joint take no part. Then the rig's applied offset eases toward the target as in J1.
- Hands & feet / Weapon offsets: stance + w x move. Gun scale: stance x lerp(1, move, w). Trigger: the strongest move
  row's when w >= 0.5 and it is not 0 (auto), else the stance's. IK strength: stance x lerp(1, move, w).
- Base + delta per row as J1 (A1): the move rows' effective values are base composed with the tuner delta.
- Nothing live: the fast paths return before any work, the windows stay off, output bit-identical (unit test through
  a vault and a reload). Per-rig, preallocated; no allocation in the pick or the composition.
- Panel follow (`tuneV2Frame(body, weapon, pick)`, local player, `rig.tuneSt.pick` of last frame): the strongest move
  row while its weight >= 0.5, else the stance row (the gun's own Joints row in an armed state). The active move rows
  are copied registry -> table every frame. The background row sync covers every new row: 3 Joints rows, 12 Hands &
  feet + Weapon rows, 3 IK rows a frame (was 2 / 6 / 2), every row within about 0.4 s; a few hundred keyed reads a
  frame, setters only on a real difference, no allocation.

## Files
- New: `src/anim/tuneMoveRows.ts`, `tests/animMoveRows.test.ts`, this report.
- Changed: `src/anim/tuneJoints.ts` (`JOINT_ROWS` + move rows, `jointsBeginRigRows`), `src/anim/tuneHands.ts` (rows
  keyed by `TUNE_ROW_IDS`, `handsBeginRigRows`, IK composition), `src/anim/tuneJointsRig.ts` (the pick, `JOINT_OF_TUNE_ROW`,
  `TuneRigState.pick`), `src/anim/tuneV2Sections.ts` (group ids, follow, sync), `src/anim/animGraph.ts` (row plumbing:
  `rowW` + `writeRowW`, read only), `src/player/characterRig.ts` (`RigPose.tuneTeam`, one field), `src/player/player.ts`
  (`rp.tuneTeam`, the pick into `tuneV2Frame`), `tests/tuneV2Sections.test.ts` and `tests/tunerLayout.test.ts` (group and
  level counts), `scripts/e2e-studio.mjs`, `scripts/e2e-anim.mjs`, `scripts/e2e-netmove.mjs`, `docs/anim-tuner/BAKE.md`,
  `docs/systems/ui.md`, `CHANGELOG.md` ("Unreleased - anim-joints"), `TESTING.md`.
- Not touched: `src/anim/moveTune.ts` (read only), UI files, `tuneRows.ts`, clips, the bake code (move rows already
  baked through `rest.join('.')`).

## Outside-area lines (approved, minimal)
1. `src/net/remoteAvatar.ts`: `import { teamRowOfWire } from '../anim/tuneMoveRows';` and in the `rig.animate` pose
   `tuneTeam: mv ? teamRowOfWire(mv.m, mv.sub) : '',`. No wire change: `brace` = role B, `boost` = role A, the sub bits
   pick rope / hang / throw, else the leg-up; a ledge hang with `ATTACH_SUB.relay` = `team.relay.b`.
2. `src/game/studioStage.ts` `posePuppet`: `p.tuneTeam = r.group;`.

## Tests
- `tests/animMoveRows.test.ts` (16): the row list (body states first, lists equal moveTune, unique, null prototype);
  the four sections keyed by row id (new groups registered, old ids unchanged and in place); the panel's pickers reach
  `joint.team.boost.b`, `joint.trav.vault`, `joint.reload`, `hand.rifle.reload` (tunerLayout); the pick per move and
  action from literal poses (swap apart from a grenade throw); from graph weights (strongest first, at most 3, ties in
  order, the follow from 0.5, unused slots cleared); no allocation (1000 picks reuse the result, its arrays and id
  strings); the partner's team role from the wire (bits equal to `ROPE_SUB` / `HANG_SUB` / `THROW_SUB` /
  `ATTACH_SUB.relay`); Joints composition (identity at w 0, the row exactly at w 1 over no stance, the stance exactly
  with w 0, stance x nlerp x nlerp with two rows, the ease); Hands / Weapon / IK composition (offsets add, gun scale and
  IK lerp-multiply, the trigger from w 0.5, a row over no stance); the panel follow and `tuneV2JointRow`; a literal
  export with `joint.trav.vault`, `hand.rifle.reload`, `ik.air`, `joint.team.boost.b`, `weapon.pistol.throw` bakes to
  the expected base text and loads back with nothing unknown; the real rig: nothing live = bit-identical to an
  unflagged rig through a vault and a reload; a `trav.vault` base row turns the elbow during the vault (> 20 deg) and
  the rig is bit-identical to the no-row run after it; a `reload` row shows while reloading (the graph's reload weight)
  and not after; the hit row from the flinch spring.
- Updated: `tests/tuneV2Sections.test.ts` (group counts), `tests/tunerLayout.test.ts` (level counts: Hands 4, Joints 3).
- `scripts/e2e-studio.mjs`: the boost pair scrubbed into the assist: role B's puppet picks `trav.brace, team.boost.b`
  and a `team.boost.b` base row turns its elbow (40.0 deg); the vault loop: Wren picks `trav.vault` (paused in it), the
  row turns her elbow (40.0 deg), and 1 s out of the vault the offset is identity (live 0, w 1).
- `scripts/e2e-anim.mjs`: a `reload` base row (elbowL 35 deg) shows while reloading (105 frames on the row, 35.00
  deg) and not 1.5 s after (0.00 deg, no rows).
- `scripts/e2e-netmove.mjs` (J1 polish item 1): the host's copy of the offering client picks `team.boost.b` from the
  client's move mode on the wire, and a base row set on the host through `__animBase` turns that copy's elbow (41.6
  deg; live 0 before).

## Results (desktop, 2026-10-21)
| Command | Result | Time |
| --- | --- | --- |
| `npm run check` | exit 0: lint 0 errors / 41 warnings (none new); Vitest 220 files, 2414 passed, 5 skipped; build ok | 445 s |
| heavy lock taken 18:09 (`CT Core Build \| anim-joints J2`), port 4191 freed | - | - |
| `E2E_PORT=4191 E2E_JOBS=2 node scripts/run-e2e.mjs e2e-studio e2e-netmove e2e-anim` (on the check's build) | all passed: e2e-studio ok 235 s, e2e-netmove ok 427 s, e2e-anim ok 86 s | 427 s wall |
| port 4191 freed, lock released 18:16 | - | - |

First run, no reruns. An earlier `npm run check` failed only on `tests/tunerLayout.test.ts` (the Hands level count is
4 now): updated. No GPU checks apply.

## Open items
- The partner's relay climber rides the same wire mode and sub as the leg-up climber (`boost`, sub 0), so it reads
  `team.boost.a`, not `team.relay.a`; the revive has no wire state (no team row on the partner). A wire bit would fix
  both (not done: no wire change).
- Track A (UI, not edited): the Joints picker now has 3 levels and Hands & feet / Weapon 4 (`team` > `boost` > `b`);
  the extra pickers are disabled for rows without them and read "Pick 3" / "Pick 4" (`LEVEL_NAMES`); the level words
  read "Trav", "Team", "A" / "B" (plain words). A studio loop turns follow off and `loopGroups` points Joints / Hands /
  IK / Weapon at the body state only: a `trav:` loop could point them at `trav.<kind>` and a `pair:` loop at its
  `team.<move>.a|b` row.
- Action weights are one frame late (the rig picks before its graph updates).
- `trav.split` and `trav.rappel` are attached moves: their rows stay on for the whole attach.
