# Animation clean-up - decisions

Michael's words: BRIEF.md. Assumed decisions (A1 onward), each with how to undo it.

- **A1. Based on feature/weapons and feature/ct-prototype.** The clean-up needs Wren's holds (weapons) and the posture
  fix (CT Core's P1, which leaves arms, hands and the aim pocket alone). Merge order: weapons PR #7, then
  feature/ct-prototype, then this. Undo: rebase onto master once both are merged.
- **A2. The shoulder swap rides MoveState.sub bit 128 in ground mode** (the wall's left-hand bit), so the partner
  mirrors it; a wire meaning change, PROTOCOL_VERSION 17. Undo: drop SHOULDER_LEFT_SUB and the ground branch in
  poseFromMoveState, back to 16.
- **A3. Back-mount draw and holster pass the grip beside the head on the right** (TRAVEL_VIA), the rifle muzzle-up
  before it passes the head; the pistol by the right hip. Undo: TRAVEL_VIA / the travel calls in playerWeapons.
- **A4. One pouch stop per reload** (the stripped magazine swapped for a fresh one at the same pouch: the rifle's on
  the chest plate, the pistol's on the left hip), not a dump pouch then a fresh pouch.
