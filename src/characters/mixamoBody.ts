/**
 * (mixamo-chars, N53) A Mixamo character in the game: the packed model (`scripts/mixamo/pack.mjs`: one GLB per
 * character, every move a glTF animation) loaded once per scene, one instance per body, its moves played directly by
 * Babylon's animation groups and blended by `locomotion.ts`.
 *
 * Slice b: the move set follows the gun in the hands (unarmed, rifle, pistol; a short crossfade), and named nodes of the
 * hand-built rig FOLLOW the Mixamo bones (`follow`): each takes its bone's movement away from the bind pose, so whatever
 * hangs on those nodes (the slung rifle on the chest, the holster on the thigh, pouches on the hips) rides on the Mixamo
 * body. The rig still animates first every frame; the follow overwrites those nodes after Babylon's animation step.
 *
 * Michael's picks (2026-11-02 night): stock Mixamo mannequins for the players (X Bot as Wren, Y Bot as Moth, in the
 * players' colours) and Swat for the guards, ours re-rigged later.
 */
import {
  LoadAssetContainerAsync, Color3, Matrix, PBRMaterial, Quaternion, StandardMaterial, TransformNode, Vector3,
  type AbstractMesh, type AnimationGroup, type AssetContainer, type Observer, type Scene,
} from '../core/babylon';
import { LOCO_N, LOCO_SETS, locoBlend, setClip, slotMoves, type LocoIn, type LocoSet } from './locomotion';
import { ACTION_CLIPS, type ActionOut } from './actions';
import xbotUrl from './assets/xbot.glb?url';
import ybotUrl from './assets/ybot.glb?url';
import swatUrl from './assets/swat.glb?url';

export type MixamoModel = 'xbot' | 'ybot' | 'swat';
const URLS: Readonly<Record<MixamoModel, string>> = { xbot: xbotUrl, ybot: ybotUrl, swat: swatUrl };

/** Height of every Mixamo body (m): the player's (G74, 1.68 m), so the camera and capsule fit unchanged. */
export const MIXAMO_HEIGHT = 1.68;
/** Seconds for a move-set change (holster, draw) to crossfade. */
const SET_FADE = 0.2;
/** (slice e) Seconds for an action to fade in over the locomotion, or back out. */
const ACT_FADE = 0.12;
/** (slice g) Seconds the spine takes to follow the aim pitch, and the most it bends (rad, provisional). */
const PITCH_EASE = 0.08;
const PITCH_MAX = 1.1;
/** (slice g) The actions whose hands are pinned to the rig's; the climb-up lets go from 0.45 through its next 0.3. */
const ANCHORED: ReadonlySet<string> = new Set(['hang_idle', 'hang_shimmy_l', 'hang_shimmy_r', 'ladder', 'hang_climb_up']);
const ANCHOR_CLIMB_FROM = 0.45;
const ANCHOR_CLIMB_SPAN = 0.3;

const CONTAINERS = new WeakMap<Scene, Map<MixamoModel, Promise<AssetContainer>>>();

/** The scene's loaded model (one fetch and parse per model per scene; disposed with the scene). */
function container(scene: Scene, model: MixamoModel): Promise<AssetContainer> {
  let m = CONTAINERS.get(scene);
  if (!m) {
    m = new Map();
    CONTAINERS.set(scene, m);
    scene.onDisposeObservable.addOnce(() => CONTAINERS.delete(scene));
  }
  let p = m.get(model);
  if (!p) {
    p = LoadAssetContainerAsync(URLS[model], scene, { pluginExtension: '.glb' });
    m.set(model, p);
  }
  return p;
}

export interface MixamoBodyOpts {
  /** Body colour (linear RGB), applied to the model's main surface (players: their goggle colour); none keeps the model's. */
  tint?: readonly [number, number, number];
  /** Each mesh as it loads (shadow casters). */
  casters?: (m: AbstractMesh) => void;
  /** Standing height (m); default `MIXAMO_HEIGHT` (the player's). */
  height?: number;
}

/** One rig node that follows a Mixamo bone: the node, the bone's name (`Hips`, `Spine2`, ...) and the node's rest
 *  transform in its rig root's space (taken before the rig first animates). */
