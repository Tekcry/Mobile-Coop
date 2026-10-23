# Hang-down actions (spare job #2, CT Core Build)

## The ask
Spare-jobs row 2 (orchestrator triage 2026-10-23): "Hang-down: sidearm, grab, neck-snap for the hanging player
(`runHang` teamController.ts:497)". The hang-down exists (B5: `hangOffer` / `hangHold` / `hangDown` / `hanging` /
`hangPull` / `hangDrop`); the hanging player can only hack (A on a panel in reach). Missing:
1. Sidearm: draw, aim and fire the pistol while hanging (inverted aim; pistol only, never the rifle).
2. Grab: a guard under / beside the hanging head is grabbed (CT: lifted up, choked); the grab system with an inverted
   pair; held-guard rules G203-G205 (no release; KO or kill; interrogate if he knows something).
3. Neck-snap: a quick takedown from the hang on a guard in reach; RT hold kills, RT tap knocks out (G210).

Limits: host-authoritative as the other team moves; the joiner as the hanger works; no wire change if avoidable
(else PROTOCOL_VERSION 34); coopHost edits small and in their own block; nothing in src/ai beyond calling its APIs;
no edits to animGraph / characterRig / footPlanner; hot paths never allocate.

## CT references
- `docs/ct-research/levels-digest.md:34`: the hanging player "can hack, grab, use a sidearm or neck-snap"; `:41` the
  hang-down is a contextual move through the interaction menu; `:178`, `:240` the hack from the hang (built, B5).
- `docs/ct-research/moves-mechanics-digest.md` 1.5 Drop Line: the pistol (with the jammer); "Grab and neck-snap an
  unaware guard below (the only grab menu entry while hanging)"; the upside-down neck snap was the critics' favourite.
- Michael: G198 / G203-G205 (hold-A menu; a held guard ends knocked out or killed, never let go, no BACK TO GAME once
  held), G210 (RT tap knocks out, RT hold kills; LT aims), G212 (RB is the jammer while the pistol is aimed).

## Assumed decisions (logged, the job carries on)
- A1. The hold-A action menu works while hanging (settled, not lowering or being pulled). Its rows there: GRAB
  CHARACTER for a guard in reach (the only takedown row, CT), the item in reach (the hack, now a hold row like on the
  ground). Lowering, the pull-up and the drop keep the old direct A press. Undo: put `team.active` back in the menu's
  `aside` test (`GameState.contextMenuStep`) and in `updateInteract`.
- A2. Reach: a guard whose neck (1.5 m over his feet) is within 0.75 m under to 0.35 m over the hanging head and within
  0.9 m across (`TAKEDOWN.hangReach*`). Dogs are never offered from the hang. Undo: the constants in `takedown.ts`.
- A3. The grab lifts the guard (his neck to the hands, at most `HANG_GRAB.liftMax` 0.6 m off his floor) and holds him
  in front of the chest. Then the held rules: RT tap / KBM Z knock out, RT hold kills (the neck snap), hold-A
  INTERROGATE when he knows something, LT aims the pistol (shield). No let-go.
- A4. "KO by default": a hang that ends while a guard is held (the holder pulls up or lets go, the hold is lost)
  finishes the hold as a knockout at once; a neck-snap under way ends as decided (a tap not yet decided is a KO).
  Undo: `TakedownController.runHangGrab` / `run` (the `hangLost` branch).
- A5. Neck-snap = RT on a guard in reach from the hang, holstered, not aiming: tap a knockout (choke), hold
  (`STANCE.rtHold`) the lethal neck snap; KBM LMB the same, Z the knockout. It is the takedown controller's ordinary
  takedown with kind `hangDown` (no elbow arc: the hands on the neck). No new binding.
- A6. Sidearm: LT while hanging draws the pistol one-handed (the pipe-inverted aim: `PIPE` aim band and spread, the
  aim mirrored as the pipe's) and RT fires; the camera frames the hanging head (the pipe's `inverted` framing) while
  hanging. The rifle is never drawn there. RB while aiming is the jammer (G212), as on the ground. Undo: the
  `hangAim` lines in `GameState.fixedUpdate`.
- A7. Net, no wire change: the hanger's MoveState stays the team mode (`boost` + `HANG_SUB`). The host lets a
  hanging client hold the pistol (`hostHandsFree`), keeps a guard a hanging client seized (no `TD_MAX` let-go) and
  holds him lifted under that client's head (the same pure `hangHoldPoint`). The host's view of a client's knockout
  shows no lowering (the guard drops at the finish); noted as polish. Undo: the `(hang-down)` block in
  `CoopHost.update` and the `HANG_SUB` line in `hostHandsFree`.
- A8. Animation: the hands go to the guard's neck and shoulder (the takedown's reach IK); no new clip tonight (the
  team-pose and graph files belong to another agent). The upside-down neck-snap and grab poses go on the polish list.
- A9. (fix round, laptop e2e-ctcourse station 5) Playability: a hanging player beside a panel hacks it with A as before
  (the station prompt names A). Hanging settled with no guard on offer or held, A is the item's own again
  (`updateInteract`: a press uses it, a hold fills a hold item) and the menu lists nothing; with a guard by the head
  (offered or held) the hold-A menu takes A (GRAB CHARACTER, the item as its row). One consumer of A per step (the
  flag `hangDirectA` is set once in `contextMenuStep`), and an A still held from a list fills nothing, so one press
  never runs both (the no-double-fire rule). The hanging prompt reads "A to use what is in reach, hold A by a guard to
  grab". Undo: drop `hangDirectA` (`GameState`: its field, its use in `contextMenuStep` and `updateInteract`) and the
  prompt line in `TeamController.runHang`; then station 5 of `e2e-ctcourse` must release A (a tap) to run the menu row.

## Michael's answers
None asked.
