# anim-natural N4c - look notes (hand swap, elbow strike) - brief

Job lead: Night Shift | Menu Notes Build. Branch `feature/anim-n4c` (C:/NightShift/Mobile-Coop-anim-n4c, from master 4.57.0
703b5063). Started 2026-10-22 ~20:05 on the orchestrator's word (animation is top priority).

## The ask
Michael (2026-10-22 ~09:00, anim-natural BRIEF): "All movements must move naturally with twisting/swaying/balancing hands
and anything else that makes it believable and realistic." N4 = the audit's remaining rows. Two look notes from the N0
leftovers (docs/anim-natural/PASS2.md on feature/anim-natural, "N0 leftovers"; AUDIT.md rows 29 and 49):
1. **Hand swap (row 29):** the rifle swings muzzle-up over the shoulder mid-swap, on the wall-end peek (`wallLeftHand`)
   and on the left-shoulder aim swap alike (the same fault as row 24's wall block, fixed in N3b).
2. **Elbow strike (row 49):** an arm-only strike: the shoulders turn 0.8 deg through it. The strike should drive from the
   hips and trunk.

## Goal and limits
- Prototype grade, believable not perfect (CLAUDE.md current goal). Wren only; guards unchanged.
- Every new control is a tuner slider that bakes (`tuneBakeTable.ts`). e2e-anim metrics stay as guards.
- No wire change expected (the remote rigs pose from `MoveState` / `melee`).
- Overlap: open PR #119 (feature/anim-n4b) also edits `characterRig.ts`, `player.ts`, `gameState.ts`: keep hunks small.

## Assumed decisions
- **A1** Strike body on Wren rigs only (local and co-op partner); guards keep the graph's old turn. Undo: drop the
  `wrenReady` gate in the melee block (`animGraph.ts`) and in `CharacterRig.strikeTrunk`.
- **A2** Strike amounts (`STRIKE_BODY`): about 32 deg shoulders, hips lead 0.1 phase (~3 frames), 3 cm forward / 2 cm
  over the lead foot. Undo or change: the three "Elbow strike" sliders or `STRIKE_BODY`.
- **A3** The strike sliders are their own tuner section (not a Body field, which would change the body base table).
- **A4** The shoulder swap keeps its 0.25 s (`EDGE_HAND_TIME`); a slower aimed swap would be its own change.
- **A5** Swap drop 0.12 m and forward carry 0.3 m, aimed only (a lowered gun is already low). Undo: `swapDropMul` 0 or
  zero `HAND_SWAP`.
- **A6** The weld release, aim-pitch release and eased clearance push mid-swap are fixed parts of the fix (no slider).
  Undo: remove the `(1 - swapK)` factors and the `easePush` condition in `characterRig.ts`.
- **A7** One swap bake target shared by rifle and pistol.

## Open (for the orchestrator, gameplay, not changed)
- Strike timing: contact resolves at 0.08 s (`STRIKE.hitAt`, phase 0.12), the visual arc reaches contact at phase 0.56
  (~0.38 s): the knockout lands during the wind-up.