export interface FollowPair {
  node: TransformNode;
  bone: string;
  rest: Matrix;
}

interface Follow {
  node: TransformNode;
  /** The node's ancestors below the rig root, top first (recomputed before the node is set). */
  chain: TransformNode[];
  rest: Matrix;
  bone: TransformNode;
  /** The bone's ancestors below this body's root, top first, and the bone itself last. */
  boneChain: TransformNode[];
  /** The bone's bind transform in this body's root space. */
  boneRest: Matrix;
}

/** The ancestors of `n` strictly below `top`, top first (empty when `n`'s parent is `top`). */
function chainBelow(n: TransformNode, top: TransformNode): TransformNode[] {
  const out: TransformNode[] = [];
  for (let p = n.parent; p && p !== top; p = p.parent) if (p instanceof TransformNode) out.unshift(p);
  return out;
}

/**
 * (slice b) How each gun class sits in the Mixamo right hand while its move set plays: the body's right, up and forward
 * seen in the RightHand bone's own axes (measured in the game from the packs' idles, 2026-11-02: Pro Rifle Pack `idle`
 * and `idle aiming` agree within 1 deg; Pistol Pack `pistol idle`), and the grip's spot in the hand (m, the same axes:
 * along the fingers toward the palm). Provisional: tuned by eye from the Test Chamber shots.
 */
export const HOLD_FRAMES = {
  rifle: { right: [0.161, -0.059, -0.985], up: [0.939, 0.316, 0.135], fwd: [-0.303, 0.947, -0.106], palm: [0, 0.07, 0] },
  pistol: { right: [-0.049, 0.209, -0.977], up: [0.998, 0.055, -0.038], fwd: [-0.046, 0.976, 0.211], palm: [0, 0.07, 0] },
} as const;
export type HoldKind = keyof typeof HOLD_FRAMES;

// scratch (follow runs once per body per frame; no allocation)
const mA = new Matrix(), mB = new Matrix(), mC = new Matrix(), mD = new Matrix();
const vS = new Vector3(), vT = new Vector3(), vT2 = new Vector3();
const qR = new Quaternion();

/**
 * One Mixamo body, parented to `parent` (its feet on the parent's origin, facing the parent's +Z). Loads in the
 * background; `ready` is false until then and `update` does nothing.
 */
export class MixamoBody {
  readonly root: TransformNode;
  ready = false;
  failed = false;
  /** Called once when the model is in and playing (the owner hides what it stood in for). */
  onReady: (() => void) | null = null;
  /** (slice f) The owner's player is down: the body lies (`downed_lie`) over everything else. */
  downed = false;
  /** The move set playing now (the strongest after the crossfade). */
  set: LocoSet = 'unarmed';
  private readonly scene: Scene;
  private meshes: AbstractMesh[] = [];
  private groups: AnimationGroup[] = [];
  /** The distinct clips the sets use: group, seconds per cycle, whether it is a moving clip. */
  private clips: { g: AnimationGroup; cycle: number; moves: boolean }[] = [];
  /** Per set, per slot: index into `clips` (-1: the model lacks it). */
  private table: Int32Array = new Int32Array(0);
  private readonly setW = new Float64Array(LOCO_SETS.length);
  private clipW = new Float64Array(0);
  private readonly w = new Float64Array(LOCO_N);
  private readonly ratio = new Float64Array(LOCO_N);
  /** (slice e) The action clips by name, the one playing (or fading out) and its weight. */
  private readonly actions = new Map<string, AnimationGroup>();
  private act: AnimationGroup | null = null;
  private actW = 0;
  /** (slice g) The spine's aim bend now (rad), and its bones top first (Spine, Spine1, Spine2). */
  private pitch = 0;
  private spine: TransformNode[] = [];
  /** (slice g) The hand anchors (rig wrists), the body's own hands (LeftHand, RightHand), the anchor's weight now,
   *  whether the body is shifted, and the root's own height (the fit's). */
  private anchors: { l: TransformNode; r: TransformNode } | null = null;
  private hands: (TransformNode | null)[] = [];
  private anchorW = 0;
  private anchored = false;
  private baseY = 0;
  private pendingFollow: { rigRoot: TransformNode; pairs: FollowPair[] } | null = null;
  private follows: Follow[] = [];
  private rigRoot: TransformNode | null = null;
  private followObs: Observer<Scene> | null = null;
  private hold: { pivot: TransformNode; chain: TransformNode[]; grip: Vector3; kind: () => HoldKind | null; hand: TransformNode; handChain: TransformNode[] } | null = null;
  private readonly holdL = new Matrix();
  private disposed = false;

