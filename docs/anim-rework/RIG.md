# Rig extension (anim-rig)

The animation rework brief (`BRIEF.md` section 6): "Extend the rig where it blocks believable motion (toe joints, a wrist
frame for the knee hand, a sling attachment), and say what it costs." CT Core's spec: `docs/ct-prototype/G8-PLAN.md`
"Rig limits and extensions". Job: `docs/anim-rig/` (report: `docs/anim-rig/REPORT.md`).

## What was added

### Toe joints (one per foot)
- Wren's LOD files already carried `toeL` / `toeR` as skin joints (children of the ankles, at the ball of the foot), but
  nothing was weighted to them: `bake_lods.py` folded the hero's toe weights into the ankle, so the foot was rigid and a
  heel-to-toe roll pivoted the whole foot about its toe (`TOE_BALL`), the toe box going into the floor.
- Export: `scripts/operators/py/bake_lods.py` now skins the toes to `toeL` / `toeR` (`GAME_JOINTS` 17 -> 19,
  `game_joint` maps the hero's `toesL_*` / `toesR_*` to them). The shipped LOD0-2 are a full rebake (2026-10-20, MPFB2
  2.0.18 CC0 data from the official extension zip, `docs/operators/MPFB2.md`): the toe box bends at the ball (the ball
  joint is 13.4 cm ahead of the ankle). Against the first stand-in (`scripts/operators/toe-skin.mjs`: each ankle vertex
  took the toe share of its nearest hero vertex) the rebake changes only the ankle / toe split on 71 (LOD0), 49 (LOD1)
  and 2 (LOD2) vertices (up to 0.78 of a weight), adds the `slingBack` anchor (chest) and re-bakes the textures;
  positions, UVs, normals, rigid parts and the other anchors are identical (tangents within 1e-4). The hero file is kept
  as it was (anim-rig A8: it would only gain the anchor; its per-toe bones were already skinned). `toe-skin.mjs` stays
  for LOD files baked before anim-rig (a no-op on these: "already skinned").
