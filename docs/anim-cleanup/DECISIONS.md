# Animation clean-up - decisions

Michael's words: BRIEF.md. Assumed decisions (A1 onward), each with how to undo it.

- **A1. Based on feature/weapons and feature/ct-prototype.** The clean-up needs Wren's holds (weapons) and the posture
  fix (CT Core's P1, which leaves arms, hands and the aim pocket alone). Merge order: weapons PR #7, then
  feature/ct-prototype, then this. Undo: rebase onto master once both are merged.
- **A2. The shoulder swap rides MoveState.sub bit 128 in ground mode** (the wall's left-hand bit), so the partner
  mirrors it; a wire meaning change: version 18 (CT Core's B3 took 17 for the held jammer, B4 19 the partner throw, B5 20 the hang-down, 21 scanners, 22 the two-person rope; the merged branch is at 22).
  Undo: drop SHOULDER_LEFT_SUB and the ground branch in poseFromMoveState, back to 17.
- **A3. Back-mount draw and holster pass the grip beside the head on the right** (TRAVEL_VIA), the rifle muzzle-up
  before it passes the head; the pistol by the right hip. Undo: TRAVEL_VIA / the travel calls in playerWeapons.
- **A4. One pouch stop per reload** (the stripped magazine swapped for a fresh one at the same pouch: the rifle's on
  the chest plate, the pistol's on the left hip), not a dump pouch then a fresh pouch.
- **A5. Five hand shapes as morph targets** (gripR trigger, gripL support, wrapR, relaxR, relaxL) on Wren's game files,
  not finger bones in the LODs (they keep the 23 game joints). Undo: re-export the LODs (operators pipeline) and drop
  the figure's blend.

- **Folded into feature/ct-prototype (Michael, 2026-10-19).** Asked how the clean-up should reach the game, Michael:
  "Fold into CT Core's PR #9 (Recommended)". This branch took in feature/ct-prototype c628e32 (T2), but PR #9 had
  already merged into master (2e14107) with that same code, so the clean-up goes to master as its own PR right away (the
  same intent: land before CT Core's slices B+C and D+E, which start on it).
  The open audits (rappel, fence, vault, duct, split jump, crouched wrist) stay in POLISH.md for those slices.