  constructor(scene: Scene, readonly model: MixamoModel, parent: TransformNode, private readonly opts: MixamoBodyOpts = {}) {
    this.scene = scene;
    this.root = new TransformNode(`mixamo-${model}`, scene);
    this.root.parent = parent;
    this.setW[0] = 1;
    container(scene, model).then(
      (c) => this.build(c),
      (e: unknown) => {
        this.failed = true;
        console.error(`mixamo body ${model}: load failed`, e);
      },
    );
  }

  private build(c: AssetContainer): void {
    if (this.disposed) return;
    const inst = c.instantiateModelsToScene((n) => `${this.root.name}:${n}`, true, { doNotInstantiate: true });
    for (const n of inst.rootNodes) n.parent = this.root;
    this.groups = inst.animationGroups;
    for (const n of inst.rootNodes) for (const m of n.getChildMeshes(false)) this.meshes.push(m);
    if (this.opts.tint) this.tint(this.opts.tint);
    for (const m of this.meshes) {
      m.isPickable = false;
      m.receiveShadows = true;
      this.opts.casters?.(m);
    }
    for (const g of this.groups) {
      g.stop();
      g.enableBlending = false;
    }
    // the clip table: every set's clip per slot, each distinct clip one looping group
    const byName = new Map<string, number>();
    this.table = new Int32Array(LOCO_SETS.length * LOCO_N).fill(-1);
    for (let s = 0; s < LOCO_SETS.length; s++)
      for (let k = 0; k < LOCO_N; k++) {
        const name = setClip(LOCO_SETS[s] as LocoSet, k);
        if (!name) continue;
        let ci = byName.get(name);
        if (ci === undefined) {
          const g = this.groups.find((x) => x.name.split(':').pop() === name);
          if (!g) continue;
          const fps = g.targetedAnimations[0]?.animation.framePerSecond ?? 60;
          ci = this.clips.length;
          this.clips.push({ g, cycle: Math.max(1 / fps, (g.to - g.from) / fps), moves: slotMoves(k) });
          byName.set(name, ci);
        }
        this.table[s * LOCO_N + k] = ci;
      }
    this.clipW = new Float64Array(this.clips.length);
    for (let i = 0; i < this.clips.length; i++) {
      const c = this.clips[i]!;
      c.g.start(true, 1);
      c.g.weight = i === 0 ? 1 : 0;
    }
    // (slice e) the action clips, looping at weight 0 until an action picks one
    for (const name of ACTION_CLIPS) {
      const g = this.groups.find((x) => x.name.split(':').pop() === name);
      if (!g) continue;
      g.start(true, 1);
      g.weight = 0;
      this.actions.set(name, g);
    }
    // the reference pose: the idle's first frame, a standing pose like the rig's rest (a model's bind pose can sit its
    // hips on the floor, the Swat's does, and holds a T): the height fit and the follow's bone rests are taken in it
    const idle = this.clips[0]?.g;
    if (idle) idle.goToFrame(idle.from);
    this.fitHeight();
    this.baseY = this.root.position.y;
    this.hands = [this.boneNode('LeftHand'), this.boneNode('RightHand')];
    this.spine = ['Spine', 'Spine1', 'Spine2'].map((n) => this.boneNode(n)).filter((b): b is TransformNode => !!b);
    if (this.pendingFollow) this.bindFollow(this.pendingFollow.rigRoot, this.pendingFollow.pairs);
    this.ready = true;
    this.onReady?.();
  }

