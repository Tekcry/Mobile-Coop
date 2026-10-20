# G8 plan: keyed gait clips (2026-10-20)

Michael (10:25): "You have all walking videos from CT, why cant we match it" ... "Yes, keyframed clips". The
procedural gait cycles stay as the fallback and the blending layer; the look of each gait comes from a keyed clip
authored pose by pose. Walk first as the proof; Michael judges it before jog, run, crouch walk, crouch idle and the
wall knee hand. Before numbers and sheets: `G8-REPORT.md`, `shots/g8/before/`.

## IP
The footage is reference only. Every key is typed by hand, by eye against the footage frames and the measured numbers
(track width, knee and elbow separation, swing, bob, sway, lean, timing). No pose estimation, no tracking, no motion
data taken from the video. The clips are ours.

## Pipeline (all in repo, headless, no downloads)
1. `node --import ./scripts/operators/ts-resolve.mjs scripts/operators/export-joints.mjs` (existing): Wren's bind
   joints from `src/player/proportions.ts` -> `build/operators/joints.json` (not committed).
2. `scripts/anim-keys/keys/<clip>.json` (committed, hand-written): the key poses. Each key is a cycle phase (left heel
   strike 0, right 0.5) with the pelvis offset (cm) and the absolute body-frame angles (deg) of pelvis, spine, chest and
   neck, and per arm shoulder flex / abduction / elbow flex, per leg hip flex / adduction / knee / ankle. Keys from 0 to
   0.5 are mirrored onto the right side unless written.
3. `scripts/anim-keys/build.mjs <clip>` runs `scripts/anim-keys/py/key_clip.py` in Blender 5.2.2 with
   `-b --factory-startup` through the existing `scripts/operators/blender.mjs` (pinned version check). The script
   builds Wren's armature from the joints (as `build_skeleton.py`), poses every key by forward kinematics in the game
   frame, keys the bones (quaternions, Bezier, cyclic), saves `build/anim-keys/<clip>.blend` (open it to look or tweak)
   and samples the evaluated armature at 32 frames per cycle. It also renders a side and a front preview strip of the
   keyed pose (Workbench, capsules on the bones) to `build/anim-keys/<clip>-side.png` / `-front.png`.
4. `build.mjs` writes the samples to `src/anim/clips/keyed/<clip>.ts` (generated, committed, bundled): plain number
   arrays, read once into Float32Arrays at module load.

## Clip format (`src/anim/keyed.ts`, pure, Babylon-free, Vitest)
Per frame (32 a cycle) in the body frame at 1.75 m (scaled by the rig's height): the pelvis offset from rest (3), the
local quaternions of pelvis, spine, chest, neck (16), each elbow and wrist relative to its shoulder joint in the chest
frame (12), each ankle's lateral offset and knee bow (4); per clip the planner's duty and swing lift. `sampleKeyed(clip,
phase, amp, out)` lerps / nlerps two frames into a preallocated `KeyedPose`: no allocation per frame. `amp` scales the
cycle about its mean (a slow walk swings less).

## How the graph and the rig play it
- `AnimGraph` samples the clip on its own gait phase (the same clock the procedural cycle uses, owner and remote) and
  gives a weight `keyW`: standing, moving, at walk pace (full to 1.6 m/s effort pace, gone by 2.3), on foot (no wall,
  traversal, air, slide, tense sneak, aim raise); `keyArmW` also needs free hands (holstered, no grip, no melee, no
  reach). It blends the stance half-width and the planner's duty / lift toward the clip's.
- `CharacterRig` keeps everything procedural first (foot planner, world-locked feet, slopes and stairs, pelvis drop for
  reach, turning follow, head look), then blends toward the clip: pelvis offset and rotation (with the turn follow),
  spine, chest, neck by slerp; the arms by solving shoulder and elbow rotations onto the keyed elbow and wrist points
  (the rig's own bone frame convention, so the hands keep their orientation); the knee pole from the clip's knee bow.
  The trunk clearance (`keepElbowOut`) still runs after. Speed matching is the planner's (stride from speed, the clip
  is phase-normalised); turning, banking and the stop / start clips stay procedural on top.
- Clipping guards keep running unchanged (knees >= 9 cm apart, elbows off the trunk, foot lock).

## Network parity
No wire change (PROTOCOL_VERSION 24). A remote's rig runs the same graph from MoveState (speed, crouch, stride, gait
clock from distance), so it samples the same clip at the same weight.

## Rig limits and extensions (cost)
- No toe joint in the game LODs (17 game joints; the hero LOD's toe bones are not exported): the foot is rigid, so a
  heel-to-toe roll can only pivot the whole foot about the toe tip (`TOE_BALL` lift). A toe joint per foot: the LOD
  export (`bake_lods.py` joint list, the skin weights of the toe box), `CharacterRig` (2 nodes, toe pitch from the
  planner's roll) and `operatorBody.ts`; about half a day plus a LOD rebuild (heavy, desktop).
- The wrist has no keyed frame yet: a free hand continues the forearm (wrist identity). The wall knee hand's palm points
  up because its forearm comes down onto the knee and the hand follows it. Fix with a keyed wrist frame (palm down, the
  fingers forward over the knee) in that clip: no rig change, about 1 h.
- No finger bones in game (grip morphs only) and no shoulder girdle bones (the shoulder joint slides): enough for the
  gait; noted for the knee hand and the grab poses.

## Order
1. Walk (proof, this slice): keys, Blender bake, runtime, GPU sheet, side by side in `shots/g8/walk-proof/`. Stop.
2. After Michael's verdict: jog, run, crouch walk, crouch run (same format), crouch idle (a still pose cycle with a slow
   breath), the wall knee hand (keyed wrist frame).
