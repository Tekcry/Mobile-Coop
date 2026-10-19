# Goggle job - brief

Plan only for now (orchestrator, 2026-10-19). The Blender export, the LODs and the GPU checks run on the desktop later;
the laptop does docs and small edits only (Michael, 2026-10-19).

## Michael's words
- Playtest 2 (2026-10-19, verbatim): "night vision goggle surround looks weird, try similar to CT actuals design without
  copying it".
- G69: "Original goggle" and "Soon": no three-lens look; the menu uses an original symbol.
- G73: "Brow off, eyes on": dim glow on the brow with vision off, full glow over the eyes with vision on.
- G135: each player's goggle light is a distinct colour and is the partner beacon (bible 5.14: player 1 green, player 2
  cyan while both play Wren).
- G169 (ops D19, D20): "the goggles shouldn't flip up and down, they should just sit over the forehead, and be over the
  face when in use"; "the original one looked better but it can't flip up"; head harness "2 - Split crown, hard pod".
- G161 (ops D33): until the stowed goggle is exported it stays over the eyes in both states; only the glow follows G73.

## Goal
A goggle that reads as CT's at a glance (worn close on the face, optics standing forward, the lens glow as the
operator's signature in the dark) while staying original in shape: never three lenses, no copied housing, no reference
names (G5, G6, G69). Both worn positions built and exported: in use over the eyes, stowed on the brow (closes G161).

## Two readings of "surround" (Michael to confirm)
1. **The device:** the 3D housing round the lenses on Wren's face (`head_kit.py`, a square shroud with a lip round both
   objectives). Seen in close-ups, the menu hero and over the shoulder.
2. **The screen:** the night-vision picture's eyepiece edge (`src/vfx/cinematicPost.ts`): it darkens the screen to 6 %
   outside a rounded window (`p *= mix(0.06, 1.0, smoothstep(0.8, 0.52, length(e)))`), a strong tunnel. CT's research
   notes say the overlays "slide over the HUD like a lens" (kit-design-digest 1.5); no binocular tunnel is recorded.

The plan covers both. Reading 2 is a small code change the laptop can make; reading 1 is the Blender job.

## Rules
- Prototype first (G4): only what is needed to see the goggle on Wren in game and in the menu.
- The glow is visual only: never a light, never seen by guards, the light meter and perception unchanged (bible L7).
- No external art; the goggle is generated offline by the in-repo Blender scripts (bible 5.14).
- Rigid kit stays rigid (G170): the housing, lenses and eyecups are skinned to the head bone only.
- Branch `feature/goggle`, folder `C:/NightShift/Mobile-Coop-goggle`; one PR to master; the orchestrator or Michael merges.
