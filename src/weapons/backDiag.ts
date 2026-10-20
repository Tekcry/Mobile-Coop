/**
 * (CT prototype G2, AUDIT-AIM rows 1-3) The diagonal back sling and its draw / holster turn (pure, Babylon-free,
 * unit-tested in tests/backDiag.test.ts).
 *
 * CT slings the rifle across the back: the stock at the right shoulder blade, the muzzle down to the left hip, flat on the
 * back (053525 35-36.8, 053709 34.5-38, 054237 8-9, 034747 1.0). It replaces the vertical, muzzle-up centre slot (the
 * barrel stood about 0.3 m above the helmet: ceilings, ducts and door frames, and the holster arc over the head).
 *
 * Frames are in the chest (torso) frame: x right, y up, z forward, metres and radians. A gun frame is its axes in that
 * frame: `x` its right side, `y` its top, `z` its bore (muzzle). Flat on the back the gun's right side faces the wearer
 * (x = +z) and its top up-left, so the grip and magazine hang down-right, toward the right hand.
 */

export const BACK_DIAG = {
  /** Bore angle from straight down, toward the left (rad): about 38 deg (CT about 45 deg with a shorter gun). */
  angle: 0.66,
  /** The grip point (weapon `grip`) on the back, chest frame x / y: at the bottom of the right shoulder blade (G2 render round 1: 0.11 put the stock 14 cm over the shoulder, in the pistol OTS view). */
  grip: [0.12, 0.0] as const,
  /** Gap (m) between the gun's right side and the back plate. */
  gap: 0.015,
};

/**
 * The turn of a draw / holster of the diagonal gun, over the travel's turn parameter r 0..1 (the gun's grip follows its
 * own path, WeaponModel.travel):
 * - draw: the bore sweeps in the plane of the back round the RIGHT side (down-left, down, right, up: never across the
 *   back of the head) as the grip comes off the blade to behind the right shoulder (`sweep`), the gun twists about the
 *   bore so its top faces back (`twist`), and comes forward over the shoulder muzzle up, then tips down onto the line
 *   (to the aim pocket): CT 105845 3.37-3.57, muzzle up at the right shoulder, then down onto the sight line.
 * - holster: the reverse order, but the muzzle goes DOWN from the line beside the right hip (never up over the head:
 *   AUDIT-AIM row 2), twists flat to the back and swings the last 38 deg into the sling.
 */
export const DIAG_TURN = {
  draw: { sweep: 0.4, twist: 0.55 },
  holster: { down: 0.4, twist: 0.6 },
};

/**
 * (G2 fix r1) Whether a travel to / from `slot` uses the keyed diagonal turn: every holster to the centre slot (it starts
 * from wherever the gun is), but a draw only from the slung gun (`fromSlot`). A draw reversed mid-holster starts in front
 * of the body: it slerps straight back to the pocket instead (the keyed draw would snap it to the sling and sweep it).
 */
export function useDiagTurn(slot: string, draw: boolean, fromSlot: boolean): boolean {
  return slot === 'backC' && (!draw || fromSlot);
}

/** Which part of the turn r is in: 0 the in-plane sweep (angle `theta`), 1 a slerp between two keys at `t`. */
export interface DiagTurnStep {
  /** 0: the in-plane frame at `theta`; 1: slerp `from` -> `to` by `t`. */
  kind: 0 | 1;
  theta: number;
  t: number;
  /** Keys (kind 1): 'slot' / 'pocket' the travel's ends, 'up' muzzle up top back, 'down' muzzle down top forward, 'plane0' / 'planePi' the in-plane frames at 0 / pi. */
  from: DiagKey;
  to: DiagKey;
}
export type DiagKey = 'start' | 'end' | 'up' | 'down' | 'plane0' | 'planePi';

const smooth = (x: number): number => {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
};

/** The sling angle as an in-plane theta (bore = (sin theta, cos theta, 0)): pi + angle (down-left). */
export function slungTheta(): number {
  return Math.PI + BACK_DIAG.angle;
}

