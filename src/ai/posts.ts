/**
 * Posts and high security (pure: no Babylon / DOM), unit-tested (guard-ai S5, design section 6, goal 7, A10, A12).
 *
 * A posted guard lives inside a leash circle of radius `PostDef.leash` round his post (the slot's x, z) and faces the
 * slot's yaw there. A normal post may be sent out like any guard (`mayLeave`); a high-security post (a high-value item,
 * a security door) never leaves the circle: not for a search, an investigation or an alarm panel outside it. He can
 * still be distracted (M1): a lure pulls him to the point of his circle nearest the lure (`lurePoint`, the edge when
 * the lure is outside), he looks toward it for at least `POST.lureLook` s with a sweep of at most +-`POST.lureSweep`
 * rad centred on the lure bearing (A12: the map author sizes the leash so that facing the lure from the edge faces him
 * away from the choke), then walks back and faces his post yaw (`PostLure`).
 *
 * A lookout (guard-rules S7, A9, `PostDef.lookout`) is a perch: with the `lookouts` flag on he reads as a high-security
 * post with a leash of at most `POST.lookoutLeash` (never sent, never leaves; a lure only turns him), and when he grows
 * suspicious by sight he radios it (`LOOKOUT`) so the board sends a calm guard to what he saw. Flag off he is no post.
 * Map authors (M3): a lookout on a vent route stands where he overlooks the vent run or its exit.
 *
 * Yaw convention as `Enemy`: radians, 0 = +Z, yaw = atan2(dx, dz).
 *
 * Allocation-free: functions write into a caller's `out`; `PostLure` holds a few numbers and allocates nothing per step.
 */
import type { IncidentKind } from './incidents';
import type { P2 } from './navGrid';

/** A post (on `SquadSlot.post`, wiring step): the leash circle round the slot's (x, z). */
export interface PostDef {
  /** Metres: the guard never leaves this circle round his post. 0 = he stays on the spot (turns only); otherwise at
   *  least `POST.minLeash` (`validatePosts`). */
  leash: number;
  /** Protects a high-value item or a security door: never assigned out of the leash, never runs to an alarm panel or
   *  joins a search outside it; distractions still pull him to the leash edge (`PostLure`). */
  highSecurity?: boolean;
  /** What the post guards ('vault door', 'token', 'c1-door'), for barks and debug. */
  guards?: string;
  /** (guard-rules S7, A9) A lookout's perch: read as a high-security post with the `lookouts` flag on (never sent,
   *  never leaves; leash <= `POST.lookoutLeash`), and he radios what he sees (`LOOKOUT`). Flag off: no post. */
  lookout?: boolean;
}

/** Post numbers (prototype starting values, G4). A12 promises Course Ready `lureLook` >= 5 and `lureSweep` <= 0.6. */
export const POST = {
  /** Smallest leash (m) other than 0 (`validatePosts`): below it a leash is noise in the nav grid. */
  minLeash: 0.5,
  /** Time (s) a lured posted guard looks toward the lure at his leash point before walking back (A12: at least 5). */
  lureLook: 5,
  /** Half-width (rad) of the look sweep, centred on the lure bearing (A12: at most +-0.6). */
  lureSweep: 0.6,
  /** Period (s) of one full look sweep (left, right, back to centre). */
  lureSweepPeriod: 3,
  /** Time (s) he holds his post yaw after he is back, before the lure counts as done (the turn back to his post). */
  returnFace: 0.8,
  /** Longest walk (s) to the leash point: a blocked path looks from where he got to rather than walking for ever. */
  lureWalkMax: 12,
  /** Suggested arrival radius (m) for the caller's `atTarget`. */
  arrive: 0.3,
  /** (guard-rules S7, A9) A lookout's largest leash (m): he holds his perch and only turns to a lure. */
  lookoutLeash: 1,
} as const;

/** (guard-rules S7, A9) Lookout numbers (prototype starting values, G4). */
export const LOOKOUT = {
  /** s between one lookout's radioed sightings (A9). */
  callCd: 20,
} as const;

/**
 * Clamp a point (px, pz) into the leash circle of radius `leash` round (postX, postZ), written into `out`: the point
 * itself inside the circle, else the nearest point on its edge. A leash of 0 (or less) returns the post (he stays on
 * the spot). Returns `out`.
 */
export function clampToLeash(px: number, pz: number, postX: number, postZ: number, leash: number, out: P2): P2 {
  const dx = px - postX;
  const dz = pz - postZ;
  const d2 = dx * dx + dz * dz;
  if (!(leash > 0)) {
    out[0] = postX;
    out[1] = postZ;
  } else if (d2 <= leash * leash) {
    out[0] = px;
    out[1] = pz;
  } else {
    const k = leash / Math.sqrt(d2);
    out[0] = postX + dx * k;
    out[1] = postZ + dz * k;
  }
  return out;
}

/** The point of the leash circle nearest a lure at (lureX, lureZ): the lure itself inside, the edge outside, the post
 *  for a leash of 0. Written into `out`; returns `out`. */
export function lurePoint(lureX: number, lureZ: number, postX: number, postZ: number, leash: number, out: P2): P2 {
  return clampToLeash(lureX, lureZ, postX, postZ, leash, out);
}

/** Is (x, z) inside the leash circle (with a small tolerance)? A leash of 0 = within `POST.arrive` of the post. */
export function inLeash(x: number, z: number, postX: number, postZ: number, leash: number): boolean {
  const r = (leash > 0 ? leash : 0) + POST.arrive;
  const dx = x - postX;
  const dz = z - postZ;
  return dx * dx + dz * dz <= r * r;
}