  /**
   * Scales the body to the game's size (in the reference pose), its feet on the parent's origin (Mixamo models stand on
   * their own origin). With a rig to follow, the Head bone's height above the feet matches the rig's head node at rest
   * (his eye, the camera fade; hips-to-head lengths do not: the two skeletons mark the head at different points); else
   * the model's bounds give `height` (the Swat's unskinned mesh bounds read 1.79x small: the skeleton is the reliable
   * measure).
   */
  private fitHeight(): void {
    this.root.scaling.setAll(1);
    this.root.position.y = 0;
    for (let p: TransformNode | null = this.root; p; p = p.parent instanceof TransformNode ? p.parent : null) p.computeWorldMatrix(true);
    const headPair = this.pendingFollow?.pairs.find((p) => p.bone === 'Head');
    const head = this.boneNode('Head');
    if (headPair && head) {
      for (const n of [...chainBelow(head, this.root), head]) n.computeWorldMatrix(true);
      const have = head.getAbsolutePosition().y - this.root.getAbsolutePosition().y;
      const want = headPair.rest.m[13] as number;
      if (have > 0.1 && want > 0.1) this.root.scaling.setAll(want / have);
      return;
    }
    let minY = Infinity, maxY = -Infinity;
    for (const m of this.meshes) {
      m.computeWorldMatrix(true);
      const b = m.getBoundingInfo().boundingBox;
      minY = Math.min(minY, b.minimumWorld.y);
      maxY = Math.max(maxY, b.maximumWorld.y);
    }
    const h = maxY - minY;
    if (h > 0.1) this.root.scaling.setAll((this.opts.height ?? MIXAMO_HEIGHT) / h);
  }

  /** The model's main surface colour (the mannequins' body; the joints keep theirs). */
  private tint(rgb: readonly [number, number, number]): void {
    const col = new Color3(rgb[0], rgb[1], rgb[2]);
    for (const m of this.meshes) {
      const mat = m.material;
      if (!mat || /joint/i.test(mat.name)) continue;
      if (mat instanceof PBRMaterial) mat.albedoColor = col;
      else if (mat instanceof StandardMaterial) mat.diffuseColor = col;
    }
  }

  /** A bone's node by its Mixamo name (`Hips`, `Spine2`, `RightUpLeg`, ...), or null. */
  boneNode(name: string): TransformNode | null {
    const re = new RegExp(`(^|[:_])${name}$`);
    for (const n of this.root.getDescendants(false)) if (n instanceof TransformNode && re.test(n.name)) return n;
    return null;
  }

  /**
   * Makes rig nodes follow Mixamo bones (in hierarchy order: a parent before its children). Call once; before the model
   * loads it waits for it. `rigRoot` is the rig's root (each pair's `rest` is in its space).
   */
  follow(rigRoot: TransformNode, pairs: FollowPair[]): void {
    if (this.ready) this.bindFollow(rigRoot, pairs);
    else this.pendingFollow = { rigRoot, pairs };
  }

  private bindFollow(rigRoot: TransformNode, pairs: FollowPair[]): void {
    this.pendingFollow = null;
    this.rigRoot = rigRoot;
    const rootInv = this.root.computeWorldMatrix(true).clone().invert();
    for (const p of pairs) {
      const bone = this.boneNode(p.bone);
      if (!bone) {
        console.warn(`mixamo body ${this.model}: no bone ${p.bone}`);
        continue;
      }
      const boneChain = [...chainBelow(bone, this.root), bone];
      for (const n of boneChain) n.computeWorldMatrix(true);
      this.follows.push({ node: p.node, chain: chainBelow(p.node, rigRoot), rest: p.rest, bone, boneChain, boneRest: bone.getWorldMatrix().multiply(rootInv) });
    }
    this.followObs ??= this.scene.onAfterAnimationsObservable.add(() => this.applyFollow());
  }

