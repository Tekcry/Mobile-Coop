/**
 * (rig-pose-fix S2, audit G6) Where a player's round starts, from the SIM, not from the animated muzzle.
 *
 * Every player round (ray and projectile), the wall-poke fallback and the client's claimed origin (`shot` ox / oy / oz)
 * used to start at `WeaponModel.muzzleWorld` (the gun on `rig.weaponPivot`) and test the barrel against walls from
 * `rig.headNode`: mocap, the tuner's gun sliders, the draw / glide poses and the frame rate moved them, and the fixed
 * step read the last rendered pose. This module gives the origin from sim state alone: the feet, the crouch blend, the
 * lean, the shoulder side, hanging inverted, the aim direction and the weapon's own muzzle point (`WeaponDef.muzzle`,
 * after attachments: a suppressor lengthens the barrel). The animated muzzle stays for the tracer, flash and casing.
 * (rig-pose-fix S3) The wall-poke test's eye is no longer fitted here: it is the one sim head, S1's body model
 * (`playerVolumes.playerBody`, `PlayerTarget.body.head`, also the hit volume's and the light sample's head). S2's own
 * head fit (to the rig at rest, no tuner base) sat 6-15 cm from it in the aimed stances and up to 44 cm at the pitch ends.
 *
 * The model, in the aim's frame (yaw from the aim direction; r right, u up, f forward along the level aim):
 *   origin = feet + B(c, p, lean, side) + dir * muzzleZ + up(p) * muzzleY
 * c = crouch 0..1, p = aim pitch (rad, clamped to the camera's -1.2 .. 1.05), up(p) = the aim's up (the bore's
 * up). B is cubic in p with crouch cross terms; the r row flips with the side (1 right shoulder, -1 left)
 * and adds the lean (the rig bends sideways, hips planted); the u / f rows add |lean|.
 * Fitted (least squares, 1 mm rounding) to Wren's rig at rest (NullEngine, `operatorRig`'s build, hands and carrier
 * set, aimed: `aim` 1, `carry` low): rifle and suppressed pistol, both sides, crouch 0 / 0.5 / 1, pitch
 * -1.2 .. 1.05 in 9 steps, lean 0 / +-0.2 (the wall peek's `WALL.peekLean`). Residuals vs the rig muzzle / head node
 * (`tests/shotOrigin.test.ts` holds them): rifle muzzle max 3.2 cm (rms 1.4), pistol max 7.9 cm (rms 2.6: the body
 * clearance pushes the low pistol out 6 cm between pitch -0.3 and -0.6); the aim turned and the
 * in-between stances (not fitted) 1.6 / 3.8 cm.
 * Inverted (an inverted pipe, the hang-down; tumble pi, the pistol aimed in world space): its own quadratic in p
 * (max 0.6 cm muzzle at the aim's centre; the body does not turn with the aim inside its yaw range).
 * Not fitted: the gait (moving aimed), the split / rappel / hostage holds (the upright tables), long guns other than
 * the rifle (the rifle table). The sweep is `tests/shotOrigin.test.ts` with `SHOT_ORIGIN_SWEEP=<file.tsv>`.
 *
 * Pure: no Babylon, no rig. Writes `out` in place (no allocation).
 */

export interface P3 {
  x: number;
  y: number;
  z: number;
}

/** The sim inputs (reuse one object). */
export interface ShotPose {
  /** Feet (the controller's sim position, not the render-interpolated one). */
  x: number;
  y: number;
  z: number;
  /** Crouch blend 0..1. */
  crouch: number;
  /** Lean around an edge (rad, + right; `PlayerPose.lean`). */
  lean: number;
  /** Shoulder / hand side: 1 right, -1 left. */
  side: number;
  /** Hanging upside down (inverted pipe, hang-down): the inverted table. */
  inverted: boolean;
  /** One-handed sidearm hold (class 'pistol'); else the long-gun (rifle) table. */
  pistol: boolean;
  /** Aim direction (unit). */
  dx: number;
  dy: number;
  dz: number;
  /** The weapon's muzzle point in the weapon's frame (`WeaponDef.muzzle` [1] and [2]: height over the bore line, length). */
  muzzleY: number;
  muzzleZ: number;
}

export function emptyShotPose(): ShotPose {
  return { x: 0, y: 0, z: 0, crouch: 0, lean: 0, side: 1, inverted: false, pistol: false, dx: 0, dy: 0, dz: 1, muzzleY: 0, muzzleZ: 0 };
}

/** The pitch range the tables were fitted over (the camera's `minPitch` / `maxPitch`). */
export const SHOT_PITCH_MIN = -1.2;
export const SHOT_PITCH_MAX = 1.05;

