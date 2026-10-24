import { Quaternion, Vector3, type Scene, type TransformNode } from '../core/babylon';
import { CharacterRig } from '../player/characterRig';
import { G } from '../physics/groups';
import type { World } from '../world/world';
import type { Ballistics } from '../weapons/ballistics';
import type { EnemyDef } from './enemyDefs';
import type { Enemy } from './enemy';
import { Ragdoll } from './ragdoll';
import { attachToShoulder, captureLying, hoistAt, layAt, slideAt } from './carryPose';
import { GuardBody, guardBodyOf, guardModelsFor, type GuardBodyGear } from './guardBody';
import { deathLie, dropLie, fallYaw, headReach, LIE, lieAt, newLie, settleMax, type BodyLie, type LieBody } from './bodyLie';

let nextBody = 1;

/**
 * A fresh, unarmed rig of an enemy type (carried bodies). (guard-models G7) With `flags.guardModels` it also gets the
 * guard's figure (`guardBodyOf(rig)`), built right after the rig with `gear`: the guard's look seed and his helmet /
 * armour as he went down, so a carried body keeps his look.
 */
export function buildBodyRig(scene: Scene, world: World, def: EnemyDef, name: string, gear: GuardBodyGear | null = null): CharacterRig {
  const rig = new CharacterRig(scene, (shape, hex, slot) => world.parts.instance(shape, hex, `enemy-${slot}`), def.look, def.height, name, {
    build: def.build,
    armor: def.plated,
    merge: true, // (guard-render S1) one merged smooth mesh (`?guardmerge=0`: the parts)
  });
  if (guardModelsFor(def)) new GuardBody(scene, world, def, rig, name, gear ?? undefined);
  for (const m of rig.renderMeshes) world.addShadowCaster(m);
  return rig;
}

const rayA = new Vector3();
const rayB = new Vector3();
const layQ = new Quaternion();

/**
 * (rig-pose-fix S5) The lie at death on the sim (`bodyLie.deathLie`): the guard's sim feet (x, y, z) and yaw, the death
 * impulse's horizontal way (dirX, dirZ), the body's proportions, and the clear room along the fall on the static
 * collision (`bal`; null: open floor). The host's `Body` and the co-op client's ragdoll both take it.
 * (rig-pose-fix S3, CHECK-W1 polish 1) Then one down ray on the static collision from over the settled pelvis: the body
 * lies on the floor found there (killed at a ledge lip, the pelvis settles over the drop; killed mid-air, on a ladder or
 * a drop, the floor is below his feet); no floor within `LIE.floorDrop` under his feet: it lies at his feet's height.
 */
export function deathLieOn(out: BodyLie, bal: Pick<Ballistics, 'hitDistance'> | null, x: number, y: number, z: number, yaw: number, dirX: number, dirZ: number, p: LieBody): BodyLie {
  let room = Infinity;
  if (bal) {
    const h = fallYaw(yaw, dirX, dirZ);
    const reach = settleMax(p) + headReach(p);
    rayA.set(x, y + LIE.rayY, z);
    rayB.set(x + Math.sin(h) * reach, y + LIE.rayY, z + Math.cos(h) * reach);
    room = bal.hitDistance(rayA, rayB, G.STATIC);
  }
  deathLie(out, x, y, z, yaw, dirX, dirZ, p, room);
  if (bal) {
    const top = y + LIE.floorUp;
    const len = LIE.floorUp + LIE.floorDrop;
    rayA.set(out.x, top, out.z);
    rayB.set(out.x, top - len, out.z);
    const d = bal.hitDistance(rayA, rayB, G.STATIC);
    if (d < len - 1e-4) lieAt(out, out.x, top - d, out.z, out.headYaw, p);
  }
  return out;
}

/**
 * A downed enemy (killed or knocked out): a settled ragdoll that stays where it fell (or a still body when no
 * ragdoll could be spared), which enemies can find, the player can carry (a fresh rig posed over the
 * shoulder) and put down again (a short ragdoll drop) or hide in a container (gone for good). A knocked-out
 * victim found by an enemy is revived (Blacklist: non-lethal victims wake only if found).
 *
 * (rig-pose-fix S5, audit G8 / G9) Where it lies is sim: `pos` and `lie` are set at death from the guard's sim state
 * (`deathLieOn`) and on a put down from the drop point (`bodyLie.dropLie`), never read back from the rig. The ragdoll
 * is visual and eases onto the lie when it settles (`Ragdoll.snapTo`); without one the rig is laid straight on it.
 */
