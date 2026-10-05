import { Color4, TransformNode, type AbstractMesh, type InstancedMesh, type Scene } from '../core/babylon';
import type { PartShape } from '../world/partLibrary';
import type { AvatarLook } from '../cosmetics/avatarLook';

/** Creates a unit-sized part mesh (instanced for enemies, unique for the player). `slot` names the colour/pattern slot. */
export type PartFactory = (shape: PartShape, hex: string, slot: string) => AbstractMesh;

export interface RigPose {
  /** Horizontal speed in m/s. */
  speed: number;
  /** Local movement direction (x right, z forward), normalised or zero. */
  localX: number;
  localZ: number;
  grounded: boolean;
  /** 0 standing .. 1 fully crouched. */
  crouch: number;
  /** Roll progress 0..1 while rolling, else <0. */
  roll: number;
  /** Aim pitch in radians (up positive). */
  aimPitch: number;
  /** 0 relaxed .. 1 weapon raised. */
  aim: number;
  /** Momentary kick from firing 0..1. */
  kick: number;
}

const BODY_W: Record<AvatarLook['body'], number> = { slim: 0.88, regular: 1, heavy: 1.22 };

/**
 * Hierarchical primitive character (feet at origin, faces +Z) with procedural animation.
 * Pivots are TransformNodes; meshes hang off them with their own scaling so instancing works.
 */
export class CharacterRig {
  readonly root: TransformNode;
  readonly parts: AbstractMesh[] = [];
  readonly hips: TransformNode;
  readonly torso: TransformNode;
  readonly neck: TransformNode;
  readonly shoulderL: TransformNode;
  readonly shoulderR: TransformNode;
  readonly elbowL: TransformNode;
  readonly elbowR: TransformNode;
  readonly hipL: TransformNode;
  readonly hipR: TransformNode;
  readonly kneeL: TransformNode;
  readonly kneeR: TransformNode;
  /** Attach weapon models here (right hand, points +Z). */
  readonly weaponSocket: TransformNode;
  /** Weapon carry pivot (under hips): points along the aim when aiming, low-ready otherwise. */
  readonly weaponPivot: TransformNode;
  /** Head pivot (for headshot hitbox placement). */
  readonly headNode: TransformNode;
  private phase = 0;
  private breathe = 0;
  /** Extra emote overrides (set by emote player). */
  emote: ((rig: CharacterRig, t: number) => void) | null = null;
  emoteTime = 0;

