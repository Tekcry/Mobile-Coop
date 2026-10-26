/**
 * (piano-knife S4b, A11) The piano intro pose (no Babylon import). Campaign's piano scene calls
 * `GameState.introPose(true, variant)` at the intro's start for the local operator only and `introPose(false)` at the
 * cut to play; the Anim Studio's intro rows call the same. On: the operator's back on the nearest high face within
 * reach (W1, the grain bins), the pistol out at low ready in both hands with its slide locked back (S4a), the captured
 * breath on the trunk (`anim/introBreath.ts`), the hero LOD. Off: the operator stays on the wall in ordinary wall cover,
 * the pistol holstered and its slide forward.
 *
 * The wall core carries the pose to the partner's page: `WALL_SUB.intro` (32) in the wall `sub` byte and the mirror's
 * left hand through `WallCore.leftHand` (G400, no new wire field).
 */
import { INTRO_SIM, loadIntroBreath, type IntroVariant } from '../anim/introBreath';
import type { WallCore } from '../player/wallController';

export interface IntroPoseHost {
  /** The back-to-wall core (made on first use, as wallStep). */
  wall(): WallCore;
  readonly player: {
    readonly position: { x: number; y: number; z: number };
    readonly alive: boolean;
    readonly stance: { base: 'holstered' | 'lowReady'; holster(): void };
  };
  /** The loadout's pistol model, or null. */
  pistol(): { slideLock(on: boolean): void } | null;
  /** The player camera as a close-up camera (the hero LOD) on / off. */
  closeUp(on: boolean): void;
}

export class IntroPose {
  on = false;
  variant: IntroVariant = 'stand';

  constructor(private readonly host: IntroPoseHost) {}

  /** On: true when the pose holds a wall (false: dead, or no high face within reach: nothing changed). Off: true when
   *  it was on. Called again while on it re-enters (harmless). */
  set(on: boolean, variant: IntroVariant = 'stand'): boolean {
    const h = this.host;
    const pl = h.player;
    if (on) {
      if (!pl.alive) return false;
      const w = h.wall();
      const p = pl.position;
      // the nearest high face whose body line is within WALL.reach (0.5 m), any facing
      const k = w.find(p.x, p.y, p.z, 0, 0, 0, 0, true, -1);
      if (k < 0) return false;
      w.enter(k, p.x, p.z, variant === 'crouch', 0, 0);
      w.intro = true;
      w.introLeft = variant === 'mirror';
      // the draw runs in the 0-3 s black
      pl.stance.base = 'lowReady';
      h.pistol()?.slideLock(true);
      h.closeUp(true);
      void loadIntroBreath();
      INTRO_SIM.on = true;
      this.on = true;
      this.variant = variant;
      return true;
    }
    if (!this.on) return false;
    const w = h.wall();
    // the operator STAYS on the wall in ordinary wall cover (no w.leave; Campaign ~22:45: play starts in wall cover)
    w.intro = w.introLeft = false;
    pl.stance.holster();
    h.pistol()?.slideLock(false);
    h.closeUp(false);
    INTRO_SIM.on = false;
    this.on = false;
    return true;
  }
}
