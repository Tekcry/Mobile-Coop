# anim-joints - plan

Two slices, each: implementer (Opus), fresh checker (Opus), at most one fix round, then commit, push, a message to the
orchestrator. Then the PR (full e2e). Heavy runs: desktop under `C:/NightShift/heavy.lock`, the laptop only when it is held.

## Slice J1 - the base table every Wren rig reads (COVERAGE gap 1)

Build:
1. `src/anim/animBase.ts` (generated, A4): `ANIM_BASE = { version: 1, joints: { row: { joint: [x, y, z] } },
   hands: { weapon: { row: { param: v } } }, ik: { row: [handL, handR, footL, footR] } }` between
   `// @anim-base-begin` / `// @anim-base-end` markers, empty. Pure helpers: parse the text, apply bake entries
   (A1 rules, joint degrees wrapped to -180..180), print the text (sorted keys, stable output).
2. `tuneJoints.ts` / `tuneHands.ts`: the effective row = base composed with the tuner delta (A1). The tables stay the
   delta store the panel edits; the effective values are rebuilt on an edit or a load (not per frame).
3. Per-rig application: each Wren rig (`rig.tuneRows`, A7) owns its eased state (joint quaternions, hand values, IK
   strengths: allocated once at rig creation). Inside `CharacterRig.animate` the rig picks its own row from its pose
   (`selectBodyGroup` + `handsWeaponOf` + the per-gun Joints row, the same pick as the local player) and opens its
   window; the hooks read the rig's own state, not module globals that another rig could leave open. Guards and other
   rigs: flag off, nothing read, nothing allocated. `player.ts` keeps `tuneV2Frame` (registry -> delta tables, follow
   keys) and stops opening the joints / hands windows itself.
4. Bake: `tuneBakeTable.ts` drops the four `manual(*)` entries; `tuneBake.ts` routes `joint.*` / `hand.*` / `ik.*` /
   `weapon.*` entries (after `migrateTuneChanged` for version 1) into `animBase.ts` (one write, in the diff and the
   ledger); `joint.options` stays manual. The script prints them as "baked (base table)".
5. Tests (Vitest): a literal version 1 export (pre-T1a groups: `joint.wallIdle`, `hand.rifle.aim`, `ik.crouchWalk`,
   `weapon.pistol.aim`, `joint.options`) and a literal version 2 export bake to the expected base text; bake then reset
   gives the same effective values per row (identity of the bake); a re-run is a no-op (ledger); an empty base and zero
   deltas are bit-identical to today (the rig hooks never run). e2e: extend `e2e-studio` (a base row on the studio's
   role B rig turns its elbow) and one co-op suite (`e2e-coop` or `e2e-netmove`: the partner's avatar reads a base
   row set through a dev hook).
6. Docs: `docs/anim-tuner/BAKE.md` (the base table), `docs/systems/ui.md` tuner lines, `CHANGELOG.md` under
   "Unreleased - anim-joints", `TESTING.md` (bake an export, see the partner take it).

Checks: `npm run check`; `e2e-studio` + the co-op suite (desktop, E2E_JOBS=2).

## Slice J2 - move and action rows (COVERAGE gap 2)

Build:
1. `src/anim/tuneMoveRows.ts` (pure): the row id list `TUNE_ROW_IDS` = the body states, then the move rows
   `trav.<kind>` (moveTune `TRAV_KINDS` + `brace`), `team.<move>.<a|b>`, then the action rows `air`, `land`, `slide`,
   `melee`, `reload`, `swap`, `throw`, `hit`. A pick function from the pose and the graph: the stance row plus up to 3
   move rows with weights (A5), no allocation (a preallocated result).
2. The Joints, Hands, IK and Weapon tables and their registry sections keyed by `TUNE_ROW_IDS` (group ids
   `joint.trav.vault`, `hand.rifle.reload`, `ik.air`, `weapon.pistol.throw`, `joint.team.boost.b`, ...); the per-gun
   Joints rows stay for the armed states. A's panel shows the new groups with no UI change (registry).