export class Body {
  readonly id = `b${nextBody++}`;
  /** The pelvis on the floor (sim: the lie's pelvis; unchanged while carried). */
  readonly pos = new Vector3();
  /** (S5) How it lies (sim): the pelvis (= `pos`), the chest point, the way the head points. */
  readonly lie: BodyLie = newLie();
  found = false;
  hidden = false;
  carried = false;
  /** Light on the body (sampled now and then by the manager). */
  light = 0;
  lightT = 0;
  /** Being revived by an enemy (seconds so far). */
  reviveT = 0;
  /** Seconds since it went down. */
  age = 0;
  /** The enemy it was (co-op: clients keep that enemy's ragdoll while the body exists). */
  enemyId = '';
  /** (guard-ai S4) His stable guard key (`Enemy.key`, the awareness roster; -1 none) and the guard himself (a woken
   *  guard takes over his key, route, post, squad and the rest: `Enemy.inherit`). */
  guardKey = -1;
  guard: Enemy | null = null;
  private ragdoll: Ragdoll | null = null;
  private rig: CharacterRig | null = null;
  /** (guard-models G7) The figure over `rig` (the guard's own as he fell; a fresh one on a carried rig), or null. */
  private gbody: GuardBody | null = null;
  private readonly gearTmp: GuardBodyGear = { look: 0, helmet: false, armour: false };

  constructor(
    private scene: Scene,
    private world: World,
    readonly def: EnemyDef,
    /** Killed (true) or knocked out (false). */
    readonly lethal: boolean,
    rig: CharacterRig,
    impulse: Vector3,
    ragdollOk: boolean,
    /** (S5) Where it lies (sim, `deathLieOn`). */
    lie: BodyLie,
  ) {
    rig.heldWeapon = null;
    rig.emote = null;
    this.setLie(lie);
    if (ragdollOk) {
      this.ragdoll = new Ragdoll(scene, rig, impulse, true);
      this.ragdoll.snapTo(lie.x, lie.y, lie.z, lie.headYaw);
    } else this.lay(rig);
    this.rig = rig;
    this.gbody = guardBodyOf(rig);
  }

  /** (guard-models G7) His look and gear for a fresh rig: from the figure he fell in, else from the guard. */
  private gearNow(): GuardBodyGear | null {
    const gb = this.gbody;
    if (gb && !gb.isDisposed) return gb.gear(this.gearTmp);
    const g = this.guard;
    if (!g) return null;
    this.gearTmp.look = g.look;
    this.gearTmp.helmet = g.helmet;
    this.gearTmp.armour = g.armour;
    return this.gearTmp;
  }

  /** The body's rig, for render-only passes (step 14: a fresh body cools in thermal vision); null once gone. */
  get view(): CharacterRig | null {
    return this.rig;
  }

  /** Simulating physics (counts against the ragdoll budget). */
  get simulating(): boolean {
    return !!this.ragdoll && !this.ragdoll.settled;
  }

  /** On the floor and findable / pick-up-able. */
  get present(): boolean {
    return !this.hidden && !this.carried && !!this.rig;
  }

  private setLie(l: BodyLie): void {
    const o = this.lie;
    o.x = l.x;
    o.y = l.y;
    o.z = l.z;
    o.cx = l.cx;
    o.cy = l.cy;
    o.cz = l.cz;
    o.headYaw = l.headYaw;
    this.pos.set(l.x, l.y, l.z);
  }

  /** No physics to spare: lay the rig straight on its lie (pelvis on the lie's, head its way). */
  private lay(rig: CharacterRig): void {
    const l = this.lie;
    layAt(rig, l.x, l.y, l.z, l.headYaw, layQ);
  }

  update(dt: number): void {
    this.age += dt;
    this.ragdoll?.update(dt);
  }

  /** Pick up at once: the corpse goes, a fresh rig is posed over the carrier's shoulder (`chest` node of their rig). */
  pickUp(chest: TransformNode, shoulderX: number, shoulderY: number): CharacterRig {
    const gear = this.gearNow();
    this.disposeRig();
    const rig = buildBodyRig(this.scene, this.world, this.def, `${this.id}-carried`, gear);
    attachToShoulder(rig, chest, shoulderX, shoulderY);
    this.rig = rig;
    this.gbody = guardBodyOf(rig);
    this.carried = true;
    this.found = false;
    return rig;
  }

