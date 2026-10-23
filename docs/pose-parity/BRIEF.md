# pose-parity - BRIEF (spare job 6)

Ask (orchestrator spare-jobs.md row 6): "Partner pose parity: aim side on the wire, remote melee -1 clamp, baked
sections on the partner" (co-op reads, net + anim, M-L). Goal: what a player sees of their partner matches what the
partner's own page shows. Branch `feature/pose-parity` from `origin/feature/ctcore-batch-23` 58368e10.

Limits: wire change bumps `PROTOCOL_VERSION` (compact: a free bit); `characterRig.ts` / `src/anim` only minimal hunks
for the remote pose (no footPlanner, no reachNeed / stOff / foot-plant code); switch-OFF mocap path byte-identical;
no `src/ai`, no save-shape change; hot paths never allocate; single player never imports `src/net` statically.

## Gap 1 - aim side (shoulder swap) only reaches the partner on the ground

Evidence:
- Owner: `src/game/gameState.ts:2651` `pl.rig.openLeft = w.leftHand || (!w.active && pl.cam.shoulder < 0 &&
  this.weapons.handSwitchOk)`: the left-shoulder weapon hand in EVERY mode off the wall (ground, hostage grab, rappel /
  split / inverted pipe sidearm aim, the human ladder top, a landing, ...).
- Wire: `src/game/localMoveState.ts:145` writes `SHOULDER_LEFT_SUB` (128) into `sub` only in the final `ground` branch;
  every earlier branch (team, grab, takedown, strike, doorPeek, wall, attached, committed, landing) returns first.
- Remote: `src/player/moveState.ts:290` `leftHand = mv.m === 'ground' && (sub & 128)`; `src/net/remoteAvatar.ts:567`
  `openLeft = mv && !rp && mp.leftHand && (sub & 128)`. So a partner aiming from the left shoulder while holding a
  hostage, on a rope or atop the ladder shows the gun in the right hand.

Fix: a player flag `PF.aimLeft` = 64 (free since protocol 14, the sprint) set by `localFlags` (`src/net/netShared.ts`)
with the owner's own rule (`!wallCore.active && cam.shoulder < 0 && weapons.handSwitchOk`); the remote's `openLeft` =
the wall's left-hand bit (unchanged) OR the flag. The ground `sub` bit 128 is no longer written (one source); the wall's
`WALL_SUB.leftHand` stays.

## Gap 2 - remote melee -1 clamped to 0 (choke, lethal approach)

Evidence:
- Owner: `src/game/takedownController.ts:650-653` `blowPh = lethal && ks >= 0 ? min(1, ks) : -1`, `pose.melee =
  killWarp(blowPh)` (-1 = no arc) through a non-lethal choke and the lethal approach.
- Wire: `src/game/localMoveState.ts:64` `out.ph = Math.max(0, Math.min(1, g.takedown.blowPh))` (and the sanitiser
  `moveState.ts` `ph: num(o.ph, 0, 1, 0)`): -1 arrives as 0.
- Remote: `src/player/moveState.ts:389` `out.melee = killWarp(mv.ph, TAKEDOWN_BLOW)` = the arc at phase 0, so the
  partner holds the elbow wind-up (and `tuneMoveRows.ts:191` picks the strike action rows) through every choke.
  Logged as n4d polish item 6 (`docs/anim-natural/n4d/STATE.md:22`).

Fix: MoveState `takedown` `sub` bit 1 (`TAKEDOWN_SUB_BLOW`) = the blow is running (`blowPh >= 0`); `ph` stays the
blow's phase. `poseFromMoveState`: `melee = sub & 1 ? killWarp(ph) : -1`. The remote's follow-through tail
(`remoteAvatar.ts:486`) arms only on a running blow (a choke never had one; unchanged in effect).

## Gap 3 - the baked move sections and Body root offsets never reach the partner

