/**
 * (feature/weapons) Wren's hands for the rig's weapon holds (pure data). Measured from her hero skeleton
 * (build/operators/wren/wren-lods.blend, `wren-rig`) in the arm's hanging rest as the poser builds it (the forearm
 * chain swung down by its own direction, pose.ts): rig root frame (game frame: +X right, +Y up, +Z forward, metres).
 * - d: wrist to the centre of the four finger bases (knuckles), unit;
 * - n: the palm normal, out of the palm, unit;
 * - palm: the palm centre from the wrist joint (half way to the knuckles).
 * Michael 2026-10-19: "I'd rather the character holds the gun properly. Make sure they line up and are believable".
 */
import type { HandFrame } from '../player/handHold';

export const WREN_HANDS: { readonly L: HandFrame; readonly R: HandFrame } = {
  L: { d: [0.07779, -0.99681, 0.01766], n: [0.9529, 0.06913, -0.2953], palm: [0.00372, -0.04769, 0.00084] },
  R: { d: [-0.07779, -0.99681, 0.01766], n: [-0.9529, 0.06913, -0.2953], palm: [-0.00372, -0.04769, 0.00084] },
};

/**
 * (feature/weapons) Wren's thigh holster frame: the leg kit's `pistolHolster` anchor (leg_kit.py, every LOD file) from
 * her right hip joint, game frame. The holster shell was built round the sidearm with its extents centre (`centre`,
 * weapon frame, the pistol's extents when the kit was built) at `origin`, the bore along `z`, the slide's top along `y`;
 * the game's generic thigh slot sits 6 mm out, 9 mm up and 7 degrees off it, so the slide cut 20 mm into the shell.
 */
/**
 * (feature/weapons) Wren's back weapon mount: the receiver bar inlaid in her back plate (armour.py, `weaponMount.backL /
 * backC / backR` in every LOD file), from her chest joint, game frame: each keyhole socket's face (`origin`), the muzzle
 * direction (`up`, splayed for the side slots) and straight out from her back (`out`). A long gun's back stud
 * (weapons.json `backStud`) clicks into the socket: the gun hangs flat against the plate instead of standing off it.
 */
export const WREN_BACK_MOUNT = {
  backC: { origin: [0.00001, 0.03796, -0.07944], up: [0, 1, 0], out: [0, 0, -1] },
  backL: { origin: [-0.0727, 0.03577, -0.07443], up: [-0.0799, 0.9968, 0], out: [0, 0, -1] },
  backR: { origin: [0.07263, 0.03578, -0.07443], up: [0.0799, 0.9968, 0], out: [0, 0, -1] },
} as const;

export const WREN_HOLSTER = {
  origin: [0.11848, -0.25876, -0.00052] as const,
  x: [0.9913, -0.0569, 0.1189] as const,
  y: [-0.1191, 0, 0.9929] as const,
  z: [-0.0565, -0.9984, -0.0068] as const,
  centre: [0, -0.0175, 0.11775] as const,
};

/**
 * (anim-rig, docs/archive/anim-rework/RIG.md) Wren's sling sockets for a slung long gun, game frame, metres:
 * - `back`: from her chest joint, on the back plate's surface at the left shoulder blade (measured on her LOD0 and hero:
 *   the back-most chest-skinned vertex at 7.8 cm left, 12.3 cm up, its surface 9.6 cm behind the joint; 4 mm off it),
 *   where a sling's rear end anchors;
 * - `hip`: from her pelvis joint, the belt's quick-detach `slingSocket` anchor (waist_belt.py, every LOD file; D28: left
 *   hip about 8 o'clock), where the sling's front end clips when the gun hangs under the arm.
 * The player rig's `slingBack` / `slingHip` nodes take these (playerFigure.ts); their rotations stay their parents'.
 */
export const WREN_SLING = {
  back: [-0.078, 0.123, -0.1] as const,
  hip: [-0.1349, 0.045, -0.069] as const,
};

