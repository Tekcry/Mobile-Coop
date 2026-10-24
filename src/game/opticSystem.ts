import { Vector3 } from '../core/babylon';
import type { InputState } from '../input/inputState';
import type { MoveOverride } from '../player/playerController';
import { MASK } from '../physics/groups';
import { DOOR } from '../world/doors';
import { OPTIC } from '../config/tools';
import { clearGripAxis } from '../player/attachGrips';
import { OpticCore, opticCableEnd, opticPlace, opticPointPlace, opticPointRefusal, opticRefusal, opticSubOf, opticTipRay, type OpticRay } from '../player/opticCable';
import type { GameState } from './gameState';

/** (optic-coop) The local player's cable prop slot (`world.ropes`). */
const CABLE_KEY = 'local-optic';

/**
 * (ct-toolkit 3.2, G97) The optic cable at a door: the door menu's OPTIC CABLE row. The body kneels in front of the
 * leaf (crouched and still: perceived as any crouched body), the cable feeds in, then the view sits at the tip on the
 * far side at floor height: the look turns the tip within its limits, night vision toggles as usual (the vision input
 * is read by `GameState` as always), a ping goes out from the view (`sendPing` casts from `cam.gamePos`, the tip, set
 * here each frame), crouch or the stick pulled back leaves. While it runs the operator gets no input (as a remote
 * view). The view is local only (never sent); the scene renders once from the tip (no second camera). The tip is placed
 * from the door anchor and a collision ray (never graphics state).
 * (optic-coop) Also the level's other gaps (`BuiltLevel.opticPoints`: hatches, ceiling panels, grilles, shaft tops;
 * `pickPoint`, the action menu's OPTIC CABLE row at the gap, M1), the feeding hand and the cable prop (hand -> tip, render only), and the kneel
 * on the wire (MoveState mode `optic`, `localMoveState`): partners pose the same kneel and cable.
 */