  /** (G7, S5) The lying body's chest point for the carrier's step-in (sim, the lie); returns the way its head points
   *  (rad, 0 = +Z). */
  lieChest(out: Vector3): number {
    const l = this.lie;
    out.set(l.cx, l.cy, l.cz);
    return l.headYaw;
  }

  /** (G7, P8: presentation) The lying body's shoulders as drawn, for the carrier's hands. */
  shoulders(outL: Vector3, outR: Vector3): void {
    const rig = this.rig;
    if (!rig) return;
    rig.shoulderL.computeWorldMatrix(true);
    outL.copyFrom(rig.shoulderL.getAbsolutePosition());
    rig.shoulderR.computeWorldMatrix(true);
    outR.copyFrom(rig.shoulderR.getAbsolutePosition());
  }

  /** (G7, row 6) The hoist begins: the corpse goes, a fresh rig lies straight where it lay (hips, head the same way),
   *  off the floor's list (carried). `hoist` then lifts it to the shoulder socket. */
  private hoistFrom = new Vector3();
  private hoistQ = new Quaternion();
  private hoistJ: Quaternion[] = Array.from({ length: 16 }, () => new Quaternion());
  beginHoist(): void {
    const rig0 = this.rig;
    if (!rig0) return;
    // (G7 fix round) the fresh rig takes the corpse's pose as it lies (it was straightened in one frame)
    const rig = buildBodyRig(this.scene, this.world, this.def, `${this.id}-carried`, this.gearNow());
    captureLying(rig0, rig, this.hoistQ, this.hoistFrom, this.hoistJ);
    this.disposeRig();
    this.rig = rig;
    this.gbody = guardBodyOf(rig);
    this.carried = true;
    this.found = false;
  }

  /** (G7) The hoist at `k` 0..1 toward `socket` (a node on the carrier's chest at the carry socket), `side` the shoulder. */
  hoist(socket: TransformNode, side: number, k: number): void {
    if (this.rig && this.carried && !this.rig.root.parent) hoistAt(this.rig, this.hoistFrom, this.hoistQ, this.hoistJ, socket, side, k);
  }

  /** (G7) The hoist done: onto the carrier's shoulder for the carry. */
  shoulder(chest: TransformNode, shoulderX: number, shoulderY: number): void {
    if (this.rig && this.carried) attachToShoulder(this.rig, chest, shoulderX, shoulderY);
  }

  /** (G7, row 8) Sliding off the shoulder at `k` 0..1 (the put down, before the ragdoll takes it). */
  slide(shoulderX: number, shoulderY: number, k: number): void {
    if (this.rig && this.carried && this.rig.root.parent) slideAt(this.rig, shoulderX, shoulderY, k);
  }

  /** Where the carried body's knees are (the carrier's hands go there). */
  knees(outL: Vector3, outR: Vector3): void {
    const rig = this.rig;
    if (!rig) return;
    rig.kneeL.computeWorldMatrix(true);
    rig.kneeR.computeWorldMatrix(true);
    outL.copyFrom(rig.kneeL.getAbsolutePosition());
    outR.copyFrom(rig.kneeR.getAbsolutePosition());
  }

  /** Put down: off the shoulder into a short ragdoll drop, or (no ragdoll to spare) laid straight. Either way it lies
   *  (sim, S5) with the pelvis at the drop point `at` and the head toward `headYaw` (rad, 0 = +Z). */
  drop(impulse: Vector3, ragdollOk: boolean, at: Vector3, headYaw: number): void {
    const rig = this.rig;
    if (!rig || !this.carried) return;
    rig.root.computeWorldMatrix(true);
    rig.root.setParent(null);
    this.carried = false;
    this.setLie(dropLie(this.lie, at.x, at.y, at.z, headYaw, rig.p));
    if (ragdollOk) {
      this.ragdoll = new Ragdoll(this.scene, rig, impulse, true, 2.2);
      this.ragdoll.snapTo(this.lie.x, this.lie.y, this.lie.z, this.lie.headYaw);
    } else this.lay(rig);
  }

  /** Into a container / vent: gone for good. */
  hide(): void {
    this.disposeRig();
    this.carried = false;
    this.hidden = true;
  }

  private disposeRig(): void {
    // (guard-models G7) the figure first (its meshes hang under the rig's root)
    this.gbody?.dispose();
    this.gbody = null;
    if (this.ragdoll) {
      this.ragdoll.dispose();
      this.ragdoll = null;
    } else this.rig?.dispose();
    this.rig = null;
  }

  dispose(): void {
    this.disposeRig();
  }
}