/** The turn step at r (written into `out`, no allocation). `start` / `end` are the travel's own ends. */
export function diagTurn(draw: boolean, r: number, out: DiagTurnStep): DiagTurnStep {
  const u = r < 0 ? 0 : r > 1 ? 1 : r;
  const th = slungTheta();
  if (draw) {
    const D = DIAG_TURN.draw;
    if (u < D.sweep) {
      out.kind = 0;
      out.theta = th * (1 - smooth(u / D.sweep));
    } else if (u < D.twist) {
      out.kind = 1;
      out.from = 'plane0';
      out.to = 'up';
      out.t = smooth((u - D.sweep) / (D.twist - D.sweep));
    } else {
      out.kind = 1;
      out.from = 'up';
      out.to = 'end';
      out.t = smooth((u - D.twist) / (1 - D.twist));
    }
  } else {
    const H = DIAG_TURN.holster;
    if (u < H.down) {
      out.kind = 1;
      out.from = 'start';
      out.to = 'down';
      out.t = smooth(u / H.down);
    } else if (u < H.twist) {
      out.kind = 1;
      out.from = 'down';
      out.to = 'planePi';
      out.t = smooth((u - H.down) / (H.twist - H.down));
    } else {
      out.kind = 0;
      out.theta = Math.PI + (th - Math.PI) * smooth((u - H.twist) / (1 - H.twist));
    }
  }
  return out;
}

/**
 * (anim-rework S3, M2: "Consider how CT pulled the gun underneath like a sling") The sling draw (LT from holstered): the
 * holster's turn run backwards. The gun swings off the back round the right side in the plane of the back until the bore
 * points straight down, twists so its top faces forward (muzzle down beside the right hip, under the arm), then the
 * muzzle swings up forward onto the line into the shoulder. Written into `out` (no allocation); its keys use the
 * draw's ends ('start' the slung gun, 'end' the aim pocket).
 */
export function diagTurnSling(r: number, out: DiagTurnStep): DiagTurnStep {
  const u = r < 0 ? 0 : r > 1 ? 1 : r;
  diagTurn(false, 1 - u, out);
  if (out.kind === 1) {
    const from = out.from;
    out.from = out.to === 'start' ? 'end' : out.to;
    out.to = from === 'start' ? 'end' : from;
    out.t = 1 - out.t;
  }
  return out;
}

/** The in-plane gun frame at theta (bore (sin, cos, 0), top (cos, -sin, 0), right side +z), into `o` (9 numbers: x, y, z axes). */
export function planeFrame(theta: number, o: number[]): number[] {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  o[0] = 0;
  o[1] = 0;
  o[2] = 1;
  o[3] = c;
  o[4] = -s;
  o[5] = 0;
  o[6] = s;
  o[7] = c;
  o[8] = 0;
  return o;
}

/** Muzzle up, top facing back (the gun at the shoulder before it tips down), axes x, y, z. */
export const FRAME_UP = [1, 0, 0, 0, 0, -1, 0, 1, 0] as const;
/** Muzzle down, top forward (beside the right hip on the way to the sling), axes x, y, z. */
export const FRAME_DOWN = [1, 0, 0, 0, 0, 1, 0, -1, 0] as const;

/**
 * The slung gun's node position (chest frame) for its grip at BACK_DIAG.grip and its right side (`x1`, weapon frame) on
 * the back face at z `backZ`: grip = (gx, gy, gz) in the weapon frame. Into `o` (x, y, z).
 */
export function slungPosition(grip: readonly number[], x1: number, backZ: number, o: number[]): number[] {
  const f = planeFrame(slungTheta(), scratch);
  const gy = grip[1]!;
  const gz = grip[2]!;
  // the node's rotation applied to the grip: x axis * gx + y axis * gy + z axis * gz (x axis = +z: no x / y part)
  o[0] = BACK_DIAG.grip[0] - (f[3]! * gy + f[6]! * gz);
  o[1] = BACK_DIAG.grip[1] - (f[4]! * gy + f[7]! * gz);
  o[2] = backZ - BACK_DIAG.gap - x1;
  return o;
}
const scratch: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
