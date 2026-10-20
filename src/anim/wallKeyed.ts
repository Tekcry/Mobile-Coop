/**
 * (anim-rework S5) The back-to-wall keyed set (S5-KEYS.md): standing square to the wall (wall_idle / wall_slide /
 * wall_peek, written for the open side on the right) and crouched side-on (wall_crouch_idle / _slide / _peek, written
 * for travel to the right with the wall on the body's left), mirrored for the other side. Blended by the slide's pace
 * and the peek, then standing to crouched by the crouch. The graph mixes the result into `RigTargets.keyed`.
 * No allocation per frame.
 */
import { mirrorKeyed, mixKeyed, newKeyedPose, sampleKeyed, type KeyedClip, type KeyedPose } from './keyed';
import { KEYED_WALL_IDLE } from './clips/keyed/wall_idle';
import { KEYED_WALL_SLIDE } from './clips/keyed/wall_slide';
import { KEYED_WALL_PEEK } from './clips/keyed/wall_peek';
import { KEYED_WALL_CROUCH_IDLE } from './clips/keyed/wall_crouch_idle';
import { KEYED_WALL_CROUCH_SLIDE } from './clips/keyed/wall_crouch_slide';
import { KEYED_WALL_CROUCH_PEEK } from './clips/keyed/wall_crouch_peek';

/**
 * `idle` / `crouchIdle` / `peek`: the held clips' cycles (s; two breaths standing, three crouched); `gate`: the drawn
 * share the graph reports at the wall so the rig's keyed gate (free gait or drawn) opens (see S5-REPORT open items);
 * `peekLean`: the body lean (rad) at a full peek (WALL.peekLean). Duty / lift are the clips' own (S5-KEYS).
 */
export const WALL_KEYS = { idle: 5, crouchIdle: 9, peek: 5, gate: 0.02, peekLean: 0.2 } as const;

interface Trio {
  idle: KeyedClip;
  slide: KeyedClip;
  peek: KeyedClip;
  idlePeriod: number;
}
const STAND: Trio = { idle: KEYED_WALL_IDLE, slide: KEYED_WALL_SLIDE, peek: KEYED_WALL_PEEK, idlePeriod: WALL_KEYS.idle };
const CROUCH: Trio = { idle: KEYED_WALL_CROUCH_IDLE, slide: KEYED_WALL_CROUCH_SLIDE, peek: KEYED_WALL_CROUCH_PEEK, idlePeriod: WALL_KEYS.crouchIdle };

export class WallKeyed {
  readonly pose = newKeyedPose();
  half = KEYED_WALL_IDLE.half;
  kneeOut = KEYED_WALL_IDLE.kneeOut;
  duty = KEYED_WALL_IDLE.duty;
  liftH = KEYED_WALL_IDLE.liftH;
  private readonly a = newKeyedPose();
  private readonly b = newKeyedPose();
  private readonly c = newKeyedPose();
  private readonly v = { half: 0, kneeOut: 0, duty: 0, liftH: 0 };

  /**
   * `ph` the gait phase, `t` a free clock (s), `move` the slide's share (0 still .. 1), `peek` 0..1, `crouch` 0..1,
   * `side` the wall stance side (`wallSide`: 1 right, -1 left).
   */
  sample(ph: number, t: number, move: number, peek: number, crouch: number, side: number): KeyedPose {
    // standing: the open side right as keyed (side 1); crouched side-on the wall is on the left as keyed for side -1
    // (the knee hand on the right: the graph's kneeHand sign)
    if (crouch < 0.999) this.trio(STAND, ph, t, move, peek, side < 0, this.pose);
    const sH = this.v.half;
    const sK = this.v.kneeOut;
    const sD = this.v.duty;
    const sL = this.v.liftH;
    if (crouch > 0.001) {
      this.trio(CROUCH, ph, t, move, peek, side > 0, crouch < 0.999 ? this.c : this.pose);
      if (crouch < 0.999) {
        mixKeyed(this.pose, this.c, crouch, this.pose);
        const v = this.v;
        this.half = sH + (v.half - sH) * crouch;
        this.kneeOut = sK + (v.kneeOut - sK) * crouch;
        this.duty = sD + (v.duty - sD) * crouch;
        this.liftH = sL + (v.liftH - sL) * crouch;
        return this.pose;
      }
    }
    this.half = this.v.half;
    this.kneeOut = this.v.kneeOut;
    this.duty = this.v.duty;
    this.liftH = this.v.liftH;
    return this.pose;
  }

  private trio(T: Trio, ph: number, t: number, move: number, peek: number, mirror: boolean, out: KeyedPose): void {
    const pk = Math.max(0, Math.min(1, peek));
    const sl = Math.max(0, Math.min(1, move)) * (1 - pk);
    sampleKeyed(T.idle, t / T.idlePeriod, 1, out);
    let half = T.idle.half;
    let kneeOut = T.idle.kneeOut;
    let duty = T.idle.duty;
    let liftH = T.idle.liftH;
    if (sl > 1e-4) {
      // the slide's lead foot as keyed; mirrored half a cycle on (as the glide strafe: the other foot leads)
      sampleKeyed(T.slide, mirror ? ph + 0.5 : ph, 1, this.a);
      mixKeyed(out, this.a, sl, out);
      half += (T.slide.half - half) * sl;
      kneeOut += (T.slide.kneeOut - kneeOut) * sl;
      duty += (T.slide.duty - duty) * sl;
      liftH += (T.slide.liftH - liftH) * sl;
    }
    if (pk > 1e-4) {
      sampleKeyed(T.peek, t / WALL_KEYS.peek, 1, this.b);
      mixKeyed(out, this.b, pk, out);
      half += (T.peek.half - half) * pk;
      kneeOut += (T.peek.kneeOut - kneeOut) * pk;
      duty += (T.peek.duty - duty) * pk;
      liftH += (T.peek.liftH - liftH) * pk;
    }
    if (mirror) mirrorKeyed(out);
    const v = this.v;
    v.half = half;
    v.kneeOut = kneeOut;
    v.duty = duty;
    v.liftH = liftH;
  }
}