  /**
   * (slice g) Bends the spine to the aim pitch: `pitch` (rad, up positive) split over Spine, Spine1 and Spine2, each
   * turned about the body's right axis through its own joint, after the moves are applied. The gun in the right hand
   * and the chest-hung gear follow (the hold and the follow run after this).
   */
  private bendSpine(rr: TransformNode): void {
    const p = this.pitch;
    if (Math.abs(p) < 1e-3 || this.spine.length === 0) return;
    const r = rr.computeWorldMatrix(true).m;
    vT.set(r[0] as number, r[1] as number, r[2] as number).normalize();
    const a = -p / this.spine.length;
    for (const b of this.spine) {
      for (const n of chainBelow(b, this.root)) n.computeWorldMatrix(true);
      const W = b.computeWorldMatrix(true);
      const px = W.m[12] as number, py = W.m[13] as number, pz = W.m[14] as number;
      // new world = W . move(-joint) . turn(right, a) . move(joint)
      Matrix.TranslationToRef(-px, -py, -pz, mA);
      W.multiplyToRef(mA, mB);
      Matrix.RotationAxisToRef(vT, a, mC);
      mB.multiplyToRef(mC, mD);
      Matrix.TranslationToRef(px, py, pz, mA);
      mD.multiplyToRef(mA, mB);
      (b.parent as TransformNode).getWorldMatrix().invertToRef(mA);
      mB.multiplyToRef(mA, mC);
      mC.decompose(vS, qR, vT2);
      b.position.copyFrom(vT2);
      if (b.rotationQuaternion) b.rotationQuaternion.copyFrom(qR);
      else b.rotationQuaternion = qR.clone();
      b.scaling.copyFrom(vS);
      b.computeWorldMatrix(true);
    }
  }

  /** After Babylon's animation step: each follower takes its bone's movement from the bind pose. */
  private applyFollow(): void {
    const rr = this.rigRoot;
    if (!rr || !this.ready || !this.root.isEnabled()) return;
    this.anchorBody();
    this.bendSpine(rr);
    const rootW = this.root.computeWorldMatrix(true);
    const rigW = rr.computeWorldMatrix(true);
    for (const f of this.follows) {
      for (const n of f.boneChain) n.computeWorldMatrix(true);
      // delta = inverse(bone bind, world now) x bone now: the bone's movement away from its bind pose
      f.boneRest.multiplyToRef(rootW, mA);
      mA.invertToRef(mB);
      mB.multiplyToRef(f.bone.getWorldMatrix(), mC);
      // target = node rest (world now) x delta; local = target x inverse(parent world)
      f.rest.multiplyToRef(rigW, mA);
      mA.multiplyToRef(mC, mD);
      for (const n of f.chain) n.computeWorldMatrix(true);
      const parent = f.node.parent as TransformNode;
      parent.getWorldMatrix().invertToRef(mA);
      mD.multiplyToRef(mA, mB);
      mB.decompose(vS, qR, vT);
      f.node.position.copyFrom(vT);
      if (f.node.rotationQuaternion) f.node.rotationQuaternion.copyFrom(qR);
      else f.node.rotationQuaternion = qR.clone();
      f.node.computeWorldMatrix(true);
    }
    this.applyHold();
  }

  /**
   * (slice b) Puts a held gun in the Mixamo right hand: `pivot` (the rig node the held gun sits on at its origin) is set
   * so the gun's grip point (`grip`, gun space, m) lands in the palm with the gun turned by its class's hold frame.
   * `kind` says each frame which class is held in the hands (null: none, or the gun is on its way: the rig places it).
   */
  holdGun(rigRoot: TransformNode, pivot: TransformNode, grip: Vector3, kind: () => HoldKind | null): void {
    const hand = this.ready ? this.boneNode('RightHand') : null;
    if (!this.ready) {
      // the model is still loading: bind once it is
      const o = this.scene.onBeforeRenderObservable.add(() => {
        if (!this.ready && !this.failed) return;
        this.scene.onBeforeRenderObservable.remove(o);
        if (this.ready) this.holdGun(rigRoot, pivot, grip, kind);
      });
      return;
    }
    if (!hand) return;
    this.rigRoot ??= rigRoot;
    this.hold = { pivot, chain: chainBelow(pivot, rigRoot), grip, kind, hand, handChain: [...chainBelow(hand, this.root), hand] };
    this.followObs ??= this.scene.onAfterAnimationsObservable.add(() => this.applyFollow());
  }