- Runtime map: `RIG_JOINTS` / `RIG_PARENT` (`src/operators/runtime/pose.ts`) and `REQUIRED_JOINTS` (`manifest.ts`) list
  the toes; `RigLike` / `rigNodes` (`figure.ts`) read them; `CharacterRig` builds `toeL` / `toeR` under the ankles at the
  ball (on the floor, 45 % of the foot length ahead, as `operatorBody.ts`'s toe joint). The poser now drives the LODs'
  toe slots (and the hero's per-toe bones under them) from the rig's toe nodes instead of the ankles.
- Pose: `toePitch` (`src/anim/toeRoll.ts`, pure) turns the planner's foot pitch into the toe joint's pitch: a planted foot
  rolled onto its ball (`pitch` > 0) bends the toes up by the same angle (clamped at 1.05 rad), faded over the first 0.3
  of the swing as `heelLift` fades the raised heel; flat or heel-first (`pitch` <= 0): straight; in the air or
  traversing: straight. `CharacterRig.applyTargets` feeds it with two lines after the legs' first solve (one per foot).

### Wrist frame in the key format
- Keys (`scripts/anim-keys/keys/<clip>.json`): an arm may carry `"wrist": { "yaw": .., "pitch": .., "roll": .. }`
  (degrees), local to the forearm: the rig's wrist node under its elbow node, whose frame is `boneRotation`'s (-Y along
  the forearm toward the hand, +Z toward the body's front). `yaw` twists the hand about the forearm, `pitch` (+ the
  fingers back with the arm hanging) and `roll` (+ the fingers out, away from the midline) swing it. Written for the
  right hand; the left is mirrored (yaw and roll negated), so a mirrored key swaps the arms as they are.
- Bake (`scripts/anim-keys/py/key_clip.py`, `build.mjs`): when any key carries a wrist, every sample carries `wrist`
  (8 floats: L then R local quaternion) and the clip module gets a `wrist: [...]` line; otherwise nothing changes (the
  walk re-baked byte for byte).
- Sampler (`src/anim/keyed.ts`): `KeyedClipDef.wrist` is optional; `KeyedPose.wrist` (8) and `hasWrist`. A clip
  without it samples identity and `hasWrist` 0, the pel / q / arm outputs exactly as before (proved against a fixture
  taken from the old sampler, `tests/fixtures/keyed-walk-before.json`). Wrist frames are nlerped and scaled about their
  mean like the trunk quaternions.
- Rig: `keyedArm` slerps the free hand's wrist (identity from the arm solve) to the keyed frame by the keyed arm weight,
  only when the clip keys one. The walk keys none, so it plays unchanged.

### Sling sockets
- `CharacterRig.slingBack` (on the chest, at the left shoulder blade) and `slingHip` (on the pelvis, at the left hip):
  named TransformNodes with their parents' rest frame (+X right, +Y up, +Z forward).
- Wren's own positions (`WREN_SLING`, `src/operators/handFrame.ts`, the pattern of `WREN_BACK_MOUNT` / `WREN_HOLSTER`):
  `back` (-7.8, 12.3, -10.0) cm from the chest joint, 4 mm off the back plate's surface measured on her LOD0 and hero;
  `hip` (-13.5, 4.5, -6.9) cm from the pelvis joint, the belt's quick-detach `slingSocket` anchor already in every LOD
  file (D28, about 8 o'clock). `operatorRig` (playerFigure.ts) moves the player rig's nodes onto them. Generic rigs
  (guards) keep a default offset from their proportions.

## Cost

| LOD | Skin joints before / after | Weighted joints before / after | GLB bytes before / after (rebake) |
| --- | --- | --- | --- |
| hero | 63 / 63 | 57 / 57 (its per-toe bones were already skinned) | 57,320,384 / 57,320,384 (unchanged) |
| LOD0 | 23 / 23 | 17 / 19 | 18,645,832 / 18,354,460 |
| LOD1 | 23 / 23 | 17 / 19 | 5,156,148 / 5,070,872 |
| LOD2 | 23 / 23 | 17 / 19 | 2,518,968 / 2,487,312 |

Toe-weighted vertices (weight > 0), rebake: LOD0 926 + 968, LOD1 165 + 157, LOD2 39 + 38 (L + R). The byte changes are
the re-baked KTX2 textures and the anchor node, not the skin.

- GPU: nothing more. The skeletons already had a bone per toe joint (23 bones per game LOD), skinning stays 4
  influences a vertex; the bone matrices uploaded per frame are the same count.
- CPU per character per frame (measured, Node 24 on the desktop, vitest): the poser's solve with the two extra rig joints
  1.91 us in all (the two joints are about 0.1 us of it); each toe node's quaternion and world matrix 0.25 us, so
  0.5 us for both. In all well under 1 us (< 0.001 ms) a character a frame. No allocation (fixed temporaries, the
  poser's typed arrays).
- Sling sockets: two TransformNodes per rig (a world matrix each when something reads them): about 0.2 us each when read.
- Wrist frame: one slerp per free arm on frames where a clip keys a wrist; nothing otherwise.

## How weapon code would use the sling socket
- Parent the slung gun's sling attachment frame to `rig.slingBack` (rear end) and let the gun hang from `rig.slingHip`
  (front clip) or between both: e.g. `gun.parent = rig.slingHip` with the gun's own sling-swivel offset, or a two-point
  sling solved each frame from `slingBack.getAbsolutePosition()` and `slingHip.getAbsolutePosition()` (the strap) with
  the gun's muzzle down under the arm (BRIEF section 1: "The rifle hangs from a sling under the arm").
- The nodes follow the chest and pelvis (breathing, the gait, crouch), so a slung gun moves with the body without new
  pose code. The carried-gear hook (`CharacterRig.onPosed`, "a sling pushed by the thigh") can then push it clear of
  the legs. Nothing is parented to them yet (weapon code is another job's).

## How a clip authors a wrist frame
In the clip's key file, per key that needs it, add `wrist` to `armL` and / or `armR`:

```json
"armR": { "flex": 20, "abd": 6, "elbow": 70, "inward": 25, "wrist": { "yaw": -80, "pitch": 0, "roll": 25 } }
```

Key it on every key of the clip (a key without it is identity, and the curves interpolate between the two), rebake
(`node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs <clip> --preview`; Blender headless,
under the heavy lock) and check the preview strips: the hand capsule follows the wrist. The knee hand (palm down,
fingers forward over the knee) is the first clip expected to use it (G8-PLAN "Order" step 2).
