/**
 * (mixamo-chars, N53) A Mixamo character in the game: the packed model (`scripts/mixamo/pack.mjs`: one GLB per
 * character, every move a glTF animation) loaded once per scene, one instance per body, its moves played directly by
 * Babylon's animation groups and blended by `locomotion.ts`. Render side only: gameplay reads nothing here (the hand-built
 * rig stays under it for gameplay until later slices move the sockets, eye and hit volumes onto the Mixamo bones).
 *
 * Michael's picks (2026-11-02 night): stock Mixamo mannequins for the players (X Bot as Wren, Y Bot as Moth, in the
 * players' colours) and Swat for the guards, ours re-rigged later.
 */
import { LoadAssetContainerAsync, Color3, PBRMaterial, StandardMaterial, TransformNode, type AbstractMesh, type AnimationGroup, type AssetContainer, type Scene } from '../core/babylon';
import { LOCO_CLIPS, LOCO_N, locoBlend, type LocoIn } from './locomotion';
import xbotUrl from './assets/xbot.glb?url';
import ybotUrl from './assets/ybot.glb?url';
import swatUrl from './assets/swat.glb?url';

export type MixamoModel = 'xbot' | 'ybot' | 'swat';
const URLS: Readonly<Record<MixamoModel, string>> = { xbot: xbotUrl, ybot: ybotUrl, swat: swatUrl };

/** Height of every Mixamo body (m): the player's (G74, 1.68 m), so the camera and capsule fit unchanged. */
export const MIXAMO_HEIGHT = 1.68;

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
}

/**
 * One Mixamo body, parented to `parent` (its feet on the parent's origin, facing the parent's +Z). Loads in the
 * background; `ready` is false until then and `update` does nothing.
 */
export class MixamoBody {
  readonly root: TransformNode;
  ready = false;
  failed = false;
  private meshes: AbstractMesh[] = [];
  private groups: AnimationGroup[] = [];
  /** Per locomotion clip: its group (null when the model lacks it), seconds per cycle, last weight. */
  private loco: (AnimationGroup | null)[] = [];
  private cycle = new Float64Array(LOCO_N);
  private w = new Float64Array(LOCO_N);
  private ratio = new Float64Array(LOCO_N);
  private disposed = false;

  constructor(scene: Scene, readonly model: MixamoModel, parent: TransformNode, private readonly opts: MixamoBodyOpts = {}) {
    this.root = new TransformNode(`mixamo-${model}`, scene);
    this.root.parent = parent;
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
    // scale to the game height from the model's bind-pose bounds (Mixamo models differ: X Bot ~1.8 m, Swat ~1.9 m)
    let minY = Infinity, maxY = -Infinity;
    for (const m of this.meshes) {
      m.computeWorldMatrix(true);
      const b = m.getBoundingInfo().boundingBox;
      minY = Math.min(minY, b.minimumWorld.y);
      maxY = Math.max(maxY, b.maximumWorld.y);
    }
    const parentY = this.root.parent instanceof TransformNode ? this.root.parent.getAbsolutePosition().y : 0;
    const h = maxY - minY;
    if (h > 0.1) {
      const s = MIXAMO_HEIGHT / h;
      this.root.scaling.setAll(s);
      this.root.position.y = -(minY - parentY) * s;
    }
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
    for (let k = 0; k < LOCO_N; k++) {
      const g = this.groups.find((x) => x.name.split(':').pop() === LOCO_CLIPS[k]) ?? null;
      this.loco[k] = g;
      if (!g) continue;
      const fps = g.targetedAnimations[0]?.animation.framePerSecond ?? 60;
      this.cycle[k] = Math.max(1 / fps, (g.to - g.from) / fps);
      g.start(true, 1);
      g.weight = k === 0 ? 1 : 0;
    }
    this.ready = true;
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

  /** One frame of locomotion. Forward gaits share one cycle phase so the feet agree while they blend. */
  update(i: LocoIn): void {
    if (!this.ready) return;
    locoBlend(i, this.w, this.ratio);
    // the moving clips' shared rate (cycles per second): their own rate at the blend's ratio, weighted
    let rate = 0, mw = 0;
    for (let k = 0; k < LOCO_N; k++) {
      const wk = this.w[k] as number;
      if (wk <= 0 || k === 0 || k === 7) continue;
      rate += (wk * (this.ratio[k] as number)) / (this.cycle[k] as number);
      mw += wk;
    }
    if (mw > 0) rate /= mw;
    for (let k = 0; k < LOCO_N; k++) {
      const g = this.loco[k];
      if (!g) continue;
      g.weight = this.w[k] as number;
      // idles keep their own clock; moving clips run on the shared rate (cycle-normalised)
      g.speedRatio = k === 0 || k === 7 || mw <= 0 ? 1 : rate * (this.cycle[k] as number);
    }
  }

  setEnabled(on: boolean): void {
    this.root.setEnabled(on);
  }

  dispose(): void {
    this.disposed = true;
    for (const g of this.groups) g.dispose();
    this.root.dispose(false, true);
  }
}
