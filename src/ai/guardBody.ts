/**
 * (guard-models G7) A human guard's drawn body: the operator-pipeline `GuardFigure` (G5) over his CharacterRig, with
 * his look (G6 `guardVariant` from the 7-bit look seed, G6n) and his gameplay gear (`applyGear`, A5) as the visible
 * pieces, and his tint table (`guardTints`, SPEC 8). Behind `flags.guardModels` (A10: `?guardmodels=0` keeps the
 * merged S1 body); render only, gameplay reads none of it (hit volumes, perception and the light meter read the rig).
 *
 * - Built right after the rig (the figure measures the rig's rest), on the host's guards (`Enemy`), the co-op client's
 *   puppets (`EnemyPuppet`) and the fresh rigs of carried bodies (`buildBodyRig`); the dog keeps its own model.
 * - The merged body (or the parts) stays drawn until the figure's first LOD is ready, then is disabled: no invisible
 *   guard on a slow load (a failed load leaves the merged body).
 * - Once per render (one observer per scene, before the active meshes are evaluated): thermal heat (the rig's
 *   `heat`), the owner's hit flash, then the figure's LOD pick and pose, skipped while the owner's guard-render S4 anim
 *   tier skipped the rig's solve (`skip`). A ragdoll and a carried body pose every frame (G5's world path).
 * - Look and gear changes rewrite the figure's pieces / tints only on a real change. No allocation per frame.
 * - The body follows its rig: a dead guard's rig goes on as his `Body` (ragdoll, carry), and the figure goes with it
 *   (`guardBodyOf(rig)`); it is disposed with the rig (each owner disposes it first; the rig root's dispose is the
 *   fallback for paths that only drop the rig, e.g. the co-op client's ragdolls).
 */
import type { AbstractMesh, Camera, Observer, Scene } from '../core/babylon';
import { flags } from '../core/flags';
import type { CharacterRig } from '../player/characterRig';
import type { World } from '../world/world';
import type { Faction } from '../world/mapDef';
import { GuardFigure, guardLibrary } from '../operators/runtime/guardFigure';
import { LOD_2 } from '../operators/runtime/manifest';
import { pageLeaving, warmPlayLods } from '../operators/runtime/offline';
import { guardAsset, guardPlayUrls } from '../operators/guards/guardAssets';
import { applyGear, createPieces, createVariant, guardVariant, type GuardVariant } from '../operators/guards/guardVariant';
import { guardTints } from '../operators/guards/guardTints';
import type { EnemyDef } from './enemyDefs';
import type { GuardShield } from './guardShield';

/** What a guard body reads from the world: the shadow list and the map (id for the look, faction for the tints). */
export type GuardBodyWorld = Pick<World, 'addShadowCaster' | 'map'>;

/** `?gfx=min` (the logic-test path, software GL): LOD2 only, as Wren (`playerFigure.MIN_LODS`). */
const MIN_LODS = flags.gfx === 'min';

/** Does guard `def` draw as a guard figure (`flags.guardModels`, a human kind)? */
export function guardModelsFor(def: Pick<EnemyDef, 'quadruped'>): boolean {
  return flags.guardModels && !def.quadruped;
}

/** The gear a guard body shows besides his look (the host's `Enemy.helmet` / `armour`, the wire's `AL_HELMET` / `AL_ARMOUR`). */
export interface GuardBodyGear {
  look: number;
  helmet: boolean;
  armour: boolean;
}

interface Live {
  list: GuardBody[];
  obs: Observer<Scene>;
}
const LIVE = new Map<Scene, Live>();
const OF_RIG = new WeakMap<CharacterRig, GuardBody>();

function frameAll(scene: Scene, list: readonly GuardBody[]): void {
  const cams = scene.activeCameras;
  const cam = cams && cams.length ? cams[0]! : scene.activeCamera;
  for (let i = 0; i < list.length; i++) list[i]!.frame(cam);
}

function register(scene: Scene, b: GuardBody): void {
  let live = LIVE.get(scene);
  if (!live) {
    const list: GuardBody[] = [];
    live = { list, obs: scene.onBeforeRenderObservable.add(() => frameAll(scene, list)) };
    LIVE.set(scene, live);
    scene.onDisposeObservable.addOnce(() => LIVE.delete(scene));
  }
  live.list.push(b);
}

function unregister(scene: Scene, b: GuardBody): void {
  const list = LIVE.get(scene)?.list;
  if (!list) return;
  const i = list.indexOf(b);
  if (i < 0) return;
  list[i] = list[list.length - 1]!;
  list.pop();
}

/**
 * (G8 cull) The merged S1 body's culling box in the rig root's space (min x y z, max x y z), or undefined (the rig draws
 * its parts, `?guardmerge=0`: the figure keeps its bind box). Load time only (allocates).
 */
export function mergedBox(rig: Pick<CharacterRig, 'voxel'>): number[] | undefined {
  const b = rig.voxel?.meshes[0]?.getBoundingInfo().boundingBox;
  return b ? [b.minimum.x, b.minimum.y, b.minimum.z, b.maximum.x, b.maximum.y, b.maximum.z] : undefined;
}

/** (tests) The live guard bodies of a scene. */
export function liveGuardBodies(scene: Scene): readonly GuardBody[] {
  return LIVE.get(scene)?.list ?? [];
}

/** The guard body drawn over `rig` (a dead guard's rig as his `Body`), or null. */
export function guardBodyOf(rig: CharacterRig): GuardBody | null {
  return OF_RIG.get(rig) ?? null;
}

