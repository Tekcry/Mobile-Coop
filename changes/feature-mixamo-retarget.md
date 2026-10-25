# Mixamo motion capture in the Anim Studio
kind: minor
- 21 Mixamo motion-capture moves on Wren's rig, listed in Main menu > Anim Studio (dev) > "Motion capture" as
  "Motion capture (Mixamo): <name>" and tunable there like the CMU captures (Body > Joints, Hands & feet, Limb reach):
  idle, crouched walk, stance changes, carry, crawl, strikes, kneel, team pull, lift, hang, shimmy, ladder, climb-ups.
- The Now playing line names the capture source ("motion-capture (CMU) walk"); one source table for every capture.
- Offline pipeline: headless Blender dump of the downloaded takes, Mixamo bone map onto Wren (spine and chest checked
  under 8 degrees on every take), keyed and traversal clip emitters; CMU clips unchanged. Credits in
  `docs/art-credits.md`. In-game use comes in later PRs behind the `mixamo` flag.
