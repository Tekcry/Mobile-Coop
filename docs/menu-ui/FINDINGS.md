# Findings from the 2026-10-15 menu mockup session

Renders made on Michael's PC (RTX 4090 Laptop GPU, ANGLE D3D11, `E2E_GPU=1`, port 4195) from detached worktrees of
`feature/ct-locomotion` at c1c86d5 (locomotion 15) and 911f51b (locomotion 16). Nothing was committed to that branch.
Local output: `C:\NightShift\menu-mock\` (index.html is the contact page).

## The mock patch ([menu-mock.patch](menu-mock.patch))
- `?menuScene=<id>` restages `src/world/menuScene.ts` (MenuState) with `src/world/menuMock.ts`: primitive set
  pieces, hard spot lights (shadow casters first), visible beams, the tri-lens glow, the operator posed from
  `RigPose` fields plus world grips (`reachL/R`, `plantL/R`, `wallHand`) measured in game on Proving.
- Ids: `1`-`6` solo holstered, `1a`-`6a` aiming, `c1`-`c6` co-op (partner in an olive suit), `7` armory studio
  (`&menuWeapon=<id>&menuView=side|q|hip`, campaign-issued attachments). Add `&voxels=0` for the smooth operator.
- Scenes: 1 inverted pipe under a lamp, 2 split brace lit from below, 3 brick wall edge with a window-blinds gobo,
  4 backlit door peek, 5 rappel with moonlight and rain (vfx Weather), 6 roof ledge with water tower and searchlight.
- `scripts/anim-sheet.mjs` was extended (scenarios split, splitaim, wallkick, pipelegs, pipeinv, rappel, brace,
  doorpeek, strike, draw, holster, thermal, electro; `SHEET_PARAMS`, `SHEET_CUT` near-clip cut, `SHEET_DUMP` pose dump).
- Screenshot scripts (local): `C:\NightShift\menu-mock\mockshots.mjs`, `arsenal.mjs`, `run-sheets.sh`, `probe.mjs`.
  Each render took about 2.5 s; a 12-frame contact sheet about 7.6 s.

## What reads best (for session 4's shot list)
- Silhouettes: 4 door peek (dark figure in the doorway light, long shadow to the camera), 3 wall edge with blinds
  (slatted light over body and wall), 1 inverted pipe (big upside-down shadow on the back wall). Runner-up 5 rappel.
- Aiming / co-op: 3a rifle lean-out, c3 wall stack, c4 door stack, c6 sniper and spotter, c2 split above a crouched
  rifle.
- The operator is low detail (smooth or voxel): tight face close-ups do not work. Use medium / wide framings, rim
  light, big shadows, the goggle glow.
- `gfx=low` looked close to epic in the menu stage (it keeps the shadow casters and the voxel operator), so it is not
  a true phone-look preview.

## Animation problems seen (for the locomotion run's play-check notes; that run owns the fixes)
- Aim from attached states does not apply from pose inputs: split (pistol stays upright at the face), rappel (torso
  and arms knot), inverted pipe (pistol barely reads, arms fold to the head). Locomotion step 25 covers aim from
  attached states.
- Back-to-wall stands a few cm off the wall with the head leaning out; door-peek and wall-edge grips off (A47 / D9
  deviations carried to step 27).
- Holstered crouch: arms akimbo, elbows out (A42 ready hands while holstered); reads oddly in silhouette. No step
  names it: add to the play-check notes.
- Split brace from the front: arms and legs straight out (a T shape). Pipe legs-up sheet framing cut the torso (camera,
  not the pose). Brace was forced without a partner (no partner grips).
- Pistols are held in the rifle's hunched shoulder stance (no pistol aim posture): step 25 (weapon batch).

## Campaign arsenal (locomotion 16, 911f51b)
No new models: six of the 16 existing weapons curated and renamed. Primary: Heron Carbine (`rifle`, default, issued
with the suppressor), Marten 9 SMG (`smg`), Mason 12 Pump (`shotgun`), Spotter 7.62 Marksman (`dmr`). Sidearm: Hush 9
SD (`pistolSd`, default), Warden .45 (`pistol`). Renders: `C:\NightShift\menu-mock\arsenal\` (side and 3/4, smooth
and voxel).