  constructor(
    scene: Scene,
    make: PartFactory,
    look: AvatarLook,
    readonly height = 1.8,
    name = 'rig',
  ) {
    const w = BODY_W[look.body];
    const k = height / 1.8;
    const n = (nm: string, parent: TransformNode | null, x = 0, y = 0, z = 0): TransformNode => {
      const t = new TransformNode(`${name}-${nm}`, scene);
      t.parent = parent;
      t.position.set(x * k, y * k, z * k);
      return t;
    };
    this.root = n('root', null);
    this.hips = n('hips', this.root, 0, 0.95, 0);
    this.torso = n('torso', this.hips, 0, 0.08, 0);
    this.neck = n('neck', this.torso, 0, 0.5, 0);
    this.headNode = n('head', this.neck, 0, 0.12, 0);
    this.shoulderL = n('shL', this.torso, -0.27 * w, 0.48, 0);
    this.shoulderR = n('shR', this.torso, 0.27 * w, 0.48, 0);
    this.elbowL = n('elL', this.shoulderL, 0, -0.29, 0);
    this.elbowR = n('elR', this.shoulderR, 0, -0.29, 0);
    this.hipL = n('hipL', this.hips, -0.11 * w, -0.04, 0);
    this.hipR = n('hipR', this.hips, 0.11 * w, -0.04, 0);
    this.kneeL = n('knL', this.hipL, 0, -0.43, 0);
    this.kneeR = n('knR', this.hipR, 0, -0.43, 0);
    this.weaponSocket = n('weapon', this.elbowR, 0, -0.26, 0.05);
    this.weaponPivot = n('weaponPivot', this.hips, 0.16 * w, 0.42, 0.24);

    const c = look.colors;
    const p = (shape: PartShape, hex: string, slot: string, parent: TransformNode, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0): AbstractMesh => {
      const m = make(shape, hex, slot);
      m.parent = parent;
      m.scaling.set(sx * k, sy * k, sz * k);
      m.position.set(x * k, y * k, z * k);
      this.parts.push(m);
      return m;
    };

    // pelvis + torso
    p('box', c.legs, 'legs', this.hips, 0.34 * w, 0.2, 0.22 * w, 0, 0, 0);
    const chestW = 0.44 * w;
    p('box', c.torso, 'torso', this.torso, chestW, 0.52, 0.25 * w, 0, 0.27, 0);
    switch (look.torso) {
      case 'vest':
        p('box', c.accent, 'accent', this.torso, chestW + 0.04, 0.34, 0.29 * w, 0, 0.3, 0);
        break;
      case 'armor':
        p('box', c.accent, 'accent', this.torso, chestW + 0.06, 0.3, 0.31 * w, 0, 0.33, 0);
        p('box', c.accent, 'accent', this.shoulderL, 0.16, 0.08, 0.2, -0.02, 0.02, 0);
        p('box', c.accent, 'accent', this.shoulderR, 0.16, 0.08, 0.2, 0.02, 0.02, 0);
        break;
      case 'jacket':
        p('box', c.accent, 'accent', this.torso, chestW * 0.6, 0.1, 0.27 * w, 0, 0.5, 0);
        p('box', c.torso, 'torso', this.torso, chestW + 0.03, 0.12, 0.28 * w, 0, 0.06, 0);
        break;
      case 'hoodie':
        p('box', c.torso, 'torso', this.neck, 0.3, 0.12, 0.28, 0, -0.02, -0.06);
        p('box', c.accent, 'accent', this.torso, 0.18, 0.1, 0.02, 0, 0.16, 0.13 * w);
        break;
      case 'tee':
        break;
    }
    // head
    const headShape: PartShape = look.head === 'round' ? 'sphere' : look.head === 'hex' ? 'hex' : 'box';
    const headH = look.head === 'tall' ? 0.32 : 0.26;
    p(headShape, c.skin, 'skin', this.headNode, 0.24, headH, 0.24, 0, 0.02, 0);
    p('box', '#15181c', 'eyes', this.headNode, 0.16, 0.04, 0.02, 0, 0.05, 0.12);
    switch (look.hair) {
      case 'buzz':
        p('box', c.hair, 'hair', this.headNode, 0.25, 0.06, 0.25, 0, 0.14, -0.005);
        break;
      case 'mohawk':
        p('box', c.hair, 'hair', this.headNode, 0.06, 0.14, 0.26, 0, 0.18, 0);
        break;
      case 'long':
        p('box', c.hair, 'hair', this.headNode, 0.26, 0.08, 0.26, 0, 0.14, 0);
        p('box', c.hair, 'hair', this.headNode, 0.26, 0.3, 0.08, 0, -0.05, -0.12);
        break;
      case 'bun':
        p('box', c.hair, 'hair', this.headNode, 0.25, 0.06, 0.25, 0, 0.14, 0);
        p('sphere', c.hair, 'hair', this.headNode, 0.12, 0.12, 0.12, 0, 0.16, -0.14);
        break;
      case 'spikes':
        for (let i = -1; i <= 1; i++) p('cone', c.hair, 'hair', this.headNode, 0.08, 0.14, 0.08, i * 0.08, 0.2, 0);
        break;
      case 'none':
        break;
    }
    switch (look.helmet) {
      case 'cap':
        p('box', c.helmet, 'helmet', this.headNode, 0.27, 0.08, 0.27, 0, 0.15, 0);
        p('box', c.helmet, 'helmet', this.headNode, 0.24, 0.03, 0.12, 0, 0.12, 0.17);
        break;
      case 'combat':
        p('hex', c.helmet, 'helmet', this.headNode, 0.32, 0.16, 0.32, 0, 0.13, -0.01);
        break;
      case 'visor':
        p('box', c.helmet, 'helmet', this.headNode, 0.3, 0.2, 0.3, 0, 0.1, 0);
        p('box', c.accent, 'accent', this.headNode, 0.26, 0.07, 0.04, 0, 0.06, 0.15);
        break;
      case 'beret':
        p('cyl', c.helmet, 'helmet', this.headNode, 0.3, 0.06, 0.3, 0.02, 0.15, 0);
        break;
      case 'horns':
        p('box', c.helmet, 'helmet', this.headNode, 0.27, 0.1, 0.27, 0, 0.14, 0);
        p('cone', c.accent, 'accent', this.headNode, 0.07, 0.16, 0.07, -0.13, 0.24, 0);
        p('cone', c.accent, 'accent', this.headNode, 0.07, 0.16, 0.07, 0.13, 0.24, 0);
        break;
      case 'none':
        break;
    }
    switch (look.backpack) {
      case 'pack':
        p('box', c.backpack, 'backpack', this.torso, 0.34 * w, 0.4, 0.16, 0, 0.3, -0.2 * w);
        break;
      case 'radio':
        p('box', c.backpack, 'backpack', this.torso, 0.26, 0.36, 0.14, 0, 0.3, -0.19 * w);
        p('cyl', '#1c1f24', 'eyes', this.torso, 0.02, 0.5, 0.02, 0.09, 0.7, -0.2 * w);
        break;
      case 'tank':
        p('cyl', c.backpack, 'backpack', this.torso, 0.14, 0.46, 0.14, -0.08, 0.3, -0.2 * w);
        p('cyl', c.backpack, 'backpack', this.torso, 0.14, 0.46, 0.14, 0.08, 0.3, -0.2 * w);
        break;
      case 'blade':
        p('box', c.backpack, 'backpack', this.torso, 0.06, 0.7, 0.1, 0, 0.32, -0.18 * w).rotation.z = 0.6;
        break;
      case 'none':
        break;
    }
    // arms
    for (const [sh, el] of [
      [this.shoulderL, this.elbowL],
      [this.shoulderR, this.elbowR],
    ] as const) {
      p('box', look.torso === 'tee' ? c.skin : c.torso, look.torso === 'tee' ? 'skin' : 'torso', sh, 0.12 * w, 0.3, 0.12 * w, 0, -0.14, 0);
      p('box', c.skin, 'skin', el, 0.1 * w, 0.27, 0.1 * w, 0, -0.13, 0);
      p('box', c.skin, 'skin', el, 0.1, 0.08, 0.1, 0, -0.3, 0);
    }
    // legs
    const legCol = c.legs;
    for (const [hp, kn] of [
      [this.hipL, this.kneeL],
      [this.hipR, this.kneeR],
    ] as const) {
      const thighW = look.legs === 'cargo' ? 0.17 : 0.15;
      p('box', look.legs === 'shorts' ? legCol : legCol, 'legs', hp, thighW * w, 0.44, thighW * w, 0, -0.21, 0);
      if (look.legs === 'cargo') p('box', c.accent, 'accent', hp, 0.04, 0.12, 0.1, (hp === this.hipL ? -1 : 1) * 0.09 * w, -0.24, 0);
      p('box', look.legs === 'shorts' ? c.skin : legCol, look.legs === 'shorts' ? 'skin' : 'legs', kn, 0.13 * w, 0.42, 0.13 * w, 0, -0.2, 0);
      if (look.legs === 'armored') p('box', c.accent, 'accent', kn, 0.15 * w, 0.12, 0.06, 0, -0.02, 0.07);
      p('box', c.boots, 'boots', kn, 0.15 * w, 0.1, 0.26, 0, -0.42, 0.05);
    }
  }

