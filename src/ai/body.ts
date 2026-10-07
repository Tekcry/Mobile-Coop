import { Quaternion, Vector3, type Scene, type TransformNode } from '../core/babylon';
import { CharacterRig } from '../player/characterRig';
import type { World } from '../world/world';
import type { EnemyDef } from './enemyDefs';
import { Ragdoll } from './ragdoll';

let nextBody = 1;

/** A fresh, unarmed rig of an enemy type (carried bodies). */
export function buildBodyRig(scene: Scene, world: World, def: EnemyDef, name: string): CharacterRig {
  const rig = new CharacterRig(scene, (shape, hex, slot) => world.parts.instance(shape, hex, `enemy-${slot}`), def.look, def.height, name, {
    build: def.build,
    armor: def.plated,
  });
  for (const m of rig.renderMeshes) world.addShadowCaster(m);
  return rig;
}

/** Carried over the shoulder: torso down the back, legs down the front, arms hanging (joint Euler x). */
const CARRY_TILT = 0.35;
const CARRY_HIP = 2.37;
const CARRY_KNEE = 0.6;
const CARRY_SHOULDER = 2.79;

/**
 * A downed enemy (killed or knocked out): a settled ragdoll that stays where it fell (or a still body when no
 * ragdoll could be spared), which enemies can find, the player can carry (a fresh rig posed over the
 * shoulder) and put down again (a short ragdoll drop) or hide in a container (gone for good). A knocked-out
 * victim found by an enemy is revived (Blacklist: non-lethal victims wake only if found).
 */
export class Body {
  readonly id = `b${nextBody++}`;
  /** Pelvis world position (updated per step). */
  readonly pos = new Vector3();
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
  private ragdoll: Ragdoll | null = null;
  private rig: CharacterRig | null = null;

  constructor(
    private scene: Scene,
    private world: World,
    readonly def: EnemyDef,
    /** Killed (true) or knocked out (false). */
    readonly lethal: boolean,
    rig: CharacterRig,
    impulse: Vector3,
    ragdollOk: boolean,
  ) {
    rig.heldWeapon = null;
    rig.emote = null;
    if (ragdollOk) this.ragdoll = new Ragdoll(scene, rig, impulse, true);
    else this.lay(rig);
    this.rig = rig;
    this.sync();
  }

  /** Simulating physics (counts against the ragdoll budget). */
  get simulating(): boolean {
    return !!this.ragdoll && !this.ragdoll.settled;
  }

  /** On the floor and findable / pick-up-able. */
  get present(): boolean {
    return !this.hidden && !this.carried && !!this.rig;
  }

  /** No physics to spare: lay the rig flat where it stands. */
  private lay(rig: CharacterRig): void {
    const r = rig.root;
    r.rotation.x = -Math.PI / 2;
    r.position.y += rig.p.chest.d * 0.5;
  }

  update(dt: number): void {
    this.age += dt;
    this.ragdoll?.update(dt);
    if (!this.carried) this.sync();
  }

  private sync(): void {
    const rig = this.rig;
    if (!rig || rig.disposed) return;
    rig.hips.computeWorldMatrix(true);
    this.pos.copyFrom(rig.hips.getAbsolutePosition());
  }

  /** Pick up: the corpse goes, a fresh rig is posed over the carrier's shoulder (`chest` node of their rig). */
  pickUp(chest: TransformNode, shoulderX: number, shoulderY: number): CharacterRig {
    this.disposeRig();
    const rig = buildBodyRig(this.scene, this.world, this.def, `${this.id}-carried`);
    const r = rig.root;
    r.parent = chest;
    const th = Math.PI + CARRY_TILT;
    r.rotation.set(th, 0, 0);
    // hips on the shoulder: the root (feet) sits up and forward of it
    const hy = rig.p.y.hip;
    r.position.set(shoulderX, shoulderY - hy * Math.cos(th), -hy * Math.sin(th));
    const q = (n: TransformNode, x: number): void => {
      Quaternion.RotationYawPitchRollToRef(0, x, 0, n.rotationQuaternion!);
    };
    q(rig.hipL, CARRY_HIP);
    q(rig.hipR, CARRY_HIP - 0.12);
    q(rig.kneeL, CARRY_KNEE);
    q(rig.kneeR, CARRY_KNEE + 0.1);
    q(rig.shoulderL, CARRY_SHOULDER);
    q(rig.shoulderR, CARRY_SHOULDER + 0.1);
    q(rig.neck, 0.35);
    this.rig = rig;
    this.carried = true;
    this.found = false;
    return rig;
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

  /** Put down: off the shoulder into a short ragdoll drop, or (no ragdoll to spare) laid flat at `at`. */
  drop(impulse: Vector3, ragdollOk: boolean, at: Vector3, yaw: number): void {
    const rig = this.rig;
    if (!rig || !this.carried) return;
    rig.root.computeWorldMatrix(true);
    rig.root.setParent(null);
    this.carried = false;
    if (ragdollOk) this.ragdoll = new Ragdoll(this.scene, rig, impulse, true, 2.2);
    else {
      const r = rig.root;
      r.rotationQuaternion = null;
      r.rotation.set(0, yaw, 0);
      r.position.copyFrom(at);
      for (const n of [rig.hipL, rig.hipR, rig.kneeL, rig.kneeR, rig.shoulderL, rig.shoulderR, rig.neck]) n.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
      this.lay(rig);
    }
    this.sync();
  }

  /** Into a container / vent: gone for good. */
  hide(): void {
    this.disposeRig();
    this.carried = false;
    this.hidden = true;
  }

  private disposeRig(): void {
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
