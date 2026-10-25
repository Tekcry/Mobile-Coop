# player-batch-j19: brief
Owner: Night Shift | Player Build. Status: current.

Lead: Night Shift | Player Build. Started: 2026-10-25 18:15. Base: master 2148ec969 (4.103.0, train 95).
Planner: Opus 5.5 (FOLDED-PLAN J19, `docs/orchestrator/FOLDED-PLAN.md` section 4 on origin/feature/menu a008cb22c).

## Michael said
- 2026-10-25 ~16:50, native multiple choice, typed answer to Q38 "Motion capture switch for players?": "mocap only, i
  will fine tune them in anim dev"
- 2026-10-25 ~16:50, native multiple choice, typed answer to Q39 "Partner animation data over the network?": "yes
  players must look exact in everyones games"
- Context only (other rows, other jobs): Q20 Sector Ops downed nobody can reach: "30 seconds then death and wait until
  next section door" (J18, not here: it sets when a downed player is out, not the health a revive gives).

## Michael picked
Source: ROADMAP "Decided" on origin/feature/menu, "Folded plan, the other 30 (2026-10-25 ~16:50)"; question text from
FOLDED-PLAN section 2.
- 2026-10-25 ~17:00 Q: the folded plan sign-off -> picked: "Sign off, start (Recommended)"
- 2026-10-25 ~16:50 Q34 "Palm strike recovery?" -> picked: "About 1.4 s (Recommended)" (option: "Back to about 1.4 s")
- 2026-10-25 ~16:50 Q35 "Camera moving by itself?" -> picked: "Pull-back only (Recommended)" (option: "Keep the
  open-space pull-back, drop the doorway push-in")
- 2026-10-25 ~16:50 Q36 "Hold or toggle settings?" -> picked: "Plain holds only (Recommended)" (option: "Toggles for
  plain holds; tap / hold buttons and aim excepted")
- 2026-10-25 ~16:50 Q37 "Animation corrections over the motion capture?" -> picked: "Decide at your walk
  (Recommended)" (option: "Decide at the animation walk")
- 2026-10-25 ~16:50 Q16 "When does 4-player Sector Ops switch on?" -> picked: "Live now" (context for R33 / R38: up to
  4 players in Sector Ops get the revive and friendly-fire rules).
- Q38 and Q39: typed answers, above. The grab menu (Player Q4) was dropped: G203 settles R13 (FOLDED-PLAN section 2).

## Goal
The player's takedowns, strike, carry, movement, camera and co-op rules match the decisions and the bible: every
positional takedown can kill (RT hold), none is quicker than about 1 s, the palm strike recovers in about 1.4 s and a
client's held strike kills on the host too, a carried body is heard and can be laid down quietly, the menus show only
what G203 / G206 allow, removed sprint and hop code is gone, the camera only pulls back in open space, plain holds have
a toggle, a revive gives 35% health and friendly fire is a host option. Michael gets a look video of the AF0-AF6 pass
and of the mocap-correction options for his animation walk; nothing in R26 / R27 changes before that walk.

## Limits
- Out of scope: hot-path allocations, `hyp3`, touch (J6); dogs and helmets (J15); objective pop-up and intel notes
  (J3b, R12 / R24); Marlow Yard revive cap and solo start (J14, R35 / R36); campaign revive rule and player count (J7,
  R37); shoulder stand and rope descent (J24, R32 / R34); shutter notice (J9, R39); the warehouseOps duct (J18, R20);
  character shadows (J16). AF7-AF9 wait for the walk. No change to R26 / R27 values before Michael's walk (Q37).
- Rules that hold: CLAUDE.md hard rules (co-op only in `src/net` behind `flags.coop`; strict TS; hot paths allocate
  nothing, so new code adds no per-step allocation; no `Math.hypot`); G43, G141, G159, G203, G204, G205, G206, G210,
  G214, G217, G271, G298, G31, G35, G69, G195, G355, G356; bible 5.3 (bodies, camera), 5.4, 5.9 C6 / C8 / C11, 5.12,
  5.12.2, 5.17 D7 / D8. A wire change does not bump `PROTOCOL_VERSION` (the train does).
- Areas touched and their unwalked count (cap 3): Player / animation 3, AT CAP; Guard AI 5, AT CAP (R16 only, data).
  At the cap only rule fixes to shipped features ship on (G355). The one new verb (R11 quiet put-down) ships dark.

## Answers (M) and assumptions (A)
- M1 2026-10-25 ~16:50 (Q34): palm strike recovery about 1.4 s. R8 sets `STRIKE.recover` so contact-to-free is 1.4 s.
- M2 (Q35): keep the open-space boom pull-back (1.8 tight / 2.8 open), drop the doorway push-in (R22).
- M3 (Q36): D7 toggles cover plain holds only; tap / hold buttons (RT, LB wheel, X, vent kick / unscrew, crouch roll /
  lower) and aim (G214) are excepted (R23).
- M4 (Q37): R26 / R27 are options with a look video for Michael's animation walk; no value change before it.
- M5 (Q38): no Settings mocap switch for players; Michael tunes the mocap in the anim tuner (R28). Recorded here; the
  orchestrator folds it into DECISIONS (J2).
- M6 (Q39): the AF6 partner anim fields stay on the wire (R29); bible D8 "no extra bandwidth" is amended by the J2 fold.
- A1 (R14): every non-grab takedown row reads "Knock out" (front, side, corner, over cover, above, drop, below, window,
  inverted), not only ledge / pipe / window (G206 names those; one wording keeps the menu CT-plain). The co-op "Team
  takedown" and "Bluff" rows stay. Undo: restore the per-kind entries of `TD_LABEL` in `src/game/gameState.ts`.
- A2 (R13): only the `behind` offer hides the door, optic-gap and item rows; the hang-down grab keeps its hack row
  (hang-down A1, a co-op kit move, not "behind a guard"). Undo: add `hangDown` to the check in `contextMenuStep`.
- A3 (R7): the floor is 1.0 s from press to the victim down (approach + strike) for every kind, after the glove
  multiplier: gloves still shorten a takedown planned above 1.0 s, never below it. Undo: `TAKEDOWN_MIN` to 0.
- A4 (R6): RT tap knocks out, RT hold kills on every offered takedown the palm strike cannot reach (above, drop, below,
  window, inverted, and `lethalOnly` offers), as the hang-down does; ground front / side / corner keep the palm strike
  (RT hold is its lethal one). Undo: narrow the kind list in the RT block of `gameState.ts`.
- A5 (R10): carrying, footsteps carry at least `CARRY_STEP_NOISE` 2.5 m (x surface x suit) whenever moving; a starting
  value (G356). Crouch is blocked while a body is on the shoulder. Undo: the constant to 0; drop the crouch block.
- A6 (R11): "Put down" is a slow quiet lay-down (about 1.6 s, no noise) beside "Drop body" (0.8 s, 3 m noise), behind
  `?putdown=1` until Michael walks it. Undo: drop the row and the flag.
- A7 (R16): the runner gets the grunt's sidearm in `src/config/enemies.json` (it keeps its melee); the parked mission
  mode and the base warehouse spawn it. Undo: `"weapon": null` again (G298 would then be broken again).
- A8 (R17): the default look's helmet becomes `headset`; a stored `trilens` is read as `headset` (the existing
  `LEGACY_LOOK_IDS` remap, no save change); the catalog entry and the rig's tri-lens case go. Undo: revert the remap.
- A9 (R19): `sprintHold` leaves the settings (an old stored value is ignored on load); the `dash` action goes if the
  key-binding loader drops unknown ids, else it stays bound to nothing. The mocap sprint clip and the anim sprint band go
  only where no reader is left (the tuner's move list included); anything still read is listed in the PR and kept.
- A10 (R23): the existing "Held interactions" toggle (`access.holdToggle`) covers every plain hold; no per-action
  settings, no save shape change. Undo: add per-action toggles.
- A11 (R33): a partner revive gives 35% of max health in every mode, Sector Ops syringe revives included (bible 5.13
  names one revive row); section / bay restarts and respawns stay full. Undo: pass 1 for `sector` in `reviveOne`.
- A12 (R38): friendly fire is a lobby row for the host, default On (G141), sent in the `lobby` and `start` messages and
  kept in the rejoin record; course mode keeps it on as before. Undo: the host's `ff` back to `mode === 'course'`.
- A13 (R28): `?mocap=0` and the tuner's mocap box stay as developer rollbacks (not a player switch). Undo: remove them.
- A14 (R30): the audit's `raise` row is the draw (bible 5.12.2 "Weapon raise", G243): 0.75 s pistol, 1.1 s rifle;
  `turn180` 0.4 s. A live move that fails a new limit is reported in the PR with its measured value and goes on the
  polish list for the walk; the limit is not loosened.

## Questions for Michael (one click each, asked by day)
- None. No assumption loosens a Michael-only rule; Q34-Q39 settle the rows that needed him.

## Sign-off needed
No map or layout. Animation PRs (S1, S2, S5, S7) carry a 1-2 min look video; the AF0-AF6 video and the R26 / R27
option videos go on the next walk card (S8b).