  setEnabled(v: boolean): void {
    this.root.setEnabled(v);
  }

  /** Procedural animation. Call every render frame. */
  animate(dt: number, s: RigPose): void {
    this.breathe += dt;
    const moving = s.speed > 0.3;
    const stride = Math.min(1.2, s.speed / 5);
    this.phase += dt * (moving ? 2.2 + s.speed * 1.1 : 0);
    if (!moving) this.phase *= Math.pow(0.02, dt); // settle to neutral
    const sw = Math.sin(this.phase) * stride * 0.75;
    const crouchDrop = s.crouch * 0.38;

    // legs (side-step blends into hip roll)
    const fwd = s.localZ >= -0.2 ? 1 : -1;
    this.hipL.rotation.x = sw * fwd - s.crouch * 1.1;
    this.hipR.rotation.x = -sw * fwd - s.crouch * 1.1;
    this.hipL.rotation.z = -Math.abs(s.localX) * Math.max(0, Math.sin(this.phase)) * 0.25 * stride;
    this.hipR.rotation.z = Math.abs(s.localX) * Math.max(0, -Math.sin(this.phase)) * 0.25 * stride;
    this.kneeL.rotation.x = Math.max(0, -Math.cos(this.phase)) * stride * 0.9 + s.crouch * 1.6;
    this.kneeR.rotation.x = Math.max(0, Math.cos(this.phase)) * stride * 0.9 + s.crouch * 1.6;
    this.hips.position.y = (0.95 - crouchDrop) * (this.height / 1.8) + Math.abs(Math.cos(this.phase)) * 0.04 * stride;
    if (!s.grounded) {
      this.hipL.rotation.x = -0.6;
      this.hipR.rotation.x = 0.2;
      this.kneeL.rotation.x = 1.1;
      this.kneeR.rotation.x = 0.5;
    }

    // torso: lean into motion, aim pitch
    const breath = Math.sin(this.breathe * 1.8) * 0.015;
    this.torso.rotation.x = s.crouch * 0.35 + (moving ? 0.08 * stride : 0) + breath - s.aimPitch * 0.35 * s.aim;
    this.torso.rotation.y = s.aim * 0.25;
    this.neck.rotation.x = -s.aimPitch * 0.4 * s.aim - s.crouch * 0.2;
    this.neck.rotation.y = -s.aim * 0.25;

    // arms: swing when relaxed, raise when aiming
    const relaxL = -sw * 0.8;
    const relaxR = sw * 0.8;
    const aimX = -Math.PI / 2 - s.aimPitch * 0.85 + s.kick * 0.25;
    this.shoulderR.rotation.x = lerp(relaxR - 0.2, aimX, s.aim);
    this.shoulderR.rotation.y = lerp(0, -0.25, s.aim);
    this.elbowR.rotation.x = lerp(-0.35, -0.15, s.aim);
    this.shoulderL.rotation.x = lerp(relaxL - 0.2, aimX + 0.15, s.aim);
    this.shoulderL.rotation.y = lerp(0, 0.85, s.aim);
    this.shoulderL.rotation.z = lerp(0.08, 0, s.aim);
    this.shoulderR.rotation.z = lerp(-0.08, 0, s.aim);
    this.elbowL.rotation.x = lerp(-0.35, -0.6, s.aim);

    // weapon: low-ready when relaxed, along aim pitch when raised
    this.weaponPivot.rotation.x = lerp(0.75, -s.aimPitch, s.aim) - s.kick * 0.12;
    this.weaponPivot.rotation.y = lerp(-0.5, 0, s.aim);
    this.weaponPivot.position.z = (0.24 - s.kick * 0.04) * (this.height / 1.8);

    // roll: tuck and spin forward
    if (s.roll >= 0) {
      const t = s.roll;
      this.hips.rotation.x = t * Math.PI * 2;
      this.hips.position.y = 0.55 * (this.height / 1.8);
      this.hipL.rotation.x = this.hipR.rotation.x = -1.6;
      this.kneeL.rotation.x = this.kneeR.rotation.x = 2.2;
      this.shoulderL.rotation.x = this.shoulderR.rotation.x = -1.2;
    } else {
      this.hips.rotation.x = 0;
    }
    if (this.emote) {
      this.emoteTime += dt;
      this.emote(this, this.emoteTime);
    }
  }

  private baseColors: Color4[] | null = null;
  private flashK = 0;

  /** Tint every part towards white (hit feedback). k = 0..1. Only touches buffers when k changes. */
  setFlash(k: number): void {
    if (Math.abs(k - this.flashK) < 0.02 && !(k === 0 && this.flashK !== 0)) return;
    this.flashK = k;
    const parts = this.parts as InstancedMesh[];
    if (!this.baseColors) this.baseColors = parts.map((m) => (m.instancedBuffers?.color as Color4 | undefined)?.clone() ?? new Color4(1, 1, 1, 1));
    parts.forEach((m, i) => {
      if (!m.instancedBuffers) return;
      const b = this.baseColors![i]!;
      m.instancedBuffers.color = new Color4(b.r + (1 - b.r) * k, b.g + (0.92 - b.g) * k, b.b + (0.85 - b.b) * k, 1);
    });
  }

  dispose(): void {
    for (const m of this.parts) m.dispose();
    this.root.dispose();
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
