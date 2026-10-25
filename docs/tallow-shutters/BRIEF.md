# tallow-shutters (J9): brief
Owner: Night Shift | Campaign Build. Status: current (job doc).

Lead: Night Shift | Campaign Build. Started: 2026-10-25 ~19:00 (plan), fix round 1 ~20:30. Base: `feature/mission-engine`
after J7 PR D (stacked on #372; reaches master through the PR C split). Plan: `docs/missions/slices/J8-J9-PLAN.md` (J9's
part: slices S1-S4, FS; the draft for `docs/tallow-shutters/PLAN.md`; shared with J8, `docs/tallow-fixes/`).

## Michael said
- 2026-10-24 ~22:45 (G292): "All campaign missions are strictly coop and cannot be completed solo, must have forced coop
  traversal to proceed (help player climb a wall, throw coop player over a gap to open a locked pathway for the other
  player, and any suggestions you have)."
- 2026-10-25 ~18:05 (Tallow Wharf map sign-off page): "approve as drawn, id rather physically walk the map once built and
  confirm changes".

## Michael picked
- 2026-10-25 ~18:05 Co-op kit page: all five new moves join ("Deadweight,Drop Catch,Chimney Pair,Swing Pass", Plank
  Bridge "Add it"); the shutter hold stays a kit move.
- 2026-10-25 ~18:05 Tallow hold: "Build now, walk later (Recommended)".

## Goal
Both Tallow shutters are real (W1 fish hall -> service passage, C2; W4 back lane -> shed two, C8): one player lifts and
holds, the other crawls under, so both missions finish without a debug teleport (VISION rule 3, G146); a calm guard who
sees a held-open shutter comes to look (Player conformance R39, as G41 does for doors); a section restart puts every
shutter back down.

## Limits
- Out of scope: guards lifting shutters (A15), lift noise (A17), any wire change (A19), Tallow geometry beyond the two
  shutter spots (J8).
- Rules that hold: CLAUDE.md hard rules (light parity, hot paths allocate nothing, `src/net` only behind `flags.coop`);
  G41, G44, G143 (every detection explainable); G292.
- Areas touched and their unwalked count: Tallow, dark behind `missions`; the lift is offered only with `coopKit` (folding
  into Player's `kitMoves`).
- Flag: `missions` (`?missions=1`), owner Night Shift | Campaign Build, switch-on date 2026-11-01 (after Michael's Tallow
  walk; J8 A26).

## Answers (M) and assumptions (A)
No M answers yet. Assumptions (numbers shared with the J8 plan, section 3):
- A15 Guards never path through a shutter (the opening is closed on their nav grid; the winding gear is broken). Undo: a
  guard lift behaviour (Guard AI, large).
- A16 The closed curtain stops lamp light in the light field and on screen alike (light parity). Undo: a lift-aware
  occluder.
- A17 Guards notice a held shutter by sight, not by sound. Undo: a hold-noise pulse with the radius from the sound plan.
- A18 The notice: a calm guard within 9 m, facing it, same storey, clear sight line, while it is visibly open, hears it
  and comes to look; once per opening; host only; no allocation. Undo: change two constants.
- A19 No wire change: a client draws its curtains from its own devices; if it needs more, an Opus `src/net` slice with
  two checkers. Undo: n/a.
- A27 A section restart drops every shutter shut, ends any lift run and clears the notice marks, host and client. Undo:
  remove the reset call.

## Questions for Michael (one click each, asked by day)
None. (J8's A1 and A24 questions do not block J9.)

## Sign-off needed
No: the shutters are on the approved drawing (C2, C8).