3. The weights: the anim graph exposes per action its own blend weight (reload, swap, grenade throw, melee, slide,
   landing, air, hit react) through a small read-only struct (`animGraph.ts` row plumbing); traversal moves weight 1
   while `traverse` is the kind; team roles from `RigPose.tuneTeam` (new optional field: `player.ts` sets the local
   role from `MOVE_TUNE_TEAM.group`; the studio and the partner wait on A6's hooks).
4. Composition in the rig (A5), the panel follow in `tuneV2Frame` (local player only).
5. Bake: the move rows bake like any row (the base table is keyed by row id already).
6. Tests: pick weights per action (unit), composition (identity at w = 0, the row at w = 1), a move-row bake; e2e:
   `e2e-studio` (a `joint.trav.vault` edit moves the elbow during the vault loop; a `joint.team.boost.b` edit on the
   pair's role B), `e2e-anim` (a `joint.reload` edit shows while reloading, not after).
7. Docs as J1.

Checks: `npm run check`; `e2e-studio` + `e2e-anim` (desktop), slice tier (`e2e:quick` + `e2e-ctcourse`, `e2e-coop`,
`e2e-netmove`: `src/player` changed), desktop.

## J1 PR (orchestrator ~17:20)
J1 shipped alone: [Tekcry/Mobile-Coop#84](https://github.com/Tekcry/Mobile-Coop/pull/84) from `feature/anim-joints-j1`
(worktree `C:/NightShift/Mobile-Coop-anim-joints-j1`), full e2e on its head. J2 continues on `feature/anim-joints`.

## havok-stall (orchestrator ~21:45: right after the J2 PR, ahead of 22 and 24; branch feature/havok-stall from master)
- The desktop e2e-menus stall (`J2-STALL.md`, backlog "Flaky e2e suites"): a main-thread spin inside Havok after the
  tuner's long timeScale 0 pause. Try first: a huge fixed-step accumulator on release, or a degenerate shape cast
  (zero-length direction, a huge sweep). Reproduce with a unit or e2e that pauses a long real time, then resumes; fix
  the cause in the loop or the controller, minimal; then e2e-menus on the desktop in a full run.
- From Menu Notes' #88 analysis (`docs/anim-skeleton/s2/REPORT.md`, "#88 fix round"): e2e-levels "a runner climbs the
  rack ladder" takes 9-30 s on master against a 30 s budget (guard think ticks, real-time frames): seed Math.random and
  use loop.manual around that chase (or widen the budget); list it in backlog's flaky suites until then.
- Log only (no change): gameplay reads the rig pose in `enemy.ts:1779-1781` (perception eye from `rig.headNode`),
  `game/playerTarget.ts:101-119` (hit volumes), `ai/body.ts:96-124`: not graphics state, but gameplay tied to animation.

## After J2 (marlow-bays BRIEF items 22 and 24, be300901; each its own PR)
- **G1, item 22, gear offsets:** per-socket sliders for worn gear (holster, the gun on her back, the sling, grenade
  pouches, goggles), per state where useful, baked into the base table; the partner sees them. Holster / back mount /
  sling apply in `characterRig.ts` (ours: it reads `thighMount` / `backMount` and the sling nodes each frame; no
  operators edit). Orchestrator ~17:30: `src/weapons/carrySlots.ts` is ours for the pouches (minimal, named in the PR
  body); goggles through track C's offset hook in `goggle.ts` (stowed and worn) once it lands, else 22 ships without
  goggles and they follow.
- **G2, item 24, guard tuning (MOVED to Course Ready, track A, orchestrator ~22:15, Michael's choice; it may make minimal edits in `animBase.ts` / `tuneJointsRig.ts` for a guard table and a flag line in `src/ai/enemyRig.ts`: keep them when merging):** a guard target in the tuner and studio (the studio's guard puppet) with its own rows
  (Joints, Weight, Stepping where guards use them), a guard base table; Wren rows never touch guards. Needs a flag line
  in `src/ai/enemyRig.ts` and a target hook in the studio / panel (track A): exact lines to the orchestrator first.

## PR (J2)
Merge master (with J1) in, full `npm run e2e` (desktop, `E2E_JOBS=2`), CI check, PR to master "anim-joints (T1b)", message the
orchestrator with the PR and the open items (A6 / A7 hooks if still pending).
