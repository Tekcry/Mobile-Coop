import { Color3, Vector3, type Scene } from '../core/babylon';
import { THERMAL } from './visionLook';
import { G } from '../physics/groups';
import type { Doors } from '../world/doors';
import type { CharacterRig } from '../player/characterRig';
import { Silhouettes, type PointWarp } from './silhouettes';
import { closedDoorIndex, doorPlaneFactor, ghostWarm, inGhostRange, type GhostDoor } from './thermalGhost';

export { closedDoorCrossing, type GhostDoor } from './thermalGhost';

/** Thermal never sees through walls or glass (G45, G102): what stops the silhouette's sight line. */
const GHOST_BLOCK = G.STATIC | G.GLASS;
/** How far (m) the two rays stop short of the leaf on each side, and the slack at the body. */
const LEAF_GAP = 0.2;
const BODY_SLACK = 0.3;

/**
 * (prototype A5, G102; LR16-6 polish) Thermal's dim silhouette of a person behind a shut door (CT: a soft low-ramp
 * figure, 052901 12.5 s). Render only: it reads each warm rig's pose and thermal heat, the doors' state and static rays,
 * and writes nothing back; perception, the meter and the light field never read it. Each peer draws its own (vision is
 * never sent, D8).
 *
 * Which rigs: every rig in `LIVE_RIGS` but the local player's and hidden stand-ins (a dog's humanoid rig), warm
 * enough (`ghostWarm`: guards, partners, a fresh body), within `THERMAL.doorRange` of the camera, whose floor line from
 * the camera crosses a fully shut leaf, with nothing else static or glass on the sight line (two rays, the leaf left out).
 * Guards the sector render freeze disabled still count (their root follows the sim; the pose is the last solved one).
 *
 * How: the figure is the rig's posed limbs and head (`Silhouettes`: one thin-instanced limb mesh and one head mesh, 2
 * draw calls for all of them, no texture, no new pass), each joint slid along its own camera ray to `THERMAL.doorFront`
 * in front of the leaf (`doorPlaneFactor`): it looks exactly like the body would, drawn with the normal depth test, so
 * the player or a crate in front still covers it and the wall faces round the frame clip what spills past the leaf. The
 * emissive grey `THERMAL.doorGhost` lands low on the thermal ramp (dim blue). No allocation per frame.
 */
export class DoorGhosts implements PointWarp {
  private readonly fig: Silhouettes;
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly x = { x: 0, z: 0 };
  /** The warp's camera and door for the figure being captured. */
  private cam: Vector3 | null = null;
  private door: GhostDoor | null = null;
  /** Figures uploaded last frame (skip the upload while both are 0). */
  private last = 0;

  constructor(
    scene: Scene,
    private doors: Doors,
    private ray: (from: Vector3, to: Vector3, mask: number) => { hit: boolean; distance: number },
  ) {
    const k = THERMAL.doorGhost;
    this.fig = new Silhouettes(scene, 'doorGhost', THERMAL.doorMax, new Color3(k, k, k), false, false);
  }

  /** Silhouettes drawn this frame (tests). */
  get count(): number {
    return this.fig.count;
  }

  /** Per render frame: `on` is thermal showing, `cam` the view's position, `rigs` the live rigs (`LIVE_RIGS`), `self` the
   *  local player's rig (never ghosted). */
  update(on: boolean, cam: Vector3, rigs: readonly CharacterRig[], self: CharacterRig | null): void {
    this.fig.begin();
    if (on && this.doors.list.length) {
      for (let i = 0; i < rigs.length; i++) {
        const r = rigs[i]!;
        if (r === self || r.standIn || !ghostWarm(r.heat)) continue;
        if (!this.consider(cam, r)) break;
      }
    }
    const n = this.fig.count;
    if (n > 0 || this.last > 0) this.fig.end();
    this.last = n;
    this.fig.setAlpha(n > 0 ? 1 : 0);
  }

  /** One rig: a figure when a shut leaf (and nothing else) stands between it and the camera. False once full. */
  private consider(cam: Vector3, r: CharacterRig): boolean {
    const hips = r.hips.getAbsolutePosition();
    if (!inGhostRange(cam.x, cam.z, hips.x, hips.z)) return true;
    const x = this.x;
    const list = this.doors.list;
    const di = closedDoorIndex(list, cam.x, cam.z, hips.x, hips.z, x);
    if (di < 0) return true;
    // the sight line must be stopped by the leaf and nothing else: camera -> just before it, just past it -> the chest
    const dx = hips.x - cam.x;
    const dz = hips.z - cam.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const k = LEAF_GAP / len;
    const y = (hips.y + r.neck.getAbsolutePosition().y) * 0.5;
    this.a.copyFrom(cam);
    this.b.set(x.x - dx * k, y, x.z - dz * k);
    if (this.ray(this.a, this.b, GHOST_BLOCK).hit) return true;
    this.a.set(x.x + dx * k, y, x.z + dz * k);
    this.b.set(hips.x, y, hips.z);
    const h = this.ray(this.a, this.b, GHOST_BLOCK);
    if (h.hit && h.distance < Vector3.Distance(this.a, this.b) - BODY_SLACK) return true;
    this.cam = cam;
    this.door = list[di]!;
    return this.fig.add(r, this);
  }

  /** `PointWarp`: slide a captured joint along its camera ray to just in front of the leaf. */
  warp(p: Vector3): number {
    const c = this.cam!;
    const f = doorPlaneFactor(this.door!, c.x, c.z, p.x, p.z, THERMAL.doorFront);
    if (f !== 1) {
      p.x = c.x + (p.x - c.x) * f;
      p.y = c.y + (p.y - c.y) * f;
      p.z = c.z + (p.z - c.z) * f;
    }
    return f;
  }

  dispose(): void {
    this.fig.dispose();
  }
}
