import { Vector3 } from '../core/babylon';
import type { InputState } from '../input/inputState';
import type { MoveOverride } from '../player/playerController';
import { MASK } from '../physics/groups';
import { DOOR } from '../world/doors';
import { OPTIC } from '../config/tools';
import { OpticCore, opticPlace, opticRefusal } from '../player/opticCable';
import type { GameState } from './gameState';

/**
 * (ct-toolkit 3.2, G97) The optic cable at a door: the door menu's OPTIC CABLE row. The body kneels in front of the
 * leaf (crouched and still: perceived as any crouched body), the cable feeds in, then the view sits at the tip on the
 * far side at floor height: the look turns the tip within its limits, night vision toggles as usual (the vision input
 * is read by `GameState` as always), a ping goes out from the view, crouch or the stick pulled back leaves. While it
 * runs the operator gets no input (as a remote view). The view is local only (never sent); the scene renders once from
 * the tip (no second camera). The tip is placed from the door anchor and a collision ray (never graphics state).
 * Prototype, doors only: hatches, panels and grilles (map tag `optic`) and the partner's view of the kneel (MoveState
 * mode `optic`, a wire change) are open items.
 */
export class OpticSystem {
  readonly core = new OpticCore();
  private ov: MoveOverride = { velocity: { x: 0, z: 0 } };
  private hp = 0;
  private feedOn = false;
  private a = new Vector3();
  private b = new Vector3();
  private dir = new Vector3();
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
    const why = opticRefusal(d.anchor, d.target, this.gapClear(pl.gx, pl.gz, pl.tx, pl.ty, pl.tz));
    if (why) {
      this.refused = why;
      g.hud.feedItem(why, 'warn');
      return false;
    }
    this.refused = '';
    this.hp = g.target.health.hp;
    return this.core.start(di);
  }

  /** The far side is clear from the leaf's far face to the tip (plus the padding), above the floor. */
  private gapClear(gx: number, gz: number, tx: number, ty: number, tz: number): boolean {
    const dx = tx - gx;
    const dz = tz - gz;
    const len = Math.max(1e-6, Math.sqrt(dx * dx + dz * dz));
    const ux = dx / len;
    const uz = dz / len;
    const y = ty + OPTIC.pad;
    this.a.set(gx + ux * 0.02, y, gz + uz * 0.02);
    this.b.set(tx + ux * OPTIC.pad, y, tz + uz * OPTIC.pad);
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
    const d = g.world.doors.list[core.door];
    const hp = g.target.health.hp;
    const hurt = hp < this.hp;
    this.hp = hp;
    const abort = !d || !g.player.alive || hurt || d.target !== 0 || (!!c.override && c.override !== this.ov);
    const leave = inp.pressed('crouch') || inp.move.y < OPTIC.leaveBack;
    core.update(dt, leave, abort);
    if (!core.active || !g.player.alive) {
      if (c.override === this.ov) c.override = null;
      return core.active;
    }
    // kneel in front of the leaf, facing it (the feed's first half glides onto the spot, then still)
    const pl = core.place;
    const p = g.player.position;
    const left = core.phase === 'feed' ? Math.max(dt, OPTIC.feedIn * 0.5 - core.t) : 0.1;
    const v = this.ov.velocity!;
    v.x = (pl.kx - p.x) / left;
    v.z = (pl.kz - p.z) / left;
    if (core.phase !== 'feed' || core.t >= OPTIC.feedIn * 0.5) v.x = v.z = 0;
    const ov = this.ov;
    ov.yaw = pl.yaw;
    ov.crouch = true;
    ov.turnRate = 9;
    ov.glide = true;
    ov.run = false;
    ov.noise = 'crouched';
    c.override = ov;
    return true;
  }

  /** Look delta (radians, the render frame's): turns the tip in the view. */
  look(dx: number, dy: number): void {
    this.core.look(dx, dy);
  }

  /** After the player's camera update: the view at the tip (render only; `gamePos` / `forward` for the ping). */
  frameUpdate(): void {
    const g = this.g;
    const on = this.core.viewing;
    if (on !== this.feedOn) {
      this.feedOn = on;
      g.post.setFeed(on ? 1 : 0);
    }
    if (!on) return;
    const cam = g.player.cam;
    const camera = cam.camera;
    const pl = this.core.place;
    const yaw = this.core.yaw;
    const pitch = this.core.pitch;
    const cp = Math.cos(pitch);
    this.dir.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
    camera.position.set(pl.tx, pl.ty, pl.tz);
    camera.rotation.set(-pitch, yaw, 0);
    camera.fov = cam.vfov(OPTIC.fov);
    camera.minZ = OPTIC.near;
    cam.gamePos.copyFrom(camera.position);
    cam.forward.copyFrom(this.dir);
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
  }
}
