import type { AbstractMesh, Observer, Scene, Vector3 } from '../core/babylon';
import { flags } from '../core/flags';
import type { CharacterRig, RigPose } from '../player/characterRig';
import { THAW_REPLANT, animTierPeriod, animTierStep, animTierThaw, newAnimTierIn, newAnimTierState, type AnimTierIn, type AnimTierState } from './animTier';

/**
 * (guard-render S4) The scene side of a guard's anim tier (`animTier.ts` has the rules): whether its merged body was
 * drawn in any local view last render, the nearest local camera and player. One observer per scene marks the drawn
 * bodies after each camera's active-mesh evaluation (a mesh that passed that camera's culling was activated with the
 * scene's current render id; shadow and other render-target passes do not fire it). No allocation per frame.
 */
interface SeenTrack {
  mesh: AbstractMesh;
  /** Frame id of the last render that drew it in a camera view. */
  frame: number;
}

const LIVE = new Map<Scene, { tracks: SeenTrack[]; obs: Observer<Scene> }>();

function markSeen(scene: Scene, tracks: SeenTrack[]): void {
  const rid = scene.getRenderId();
  const fid = scene.getFrameId();
  for (let i = tracks.length - 1; i >= 0; i--) {
    const t = tracks[i]!;
    if (t.mesh.isDisposed()) {
      tracks[i] = tracks[tracks.length - 1]!;
      tracks.pop();
      continue;
    }
    if (t.mesh._renderId === rid) t.frame = fid;
  }
}

function track(scene: Scene, mesh: AbstractMesh): SeenTrack {
  let live = LIVE.get(scene);
  if (!live) {
    const tracks: SeenTrack[] = [];
    const obs = scene.onAfterActiveMeshesEvaluationObservable.add(() => markSeen(scene, tracks));
    LIVE.set(scene, (live = { tracks, obs }));
    scene.onDisposeObservable.addOnce(() => LIVE.delete(scene));
  }
  const t: SeenTrack = { mesh, frame: -1 };
  live.tracks.push(t);
  return t;
}

export class GuardAnimTier {
  private readonly seen: SeenTrack | null;
  private readonly st: AnimTierState;
  private readonly inp: AnimTierIn = newAnimTierIn();
  private lastFrame = -1;

  /** `body`: the merged body's full mesh (`rig.voxel.meshes[0]`); null (no merged body): never off-screen. */
  constructor(
    private readonly scene: Scene,
    body: AbstractMesh | null,
    slot: number,
  ) {
    this.seen = body ? track(scene, body) : null;
    this.st = newAnimTierState(slot);
  }

  /** The time to solve this frame, or -1 to skip (`CharacterRig.animate`'s `solveDt`). `frozen` (perfg): the render
   *  freeze has his rig root disabled (the FROZEN tier: skip, carry capped; the caller skips `animate` entirely).
   *  `shown`: drawn another way this frame (thermal's door figure), so counted as seen. */
  dt(dt: number, pos: Vector3, players: readonly { feet: Vector3 }[], pinned: boolean, frozen = false, shown = false): number {
    const s = this.scene;
    const i = this.inp;
    i.frozen = frozen;
    i.on = flags.animTier;
    i.pinned = pinned;
    const f = s.getFrameId();
    i.rendered = f !== this.lastFrame;
    this.lastFrame = f;
    i.seen = shown || this.seen === null || this.seen.frame === f;
    let pd = Infinity;
    for (let k = 0; k < players.length; k++) {
      const q = players[k]!.feet;
      const d = (q.x - pos.x) ** 2 + (q.z - pos.z) ** 2;
      if (d < pd) pd = d;
    }
    i.playerDist2 = pd;
    let cd = Infinity;
    const cams = s.activeCameras;
    if (cams && cams.length) {
      for (let k = 0; k < cams.length; k++) {
        const c = cams[k]!.globalPosition;
        const d = (c.x - pos.x) ** 2 + (c.z - pos.z) ** 2;
        if (d < cd) cd = d;
      }
    } else if (s.activeCamera) {
      const c = s.activeCamera.globalPosition;
      cd = (c.x - pos.x) ** 2 + (c.z - pos.z) ** 2;
    }
    i.camDist2 = cd;
    return animTierStep(this.st, animTierPeriod(i), dt);
  }

  /**
   * The guard's render-frame pose update (`Enemy.frame`). (perfg, the FROZEN tier) A rig whose root the render freeze
   * disabled is not animated at all (no solve, no weapon glide; the time carried, capped); (artnext C8) the first solve
   * after a freeze re-plants the feet when he moved more than `THAW_REPLANT` (the C7 thaw normally takes it first).
   * (LR16-6 fix) A frozen rig thermal drew as a door figure this or last frame (`ghostFrame`) is solved as a seen one,
   * so the figure walks with him (at most `THERMAL.doorMax` rigs, CPU only; nothing of him drawn but the figure).
   */
  animate(rig: CharacterRig, dt: number, s: RigPose, players: readonly { feet: Vector3 }[], pinned: boolean): void {
    const ghost = rig.ghostFrame >= 0 && rig.ghostFrame >= this.scene.getFrameId() - 1;
    const frozen = !ghost && !rig.root.isEnabled(false);
    const thawing = this.st.thaw;
    const sd = this.dt(dt, rig.root.position, players, pinned, frozen, ghost);
    if (frozen) return;
    if (thawing) rig.replantIfMoved(THAW_REPLANT);
    rig.animate(dt, s, sd);
  }

  /** (perfg) Frozen at the last update: the next solve is the thaw's. */
  get thawing(): boolean {
    return this.st.thaw;
  }

  /** (artnext C7 / C9) A solve forced outside the frame (the freeze's thaw, a death while frozen): `dt` plus the carried
   *  time, the feet re-planted if he moved (C8); the weapon glide gets the same time. */
  solveNow(rig: CharacterRig, dt: number, s: RigPose): void {
    const sd = animTierThaw(this.st, dt);
    rig.replantIfMoved(THAW_REPLANT);
    rig.animate(sd, s, sd);
  }
}
