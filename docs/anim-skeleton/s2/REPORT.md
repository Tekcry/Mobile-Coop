# anim-skeleton S2 - runtime rig report (2026-10-21)

## Built
- Rig (`src/player/characterRig.ts`, rig parts only; B's row code untouched): `clavL` / `clavR` nodes under the chest
  at the SC points from `scripts/anim-skeleton/skeleton.json` (`src/anim/clavicle.ts`), placed off the rig's own chest
  and neck, identity rest; named after the skin joints so the poser maps them by name. Input slot `rig.clavIn` (per side
  pitch / yaw / roll, degrees, chest frame) for S3 / S4; tests and the GPU shot set it directly. `clavFrame()` runs just
  before the arm solves.
- Fingers (`src/anim/fingers.ts`, pure, no extra TransformNodes): curl 0..1 (clamped -0.25..1.2) -> MCP / PIP / DIP
  80 / 95 / 65 deg; thumb CMC opposition / MCP / IP 35 / 40 / 45; spread -1..1 = +-30 deg. The rig builds
  `rig.fingers` at the end of each frame from the hand shapes for `handGrip` (relax blended toward trigger, wrap or
  support), plus the Hands & feet finger values (read-only; base table plus tuner delta on every Wren rig, like B's
  other rows; the mean curl already in `handGrip` is taken
  out so each finger gets its own curl; spread = degrees / 30), plus the S3 slot `rig.fingerClip`.
- Poser (`src/operators/runtime/pose.ts`): `RIG_JOINTS` gains `clavL` / `clavR` (parent chest); an identity clavicle
  copies the chest's rotation instead of multiplying. Per-slot extras (`extraQ` in the bind frame chained down the
  finger segments, `extraT`, `extraOn`); slots without extras run the old code path.
- Figure (`src/operators/runtime/figure.ts`): `rigNodes` adds the clavicles; `readRig` fills missing joints with the
  identity and removes a turned clavicle's shoulder shift so the skin's clavicle joint does not count it twice; finger
  rotations rebuilt only when one of the 20 values changes; goggle joints take their offset through the extras; files
  with finger joints (hero, LOD0, LOD1) leave the grip / wrap / relax morphs at 0 (A9).
- S1 polish: the hero is in the poser equivalence test (`tests/animSkeletonAsset.test.ts`).

## Clavicle design
`shL` / `shR` stay children of the chest, so with every clavicle input at zero no rig world matrix changes. A turned
clavicle rotates the shoulder's rest point about the SC point inside `solveArm`'s protraction block (the old `-0.01`
became `rz`, the same value when untouched); the arm IK reaches from the moved shoulder, so the hands stay on the gun.
The Joints "shoulder" offset still acts on `shL`. The skin's `clavL` joint gets the chest rotation times the clavicle
rotation.

## Goggle read point (told to CT Core)
`CharacterRig.goggleFrame()` (characterRig.ts ~1749), called at the end of `animateFrame` (~1718), inside `animate`'s
`tuneRigBegin` / `tuneRigEnd` window (~1459-1463), copies `GOGGLE_OFFSET` into `rig.goggleOff`.
`OperatorFigure.update` -> `goggleOffset()` (figure.ts ~693) applies it for the figure's own goggle pose. Local player:
player.ts 554 animate, 557 tuneEnd, 575 figure.update. Partner: remoteAvatar.ts 473 animate, 530
`partnerFigureFrame`. A test shows two rigs keeping different offsets.

## Finger mapping
`fingerS_K_J`: K 1 thumb .. 5 little; J 1 MCP .. 3 DIP. Layout `[hand L, R][finger][curl, spread]`. Bend about local
+Z (right hand) / -Z (left), axes fitted to the hero's grip morphs; spread about local X, + away from the middle finger
(the middle finger toward the index); the thumb's axes fitted per joint, spread about local Z away from the index. A
test checks that a bone curl moves each fingertip the way the morph does, for all 10 fingers.

## Bit identity (A5)
`tests/helpers/animSkeletonIdentity.ts` ran on the untouched 4e3cbbda code (`ANIM_SKELETON_CAPTURE=1`) and wrote
`tests/fixtures/anim-skeleton-identity.json` (94 KB): per step, hashes of the world matrix and local TRS of the 21
pre-T3 joints plus each LOD's poser output for its pre-T3 slots (hero fingers included), over the 28 keyed clips, 10
procedural states and a partner sequence driven as `RemoteAvatar.update` poses it; `Math.random` seeded (the idle
clock). `tests/animSkeletonIdentity.test.ts` passes: every hash equal.

## Numbers (node, Wren rig with rifle walking, median of 5)
| | before | after |
| --- | --- | --- |
| rig.animate | ~55 us | ~49 us (noise) |
| figure.update LOD0 | ~6.9 us | ~9.2 us |
| poser.solve LOD0 / hero | 3.65 / 4.1 us | 4.1 / 4.6 us |

## Checks
- `npm run check`: pass (222 files, 2 416 tests, build OK).
- e2e (desktop lock, E2E_JOBS=1, port 4191): e2e-anim, e2e-studio, e2e-netmove, smoke pass.
- GPU (E2E_GPU=1, port 4189, `?gfx=high`, LOD0): `wren-lod0-rifle-grip.webp` (both hands closed on the rifle by the
  bones), `wren-lod0-s2-rest.webp` (all S2 inputs 0), `wren-lod0-s2-shrug-fingers-goggle.webp` and
  `wren-lod0-s2-body.webp` (left shrug, right shoulder forward, goggle 2 cm up), `wren-lod0-s2-hand-right.webp`,
  `-hand-left.webp`, `-hand-left-rest.webp` (per-finger curls and spread). Helper `scripts/anim-skeleton/gpushot.mjs`.

## Files
New: `src/anim/fingers.ts`, `src/anim/clavicle.ts`, `tests/animSkeletonRig.test.ts`,
`tests/animSkeletonIdentity.test.ts`, `tests/helpers/animSkeletonIdentity.ts`,
`tests/fixtures/anim-skeleton-identity.json`, `scripts/anim-skeleton/gpushot.mjs`, the shots. Changed:
`src/player/characterRig.ts`, `src/operators/runtime/pose.ts`, `src/operators/runtime/figure.ts`,
`tests/animRig.test.ts` (clavicles are rig joints, not figure joints), `tests/animSkeletonAsset.test.ts`,
`tests/operatorsRuntime.test.ts` (clavicle rest offsets).

## Open
- Hero hands now take their shapes from the finger bones, not the grip morphs (A9); `HAND_SHAPES` are a first fit to
  the morphs, not tuned.
- A turned clavicle moves the shoulder point and the arm IK re-aims; keyed arms keep their chest-frame rotation.
- The Proving shots are dark; the studio light would show the fingers better.
