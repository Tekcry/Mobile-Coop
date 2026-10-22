# anim-natural N4c: hand swap and elbow strike
kind: minor
- Hand swap (the left-shoulder aim swap and the left wall end with the gun out, AUDIT row 29): the gun now passes low
  across the chest, under the chin, muzzle forward-down, instead of swinging round the head. Mid-swap the sight lets go
  of the eye and the aim pitch, the body clearance push is eased (no centre-line pop: largest grip step per frame 28-41
  cm -> 9-12 cm). `src/anim/handSwapPath.ts` (`HAND_SWAP` drop 0.12 m, forward 0.3 m, aimed only).
- Elbow strike and the lethal takedown blow (AUDIT row 49) drive from the hips and trunk: the wind-up loads the hips
  and rear shoulder, the hips lead the shoulders by about 3 frames through about 32 deg of turn (was 0.8; the keyed idle
  trunk wiped the graph's turn every frame), the weight shifts onto the lead foot, the head stays on the target. Wren
  rigs only (local and co-op partner); guards unchanged. `src/anim/strikeBody.ts` (`STRIKE_BODY`).
- Elbow strike, faster arm (Michael M1): the strike plays its arc warped onto the hit, so the elbow lands as the
  knockout resolves (`STRIKE.hitAt` 0.08 s unchanged; hand across by 0.1 s, was 0.37 s), the hips and shoulders drive
  through first, and the follow-through and return fill the rest of the 0.68 s. Same on a co-op partner (the wire keeps
  the raw phase; both sides warp). `strikeWarp` in `src/anim/strikeBody.ts`; the lethal takedown blow and the grab kill
  are unchanged.
- Tuner: Gun slider "Gun drop changing hands" (`swapDropMul`) and a new "Elbow strike" section (turn, hips lead,
  weight shift); all bake (`tuneBakeTable.ts`).