  private applyHold(): void {
    const h = this.hold;
    if (!h) return;
    const k = h.kind();
    if (!k) return;
    const F = HOLD_FRAMES[k];
    for (const n of h.handChain) n.computeWorldMatrix(true);
    const H = h.hand.getWorldMatrix();
    // hand-local units per metre (the bone's world scale is the body's scale x the model's centimetres)
    const m = H.m;
    const u = 1 / Math.hypot(m[0] as number, m[1] as number, m[2] as number);
    const g = h.grip;
    const [rx, ry, rz] = F.right, [ux, uy, uz] = F.up, [fx, fy, fz] = F.fwd;
    // the grip point's spot in hand space, then the gun's origin so the grip lands on the palm
    const gx = g.x * rx + g.y * ux + g.z * fx, gy = g.x * ry + g.y * uy + g.z * fy, gz = g.x * rz + g.y * uz + g.z * fz;
    const tx = (F.palm[0] - gx) * u, ty = (F.palm[1] - gy) * u, tz = (F.palm[2] - gz) * u;
    Matrix.FromValuesToRef(rx * u, ry * u, rz * u, 0, ux * u, uy * u, uz * u, 0, fx * u, fy * u, fz * u, 0, tx, ty, tz, 1, this.holdL);
    this.holdL.multiplyToRef(H, mD);
    for (const n of h.chain) n.computeWorldMatrix(true);
    (h.pivot.parent as TransformNode).getWorldMatrix().invertToRef(mA);
    mD.multiplyToRef(mA, mB);
    mB.decompose(vS, qR, vT);
    h.pivot.position.copyFrom(vT);
    if (h.pivot.rotationQuaternion) h.pivot.rotationQuaternion.copyFrom(qR);
    else h.pivot.rotationQuaternion = qR.clone();
    h.pivot.computeWorldMatrix(true);
  }

