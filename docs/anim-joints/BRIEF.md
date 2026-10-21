# anim-joints - brief (T1b, track B of the animation work)

Job lead: Night Shift | CT Core Build (new account). Branch `feature/anim-joints` in `C:/NightShift/Mobile-Coop-anim-joints`,
started from track A's T1a at `feature/marlow-tuner-t1` 1db6e593 (master 4.35.0 + T1a), as the marlow-bays BRIEF
"Tracks" says (107b8433) and the orchestrator confirmed (2026-10-21 ~16:10). Master is merged in again once T1a lands.

## The ask
Michael (2026-10-21 ~15:15, marlow-bays BRIEF items 17 and 20): "can you check and make sure i have full control over
every stance and every body part". The coverage audit (`docs/marlow-bays/COVERAGE.md` on `feature/marlow-bays`) found
that the Joints, Hands & feet, IK strength and Weapon sections never bake and act on the local player only, and that
moves and actions have no Joints row. The tracks (Michael ~16:10: "is there anything we can do to split sessions to
focus heavily on the animation work?") give track B:

- **COVERAGE gap 1**: Joints / Hands & feet / IK / Weapon edits bake into a generated base table that every Wren rig
  reads (the co-op partner and the studio's role B included); the tuner values become deltas on it, as Body already is.
- **COVERAGE gap 2**: the Joints, Hands, IK and Weapon tables keyed by a row id list (not `BodyGroup`), with move rows
  (traversal moves incl. rappel and brace, the co-op moves per role) and action rows (air, land, slide, melee, reload,
  swap, throw, hit), picked while the move or action runs, blended over the stance row.
- **Gap 3** (the split rows: crouched wall, crouch run, aim still, holds vs carries, rifle vs pistol) is track A's and
  is built (T1a, `src/anim/tuneRows.ts`, store v2). T1b builds on it.
- New rows register through the tuner registry, so A's panel shows them with no UI change.
- Exports made before T1b must bake: tested with a literal old export (a version 1 and a version 2 export).

Goal (CLAUDE.md "Current goal"): a prototype that works; no polish. One checker per slice, one fix round.

## File area (BRIEF "Tracks")
Owned: `src/anim/tuneJoints*`, `src/anim/tuneV2Sections.ts`, `src/anim/tuneBake*`, `scripts/anim-tune-bake.mjs`, the row
plumbing in `src/anim/animGraph.ts`, `src/player/*`, and (A3) `src/anim/tuneHands.ts` plus the new files of this job
(`src/anim/animBase.ts`, `src/anim/tuneMoveRows.ts`, their tests, `docs/anim-joints/`).
Not ours: `src/ui/tuner*`, `src/ui/studio*`, `src/anim/studio.ts`, `src/anim/tuneKeys*`, `src/anim/tuneRows.ts`,
`scripts/anim-keys/*` (track A); the rig / skin / clips (track C); `src/net/*`, `src/game/*`, `src/operators/*`
(the orchestrator routes requests). A change there goes through "Night Shift | Orchestrator".

## Michael's answers
(none yet)

## Assumed decisions (undo by telling the orchestrator)
- A1: Base and delta compose per value: Joints add degrees per axis (the offset quaternion is built from the sum, so a
  bake is exact); Hands & feet and Weapon offsets add, gun scale multiplies, the trigger mode is the delta's when it is
  not 0 (auto) else the base's; IK strength multiplies. Undo: a different rule per param in `animBase.ts`.
- A2: On this machine the live tuner deltas apply to every Wren rig (the local player, the co-op partner's avatar, the
  studio's pair rigs), not only the local player, so a preview shows what the bake gives everyone. Guards, the VIP,
  the dummy and every non-Wren rig never read the tables. Undo: deltas on the local rig only (one flag).
- A3: `src/anim/tuneHands.ts` is in no track's list; T1b takes it (gap 1 needs it). Approved by the orchestrator (~16:40).
- A4: The base table is a generated TypeScript file (`src/anim/animBase.ts`, a JSON literal between markers) that the
  bake script rewrites whole: plain Node and Vite load it, and the bake parses it with `JSON.parse`. Empty at the start
  (every row identity), so the default output is bit-identical to today.
- A5: A move or action row composes over the stance row by its weight (0..1, from the pose / anim graph): Joints
  stance x nlerp(identity, move, w); offsets stance + w x move; multipliers stance x lerp(1, move, w). At most 3 move
  rows at once. The panel follows the strongest move row while its weight is 0.5 or more, else the stance row.
- A6: The co-op partner's avatar does not know its team role (the pose has no team state; `src/net` is not ours), so in
  T1b the team rows act on the local player and the studio's pair rigs; the partner reads every other row. A one-line
  role hook in `src/net/remoteAvatar.ts` (and `src/game/studioStage.ts` for the pairs) is requested from the
  orchestrator; until it lands the partner's team rows read the stance row.
- A7: The Wren rig flag (`rig.tuneRows = true`) is set where the rig is made (`operatorRig` in
  `src/operators/runtime/playerFigure.ts`, one line, requested from the orchestrator); until then `player.ts` sets it for
  the local player.

## Limits
Hard rules in CLAUDE.md. Hot paths allocate nothing (per-rig state preallocated at rig creation). Gameplay never reads
these tables (visual pose only; the capsule, aim ray, muzzle and the wire are unchanged). No save-shape change: the
tuner store keeps its v2 shape (new groups load as identity). Tests (orchestrator ~18:15, after the desktop full e2e
timed out at `E2E_JOBS=2`): the full e2e goes to the laptop first ("Night Shift | Character Build", `E2E_JOBS=2`, a
pushed commit); on the desktop a full e2e runs only at `E2E_JOBS=1` and only when the laptop is busy. Named suites run
wherever is free (desktop: port 4191, one heavy job at a time under `C:/NightShift/heavy.lock`). #67 (S2b walk) stays parked: Michael fixes it himself.