Evidence:
- Owner: `src/player/player.ts:390` `tuneRoot` (Body `bodyFwdAdd` / `bodyUpAdd` / `guardGapAdd` / `guardSideAdd`, via
  `TUNE_LOCAL`, which holds the base table composed with the tuner: `tune.ts:762-768`), `:400` the wall push minus
  `TUNE_LOCAL.wallGapAdd`, `:392-393` `moveTuneSelect` + `moveTuneRoot` and `:566-571` `moveTuneBegin / End` (the co-op
  role and traversal move sections, `src/anim/moveTune.ts`: the registry `eff` = base `ANIM_BASE.sections` composed with
  the tuner).
- Remote: `src/net/remoteAvatar.ts:452-478` places the root and `:633-640` animates with none of these; the header of
  `moveTune.ts:15-17` and `docs/systems/coop.md` say the partner "plays the shared defaults until an export is folded
  into the code", but once folded (the bake writes `ANIM_BASE.sections` / `ANIM_BASE.body`) the partner still ignores
  it. Open item in `docs/anim-bake-all/STATE.md:34` and `docs/anim-bake-targets/STATE.md:16`.
- Already shared (no gap): the Body base inside `animate` (`tuneJointsRig.ts` `bodyRigBegin`, every Wren rig), Joints,
  Hands, Gear, IK, the stepping rows, clip speed (`clipSpeed` is global).

Fix (BASE values only, never the local tuner's live values, which are the local player's own):
- `moveTune.ts` `moveTuneSelectBase(team, k, traverse)`: the same group pick as `moveTuneSelect`, from the base refs
  (`BASE_REFS`, only when a base value is off identity), no panel follow; `teamContactKOfWire(group, ph)` the contact
  weight from the wire phase. The remote selects with `teamRowOfWire(m, sub)` (already its tuner team row) and its
  posed `traverse`, then `moveTuneRoot` / `moveTuneBegin` / `moveTuneEnd` around its `animate`, as the owner.
- `tune.ts` `bodyRigRoot(st, pos, yaw)` and `bodyRigWallGap(st)`: the root offset and wall gap from the rig's OWN
  applied Body base (`TuneRigState.bodyBase.applied`, eased by `bodyRigBegin` last frame, as the owner's `TUNE_LOCAL`
  is last frame's); the remote calls them where the owner calls `tuneRoot` / reads `wallGapAdd`.
- Today's base table has no `sections` and no root rows: every new call is identity (bit-identical) until a bake
  writes them.

## Wire change
`PROTOCOL_VERSION` 31 -> 36: 32 is reserved for guard-ai, 33 is marlow-final (origin/feature/marlow-final), 34
section-rating, 35 sector-redesign (p3 and others); checked 2026-10-23 with `git fetch` over every remote branch.
Contents: `PF.aimLeft` 64; MoveState `takedown` sub bit 1; ground `sub` bit 128 dropped. No size growth (bits in
existing fields).

## Assumed decisions (undo by telling the orchestrator)
- A1: aim side as `PF.aimLeft` (a flag, every mode), not a MoveState sub bit per mode. Undo: write 128 into each
  branch's `sub` instead (collides with attach / team sub bits; the reason for the flag).
- A2: the ground `sub` bit 128 is dropped (the flag replaces it). Undo: keep writing `SHOULDER_LEFT_SUB` in
  `localMoveState` and the `moveState.ts:290` line.
- A3: protocol 36 (next free). The orchestrator may renumber at merge (one line + the asserting tests).
- A4: the partner reads only the BASE (baked) values of the move sections and Body root offsets, never the viewer's
  live tuner values (those are the viewer's own body, `TEAM_TUNE_NOTE`). Undo: drop the remote calls.
- A5: the remote's contact weight comes from the wire phase (`teamContactKOfWire`: the leg-up's and the throw's
  windows on `ph`, the hang-down / rope climber 1, the rest 0), an approximation of the owner's timer-based
  `teamContactK` (the wire has no team timer). Undo: pass 0 (contact sliders never reach the partner).
- A6: the Weight section (`weightBegin`, local only) and the camera / gun sections stay local: the Weight layer
  needs the owner's acceleration and plant history, which the remote only estimates; not in this job.