  /**
   * One frame of locomotion in move set `set` (`dt` s), and (slice e) the action `act` over it, if any. Moving clips
   * share one cycle clock so the feet agree while they blend; a set change crossfades over `SET_FADE`.
   */
  update(i: LocoIn, set: LocoSet, dt: number, act?: ActionOut): void {
    if (!this.ready) return;
    this.set = set;
    // (slice g) the spine bends to the aim pitch while a gun is up (no action playing), eased
    const armed = (set === 'rifle' || set === 'pistol') && !act?.clip;
    const pitchWant = armed ? (i.aimPitch ?? 0) * Math.min(1, Math.max(0, i.aim ?? 0)) : 0;
    const k = dt > 0 ? Math.min(1, dt / PITCH_EASE) : 1;
    this.pitch += (Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pitchWant)) - this.pitch) * k;
    const step = dt > 0 ? dt / SET_FADE : 1;
    let sum = 0;
    for (let s = 0; s < LOCO_SETS.length; s++) {
      const want = LOCO_SETS[s] === set ? 1 : 0;
      const v = this.setW[s] as number;
      const n = want > v ? Math.min(want, v + step) : Math.max(want, v - step);
      this.setW[s] = n;
      sum += n;
    }
    locoBlend(i, this.w, this.ratio);
    this.clipW.fill(0);
    let rate = 0, mw = 0;
    for (let s = 0; s < LOCO_SETS.length; s++) {
      const sw = (this.setW[s] as number) / (sum || 1);
      if (sw <= 0) continue;
      for (let k = 0; k < LOCO_N; k++) {
        const wk = sw * (this.w[k] as number);
        const ci = this.table[s * LOCO_N + k] as number;
        if (wk <= 0 || ci < 0) continue;
        this.clipW[ci] = (this.clipW[ci] as number) + wk;
        const c = this.clips[ci]!;
        if (!c.moves) continue;
        rate += (wk * (this.ratio[k] as number)) / c.cycle;
        mw += wk;
      }
    }
    if (mw > 0) rate /= mw;
    // (slice e) an action fades over the locomotion (ACT_FADE); a new action takes over at once
    const want = act?.clip ? (this.actions.get(act.clip) ?? null) : null;
    if (want && want !== this.act) {
      if (this.act) this.act.weight = 0;
      this.act = want;
      want.speedRatio = 1;
    }
    const aStep = dt > 0 ? dt / ACT_FADE : 1;
    this.actW = want ? Math.min(1, this.actW + aStep) : Math.max(0, this.actW - aStep);
    const keep = 1 - this.actW;
    for (let ci = 0; ci < this.clips.length; ci++) {
      const c = this.clips[ci]!;
      c.g.weight = (this.clipW[ci] as number) * keep;
      // idles keep their own clock; moving clips run on the shared rate (cycle-normalised)
      c.g.speedRatio = !c.moves || mw <= 0 ? 1 : rate * c.cycle;
    }
    const a = this.act;
    if (a) {
      a.weight = this.actW;
      // a timed action is pinned to the game's progress; a looping one runs on its own clock
      if (want && act && !Number.isNaN(act.t)) {
        a.speedRatio = 0;
        a.goToFrame(a.from + act.t * (a.to - a.from));
      } else a.speedRatio = 1;
      if (this.actW <= 0) this.act = null;
    }
    // (slice g) hanging, shimmying, on a ladder and early in a climb-up the body is placed by its hands on the rig's
    const an = a ? (a.name.split(':').pop() ?? '') : '';
    const climb = an === 'hang_climb_up' && act && !Number.isNaN(act.t) ? 1 - Math.min(1, Math.max(0, (act.t - ANCHOR_CLIMB_FROM) / ANCHOR_CLIMB_SPAN)) : 1;
    this.anchorW = a && ANCHORED.has(an) ? this.actW * climb : 0;
  }

  /**
   * (slice g) Rig hand nodes (the wrists) the body's hands are pinned to while an anchored action plays (hang, shimmy,
   * ladder, early climb-up): the whole body shifts up or down so its hands' midpoint meets theirs in height (the rig's hands are on the lip /
   * rungs; a Mixamo clip's own hands are wherever its take had them).
   */
  anchorHands(left: TransformNode, right: TransformNode): void {
    this.anchors = { l: left, r: right };
  }

  private anchorBody(): void {
    const a = this.anchors;
    const w = this.anchorW;
    if (!a || (w <= 1e-3 && !this.anchored)) return;
    this.root.position.x = 0;
    this.root.position.z = 0;
    this.root.position.y = this.baseY;
    this.anchored = w > 1e-3;
    if (!this.anchored) return;
    for (let p: TransformNode | null = this.root; p; p = p.parent instanceof TransformNode ? p.parent : null) p.computeWorldMatrix(true);
    const L = this.hands[0], R = this.hands[1];
    if (!L || !R) return;
    for (const n of [...chainBelow(L, this.root), L, R]) n.computeWorldMatrix(true);
    for (const n of [...chainBelow(a.l, this.rigRoot ?? this.root), a.l, a.r]) n.computeWorldMatrix(true);
    const ml = L.getAbsolutePosition(), mr = R.getAbsolutePosition();
    const rl = a.l.getAbsolutePosition(), rrp = a.r.getAbsolutePosition();
    // the height gap (rig hands' midpoint - body hands' midpoint), into the parent's frame, weighted; height only: the
    // rig's hands rest on top of the lip, inside the wall's footprint, and the body keeps its own distance from the wall
    vT2.set(0, (rl.y + rrp.y - ml.y - mr.y) * 0.5 * w, 0);
    (this.root.parent as TransformNode).getWorldMatrix().invertToRef(mA);
    Vector3.TransformNormalToRef(vT2, mA, vS);
    this.root.position.addInPlace(vS);
    this.root.computeWorldMatrix(true);
  }

  /** The weight each clip plays at now, by name (tests and the e2e read it; an action's weight beside the locomotion's). */
  weights(): Record<string, number> {
    const out: Record<string, number> = {};
    const keep = 1 - this.actW;
    for (let ci = 0; ci < this.clips.length; ci++) out[this.clips[ci]!.g.name.split(':').pop() ?? ''] = (this.clipW[ci] as number) * keep;
    if (this.act) out[this.act.name.split(':').pop() ?? ''] = this.actW;
    return out;
  }

  /** The first mesh (an owner's visibility checks watch it), or null before the model is in. */
  get firstMesh(): AbstractMesh | null {
    return this.meshes[0] ?? null;
  }

  setEnabled(on: boolean): void {
    this.root.setEnabled(on);
  }

  dispose(): void {
    this.disposed = true;
    if (this.followObs) this.scene.onAfterAnimationsObservable.remove(this.followObs);
    for (const g of this.groups) g.dispose();
    this.root.dispose(false, true);
  }
}