/**
 * May this guard be sent out of his leash for an incident of `kind` (an investigation, a search, a body, the alarm
 * panel)? No post or a normal post: yes, like any guard. A high-security post: never (A10); a lookout: never (A9);
 * distractions reach him through `PostLure` inside his leash instead.
 */
export function mayLeave(post: PostDef | null | undefined, _kind: IncidentKind): boolean {
  return !(post && (post.highSecurity || post.lookout));
}

/** `PostLure` phases. */
export const LURE = { idle: 0, walk: 1, look: 2, back: 3, face: 4, done: 5 } as const;
export type LurePhase = (typeof LURE)[keyof typeof LURE];

/** What `PostLure.step` asks of the guard this step. */
export interface PostLureOut {
  /** Where he should be (walk to it while `moving`, stand on it otherwise). */
  x: number;
  z: number;
  /** Where he should face (rad, 0 = +Z). While `moving` it is a hint (the walk direction); the caller may face the path. */
  yaw: number;
  moving: boolean;
  phase: LurePhase;
}

function wrapPi(a: number): number {
  a = (a + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}

/**
 * A posted guard's answer to a lure (a noise, a thrown item, a light cut in his area): walk to the leash point nearest
 * the lure -> look toward it `POST.lureLook` s, sweeping at most +-`POST.lureSweep` rad round the lure bearing -> walk
 * back to the post -> face the post yaw `POST.returnFace` s -> done. A new lure (`start`) restarts it from wherever he
 * is. The caller moves the guard (nav, paces) and reports arrival through `atTarget`: true when the guard stands at the
 * target the previous step gave (an arrival reported on the step a new target is first given is ignored, so a stale
 * "at the edge" never ends the walk back).
 */
export class PostLure {
  phase: LurePhase = LURE.idle;
  /** Time (s) in the current phase. */
  t = 0;
  postX = 0;
  postZ = 0;
  postYaw = 0;
  leash = 0;
  /** The leash point he looks from. */
  readonly look: P2 = [0, 0];
  /** Bearing (rad) from the look point to the lure: the centre of the sweep. */
  bearing = 0;
  private issued = false;

  /** Lured by something at (lureX, lureZ); post at (postX, postZ) facing postYaw with leash `leash`. */
  start(lureX: number, lureZ: number, postX: number, postZ: number, postYaw: number, leash: number): void {
    this.postX = postX;
    this.postZ = postZ;
    this.postYaw = postYaw;
    this.leash = leash > 0 ? leash : 0;
    lurePoint(lureX, lureZ, postX, postZ, this.leash, this.look);
    let dx = lureX - this.look[0];
    let dz = lureZ - this.look[1];
    if (dx * dx + dz * dz < 1e-6) {
      // the lure is inside his circle (he stands on it): face it from the post
      dx = lureX - postX;
      dz = lureZ - postZ;
    }
    this.bearing = dx * dx + dz * dz < 1e-6 ? postYaw : Math.atan2(dx, dz);
    this.phase = LURE.walk;
    this.t = 0;
    this.issued = false;
  }

  /** Drop the lure (combat, a takedown, a despawn): back to idle at once. */
  cancel(): void {
    this.phase = LURE.idle;
    this.t = 0;
    this.issued = false;
  }

  /** Walking out, looking, walking back or turning to the post. */
  get active(): boolean {
    return this.phase !== LURE.idle && this.phase !== LURE.done;
  }

  /** Advance `dt` s; writes what the guard should do into `out` and returns the phase. */
  step(dt: number, atTarget: boolean, out: PostLureOut): LurePhase {
    const arrived = atTarget && this.issued;
    switch (this.phase) {
      case LURE.walk:
        this.t += dt;
        if (arrived || this.t >= POST.lureWalkMax) this.enter(LURE.look);
        break;
      case LURE.look:
        this.t += dt;
        if (this.t >= POST.lureLook) this.enter(LURE.back);
        break;
      case LURE.back:
        this.t += dt;
        if (arrived) this.enter(LURE.face);
        break;
      case LURE.face:
        this.t += dt;
        if (this.t >= POST.returnFace) this.enter(LURE.done);
        break;
      default:
        break;
    }
    out.phase = this.phase;
    switch (this.phase) {
      case LURE.walk:
        out.x = this.look[0];
        out.z = this.look[1];
        out.yaw = this.bearing;
        out.moving = true;
        this.issued = true;
        break;
      case LURE.look:
        out.x = this.look[0];
        out.z = this.look[1];
        out.yaw = wrapPi(this.bearing + POST.lureSweep * Math.sin((2 * Math.PI * this.t) / POST.lureSweepPeriod));
        out.moving = false;
        break;
      case LURE.back: {
        out.x = this.postX;
        out.z = this.postZ;
        const dx = this.postX - this.look[0];
        const dz = this.postZ - this.look[1];
        out.yaw = dx * dx + dz * dz < 1e-6 ? this.postYaw : Math.atan2(dx, dz);
        out.moving = true;
        this.issued = true;
        break;
      }
      default:
        // face, done, idle: on the post, facing the post yaw
        out.x = this.postX;
        out.z = this.postZ;
        out.yaw = this.postYaw;
        out.moving = false;
        break;
    }
    return this.phase;
  }

  private enter(p: LurePhase): void {
    this.phase = p;
    this.t = 0;
    this.issued = false;
  }
}