export class OpticSystem {
  readonly core = new OpticCore();
  private ov: MoveOverride = { velocity: { x: 0, z: 0 } };
  private hp = 0;
  private feedOn = false;
  private handOn = false;
  private a = new Vector3();
  private b = new Vector3();
  private dir = new Vector3();
  private end = { x: 0, y: 0, z: 0 };
  private ray: OpticRay = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 1 };
  /** The last refusal shown (tests). */
  refused = '';

  constructor(private g: GameState) {}

  get active(): boolean {
    return this.core.active;
  }

  get viewing(): boolean {
    return this.core.viewing;
  }

  /** The door menu's OPTIC CABLE pick at door `di`: refused with a HUD line, else the kneel and the feed start. */
  pick(di: number): boolean {
    const g = this.g;
    const d = g.world.doors.list[di];
    if (!d || this.core.active || !g.player.alive) return false;
    const p = g.player.position;
    const pl = opticPlace(d.anchor, p.x, p.z, DOOR.thickness, this.core.place);
    const why = opticRefusal(d.anchor, d.target, this.gapClear(pl.gx, pl.ty + OPTIC.pad, pl.gz, pl.tx, pl.ty + OPTIC.pad, pl.tz));
    if (why) return this.refuse(why);
    return this.begin(di, 0);
  }

  /**
   * (optic-coop) The optic cable through the level's gap `pi` (`BuiltLevel.opticPoints`: a hatch, panel, grille or
   * shaft top): refused out of reach ("Too far") or with the far side blocked ("No gap"), else the kneel (a panel:
   * standing under it) and the feed start. (M1) The action menu's OPTIC CABLE row at the gap (`game/gapMenu.ts`).
   */
  pickPoint(pi: number): boolean {
    const g = this.g;
    const pt = g.world.level.opticPoints[pi];
    if (!pt || this.core.active || !g.player.alive) return false;
    const p = g.player.position;
    const pl = opticPointPlace(pt, p.x, p.z, this.core.place);
    const why = opticPointRefusal(pt, p.x, p.y, p.z, this.gapClear(pt.gap.x, pt.gap.y, pt.gap.z, pl.tx, pl.ty, pl.tz));
    if (why) return this.refuse(why);
    return this.begin(pi, opticSubOf(pt.kind));
  }

  private refuse(why: string): false {
    this.refused = why;
    this.g.hud.feedItem(why, 'warn');
    return false;
  }

  private begin(i: number, sub: number): boolean {
    this.refused = '';
    this.hp = this.g.target.health.hp;
    return this.core.start(i, sub);
  }

  /** The far side is clear from the gap (ax, ay, az) to the tip (bx, by, bz) plus the padding: nothing in the world in
   *  between (a door's far side above the floor; a hatch's void, a grille's duct, a wall behind). */
  private gapClear(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.max(1e-6, Math.sqrt(dx * dx + dy * dy + dz * dz));
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;
    this.a.set(ax + ux * 0.02, ay + uy * 0.02, az + uz * 0.02);
    this.b.set(bx + ux * OPTIC.pad, by + uy * OPTIC.pad, bz + uz * OPTIC.pad);
    const want = len - 0.02 + OPTIC.pad;
    return this.g.ballistics.hitDistance(this.a, this.b, MASK.WORLD) >= want - 1e-3;
  }

  /** Fixed step with the real input. True while the cable runs (the operator gets blank input). */
  fixedUpdate(dt: number, inp: InputState): boolean {
    const core = this.core;
    const g = this.g;
    const c = g.player.controller;
    if (!core.active) {
      if (c.override === this.ov) c.override = null;
      return false;
    }
    // at a door: the door gone or opening aborts; (optic-coop) at a gap: the gap gone
    const d = core.sub === 0 ? g.world.doors.list[core.door] : undefined;
    const gone = core.sub === 0 ? !d || d.target !== 0 : !g.world.level.opticPoints[core.door];
    const hp = g.target.health.hp;
    const hurt = hp < this.hp;
    this.hp = hp;
    const abort = gone || !g.player.alive || hurt || (!!c.override && c.override !== this.ov);
    const leave = inp.pressed('crouch') || inp.move.y < OPTIC.leaveBack;
    core.update(dt, leave, abort);
    if (!core.active || !g.player.alive) {
      if (c.override === this.ov) c.override = null;
      return core.active;
    }
    // kneel in front of the leaf / gap, facing it (the feed's first half glides onto the spot, then still)
    const pl = core.place;
    const p = g.player.position;
    const left = core.phase === 'feed' ? Math.max(dt, OPTIC.feedIn * 0.5 - core.t) : 0.1;
    const v = this.ov.velocity!;
    v.x = (pl.kx - p.x) / left;
    v.z = (pl.kz - p.z) / left;
    if (core.phase !== 'feed' || core.t >= OPTIC.feedIn * 0.5) v.x = v.z = 0;
    const ov = this.ov;
    ov.yaw = pl.yaw;
    // (optic-coop) a ceiling panel is fed standing under it
    ov.crouch = pl.crouch;
    ov.turnRate = 9;
    ov.glide = true;
    ov.run = false;
    ov.noise = 'crouched';
    c.override = ov;
    return true;
  }

  /** (optic-coop, check A polish 5) In the view: writes the tip's ray (origin, unit direction) into `o` / `dir` and
   *  returns true, from the view's first step (before `frameUpdate` has moved the camera); else false, both untouched. */
  tipRay(o: Vector3, dir: Vector3): boolean {
    const r = this.ray;
    if (!opticTipRay(this.core, r)) return false;
    o.set(r.x, r.y, r.z);
    dir.set(r.dx, r.dy, r.dz);
    return true;
  }

  /** Look delta (radians, the render frame's): turns the tip in the view. */
  look(dx: number, dy: number): void {
    this.core.look(dx, dy);
  }

  /** After the player's camera update: the feeding hand and the cable prop (optic-coop, render only), and the view at
   *  the tip (render only; `gamePos` / `forward` for the ping). */
  frameUpdate(): void {
    const g = this.g;
    this.handFrame();
    const on = this.core.viewing;
    if (on !== this.feedOn) {
      this.feedOn = on;
      g.post.setFeed(on ? 1 : 0);
    }
    if (!on) return;
    const cam = g.player.cam;
    const camera = cam.camera;
    const r = this.ray;
    opticTipRay(this.core, r);
    this.dir.set(r.dx, r.dy, r.dz);
    camera.position.set(r.x, r.y, r.z);
    camera.rotation.set(-this.core.pitch, this.core.yaw, 0);
    camera.fov = cam.vfov(OPTIC.fov);
    camera.minZ = OPTIC.near;
    cam.gamePos.copyFrom(camera.position);
    cam.forward.copyFrom(this.dir);
  }

  /** (optic-coop) The right hand on the feed point and the cable from it to the tip as far as it is fed out (the same
   *  `opticCableEnd` a partner's copy draws from MoveState `ph`); in the view the cable stops short of the camera. */
  private handFrame(): void {
    const core = this.core;
    const g = this.g;
    const rig = g.player.rig;
    if (!core.active) {
      if (this.handOn) {
        rig.reachR.w = 0;
        g.world.ropes.hide(CABLE_KEY);
        this.handOn = false;
      }
      return;
    }
    const pl = core.place;
    const r = rig.reachR;
    clearGripAxis(r);
    r.x = pl.hx;
    r.y = pl.hy;
    r.z = pl.hz;
    r.w = Math.min(1, core.extension * 3);
    const ext = core.viewing ? 0.85 : core.extension;
    const e = opticCableEnd(pl, ext, this.end);
    if (ext > 0.02) g.world.ropes.set(CABLE_KEY, pl.hx, pl.hy, pl.hz, e.x, e.y, e.z, OPTIC.cableR);
    else g.world.ropes.hide(CABLE_KEY);
    this.handOn = true;
  }

  /** The view's overlay line for the input mode (null: not in the view). */
  feedText(mode: 'gamepad' | 'kbm'): string | null {
    if (!this.core.viewing) return null;
    return mode === 'gamepad' ? 'OPTIC CABLE  D-pad left vision  B back' : 'OPTIC CABLE  N vision  C / S back';
  }

  reset(): void {
    const c = this.g.player.controller;
    if (c.override === this.ov) c.override = null;
    this.core.reset();
    this.handFrame();
  }
}
