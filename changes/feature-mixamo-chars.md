# Mixamo characters, slice a: the Test Chamber player plays Mixamo moves directly
- First slice of the full move to Mixamo (N52, N53: the hand-built animation system retires). In the Test Chamber the
  player is a Mixamo mannequin (X Bot in Wren's green) playing Mixamo's own moves through Babylon's animation groups:
  idle, walk, run, sprint, walk backwards, strafes left / right, crouch idle and crouch walk, blended by speed,
  direction and crouch (`src/characters/locomotion.ts`, `src/characters/mixamoBody.ts`). `?mixamochars=0` keeps Wren.
- Gameplay is unchanged: the hand-built rig still runs under the body for the camera, sockets, light meter and hit
  volumes. Known gap: the carried rifle and pistol still hang from the old rig's mounts (next slice).
- `scripts/mixamo/pack.mjs` packs Mixamo downloads (characters with skin, moves without skin) into one GLB per
  character through headless Blender 5.2.2; the glTF loader (`@babylonjs/loaders`) is added.
- New check `scripts/e2e-mixamo.mjs` (loads, hides Wren, idle / forward / crouch / crouch walk pick the right move).