export class GuardBody {
  readonly figure: GuardFigure;
  /** Wren's files stand in for this base (G4's are not in the build yet). */
  readonly standIn: boolean;
  /** Hit flash 0..1: the owner writes it each frame (as `CharacterRig.setFlash`). */
  flash = 0;
  /** The owner's anim tier skipped this frame's solve (`GuardAnimTier`): no pose this frame. Cleared every frame. */
  skip = false;
  /** The figure draws (its first LOD is in): the merged body is off. */
  shown = false;
  /** The enforcer's figure shield (`guardShield.ts`; null: none, or the placeholder part), posed and freed with the figure. */
  shield: GuardShield | null = null;
  private readonly variant: GuardVariant = createVariant();
  private readonly pieces = createPieces();
  private readonly tints: Uint8Array;
  private readonly mapId: string;
  private seed = -1;
  private helmet = false;
  private armour = false;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly world: GuardBodyWorld,
    readonly def: EnemyDef,
    readonly rig: CharacterRig,
    name: string,
    gear: GuardBodyGear = { look: 0, helmet: false, armour: false },
  ) {
    this.mapId = (world.map as { id?: string } | undefined)?.id ?? '';
    guardVariant(gear.look, def.kind, this.mapId, this.variant);
    const asset = guardAsset(this.variant.base);
    this.standIn = asset.standIn;
    const m = asset.manifest;
    this.tints = new Uint8Array(m.tintSlots * 3).fill(255);
    // (G8 cull) culled with the merged body's own box: the same camera, cascade and shadow lists as the body it replaces
    this.figure = new GuardFigure(guardLibrary(scene), rig, m, name, { scale: def.height / m.refHeight, box: mergedBox(rig) });
    this.figure.onMeshes = (ms) => {
      for (let i = 0; i < ms.length; i++) world.addShadowCaster(ms[i]!);
      this.ready();
    };
    this.helmet = gear.helmet;
    this.armour = gear.armour;
    this.setLook(gear.look);
    OF_RIG.set(rig, this);
    // (the fallback: a path that only disposes the rig, e.g. the co-op client's ragdoll, still frees the figure)
    rig.root.onDisposeObservable.addOnce(() => this.dispose());
    register(scene, this);
    const f = this.figure;
    (MIN_LODS ? f.load(LOD_2) : f.loadGameLods())
      .catch((e: unknown) => {
        if (!pageLeaving() && !f.isDisposed) console.warn(`[guards] ${m.id} failed to load (the merged body stays)`, e);
      })
      .finally(() => void warmPlayLods(guardPlayUrls([m], MIN_LODS)));
  }

  /** The figure's first LOD is in: the merged body (or the parts) goes; the figure shows from the next render. */
  private ready(): void {
    if (this.shown || this.disposed) return;
    this.shown = true;
    const ms = this.rig.renderMeshes;
    for (let i = 0; i < ms.length; i++) ms[i]!.setEnabled(false);
  }

  /** The mesh an anim tier watches: the figure's shown LOD once it draws (it changes with the LOD), else the merged body's. */
  get viewMesh(): AbstractMesh | null {
    return (this.shown ? this.figure.mesh : null) ?? this.rig.voxel?.meshes[0] ?? null;
  }

  /** His look seed (0-127): variant, tints and pieces again on a change only (a woken guard, the wire seed arriving). */
  setLook(seed: number): void {
    const s = seed & 127;
    if (s === this.seed || this.disposed) return;
    this.seed = s;
    const v = guardVariant(s, this.def.kind, this.mapId, this.variant);
    // the stand-in has no tint mask (Wren's albedo): untinted
    if (!this.standIn) {
      const c = this.def.look.colors;
      const faction = (this.world.map as { theme?: { faction?: Faction } } | undefined)?.theme?.faction ?? 'urban';
      guardTints(v, this.def.kind, faction, { torso: c.torso, helmet: c.helmet }, this.tints);
      this.figure.setTints(this.tints);
    }
    this.applyPieces();
  }

  /** His gameplay gear (A5): the pieces again on a change only. No allocation. */
  setGear(helmet: boolean, armour: boolean): void {
    if (helmet === this.helmet && armour === this.armour) return;
    this.helmet = helmet;
    this.armour = armour;
    this.applyPieces();
  }

  private applyPieces(): void {
    if (this.disposed) return;
    const p = applyGear(this.variant, this.helmet, this.armour, this.def.plated, this.def.kind, this.pieces);
    this.figure.setPieces(p.ids, p.count);
  }

  /** The look seed, helmet and armour now (a carried body's fresh rig takes them over). */
  gear(out: GuardBodyGear): GuardBodyGear {
    out.look = this.seed < 0 ? 0 : this.seed;
    out.helmet = this.helmet;
    out.armour = this.armour;
    return out;
  }

  /** The gameplay helmet / armour bits it shows now (A5). */
  get helmetOn(): boolean {
    return this.helmet;
  }

  get armourOn(): boolean {
    return this.armour;
  }

  /** (tests, e2e) The visible piece ids now (G6's list; the body piece is always shown besides). Allocates. */
  shownPieces(): string[] {
    return this.pieces.ids.slice(0, this.pieces.count);
  }

  /** Once per render (the scene's observer): heat, flash, LOD and pose. No allocation. */
  frame(camera: Camera | null): void {
    if (this.disposed) return;
    const f = this.figure;
    f.setHeat(this.rig.heat);
    f.setFlash(this.flash);
    // (the first show picks a LOD whatever the tier says)
    if (!this.skip || f.current < 0) f.update(camera);
    this.skip = false;
    this.shield?.follow();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    unregister(this.scene, this);
    if (OF_RIG.get(this.rig) === this) OF_RIG.delete(this.rig);
    this.shield?.dispose();
    this.shield = null;
    this.figure.dispose();
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}