type Row10 = readonly [number, number, number, number, number, number, number, number, number, number];
type Row9 = readonly [number, number, number, number, number, number, number, number, number];
type Row3 = readonly [number, number, number];

/** One upright table: r (side x [1, c, p, c2, cp, p2, p3, cp2] + [lean, lean c]); u, f ([1, c, p, c2, cp, p2, p3, cp2, |lean|]). */
interface Table {
  r: Row10;
  u: Row9;
  f: Row9;
}

/** The gun's base (muzzle minus the barrel along the aim), upright. */
export const SHOT_BASE: { rifle: Table; pistol: Table } = {
  rifle: {
    r: [0.19, 0.007, -0.032, 0, 0.004, -0.008, 0.001, -0.001, 0.416, -0.263],
    u: [1.424, -0.847, 0.112, 0.385, 0.124, -0.161, -0.036, 0.047, -0.011],
    f: [0.334, -0.005, -0.321, 0.005, 0.078, -0.146, 0.033, -0.029, -0.002],
  },
  pistol: {
    r: [0.139, 0.006, -0.056, 0.01, -0.002, 0.017, 0, 0.006, 0.444, -0.288],
    u: [1.453, -0.865, 0.158, 0.389, 0.119, -0.202, -0.044, 0.064, -0.156],
    f: [0.487, -0.023, -0.168, -0.002, 0.131, -0.216, 0.001, -0.006, 0.003],
  },
};

/** Inverted (pistol): r (x side), u, f as [1, p, p2]. */
export const SHOT_INV: { base: readonly [Row3, Row3, Row3] } = {
  base: [
    [-0.131, -0.02, 0.012],
    [-0.55, 0.094, 0.274],
    [0.483, 0.176, -0.206],
  ],
};

/** Offsets in the aim frame (r, u, f), written by `frameOffset` (module scratch: no allocation). */
const off = { r: 0, u: 0, f: 0 };

function q8(t: Row9 | Row10, c: number, p: number): number {
  const p2 = p * p;
  return t[0] + t[1] * c + t[2] * p + t[3] * c * c + t[4] * c * p + t[5] * p2 + t[6] * p2 * p + t[7] * c * p2;
}

function frameOffset(s: ShotPose, p: number): void {
  const side = s.side < 0 ? -1 : 1;
  if (s.inverted) {
    const t = SHOT_INV.base;
    const p2 = p * p;
    off.r = side * (t[0][0] + t[0][1] * p + t[0][2] * p2);
    off.u = t[1][0] + t[1][1] * p + t[1][2] * p2;
    off.f = t[2][0] + t[2][1] * p + t[2][2] * p2;
    return;
  }
  const t = SHOT_BASE[s.pistol ? 'pistol' : 'rifle'];
  const c = Math.max(0, Math.min(1, s.crouch));
  const l = s.lean;
  const al = Math.abs(l);
  off.r = side * q8(t.r, c, p) + t.r[8] * l + t.r[9] * l * c;
  off.u = q8(t.u, c, p) + t.u[8] * al;
  off.f = q8(t.f, c, p) + t.f[8] * al;
}

/** The aim's yaw frame and clamped pitch from the direction (a straight up / down aim keeps +z as forward). */
const fr = { fx: 0, fz: 1, sp: 0, cp: 1, p: 0 };

function aimFrame(s: ShotPose): void {
  const h = Math.sqrt(s.dx * s.dx + s.dz * s.dz);
  if (h > 1e-6) {
    fr.fx = s.dx / h;
    fr.fz = s.dz / h;
  } else {
    fr.fx = 0;
    fr.fz = 1;
  }
  const len = Math.sqrt(h * h + s.dy * s.dy) || 1;
  fr.sp = s.dy / len;
  fr.cp = h / len;
  fr.p = Math.max(SHOT_PITCH_MIN, Math.min(SHOT_PITCH_MAX, Math.asin(Math.max(-1, Math.min(1, fr.sp)))));
}

/** Where the round starts (world): the sim muzzle. Writes `out`. */
export function shotOrigin(s: ShotPose, out: P3): P3 {
  aimFrame(s);
  frameOffset(s, fr.p);
  // right = (fz, -fx) (Babylon: +x right of +z)
  const rx = fr.fz;
  const rz = -fr.fx;
  // the barrel along the aim, the muzzle's height along the aim's up (-sin p forward, cos p up)
  const along = s.muzzleZ;
  const upk = s.muzzleY;
  out.x = s.x + rx * off.r + fr.fx * off.f + fr.fx * (fr.cp * along - fr.sp * upk);
  out.y = s.y + off.u + fr.sp * along + fr.cp * upk;
  out.z = s.z + rz * off.r + fr.fz * off.f + fr.fz * (fr.cp * along - fr.sp * upk);
  return out;
}
