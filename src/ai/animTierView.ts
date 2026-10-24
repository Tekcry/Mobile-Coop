import type { AbstractMesh, Observer, Scene, Vector3 } from '../core/babylon';
import { flags } from '../core/flags';
import { animTierPeriod, animTierStep, newAnimTierIn, newAnimTierState, type AnimTierIn, type AnimTierState } from './animTier';

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
  private lastDt = 0;

  /** (guard-models S11) The last update skipped the solve (`dt` returned -1; on master also the FROZEN tier, which
   *  updates through `dt` before `animate` returns): the guard figure skips its pose (`GuardBody.skip`). */
  get skipped(): boolean {
    return this.lastDt < 0;
  }

  /** `body`: the merged body's full mesh (`rig.voxel.meshes[0]`); null (no merged body): never off-screen. */
  constructor(
    private readonly scene: Scene,
    body: AbstractMesh | null,
    slot: number,
  ) {
    this.seen = body ? track(scene, body) : null;
    this.st = newAnimTierState(slot);
  }

  /** (guard-models G7) Watch `body` from now on: the guard figure's shown LOD mesh once it draws (it changes with the
   *  LOD), the merged body before. Same mesh, or no track (built without a body): nothing. No allocation. */
  watch(body: AbstractMesh | null): void {
    const t = this.seen;
    if (t && body && t.mesh !== body) t.mesh = body;
  }

  /** The time to solve this frame, or -1 to skip (`CharacterRig.animate`'s `solveDt`). */
  dt(dt: number, pos: Vector3, players: readonly { feet: Vector3 }[], pinned: boolean): number {
    const s = this.scene;
    const i = this.inp;
    i.on = flags.animTier;
    i.pinned = pinned;
    const f = s.getFrameId();
    i.rendered = f !== this.lastFrame;
    this.lastFrame = f;
    i.seen = this.seen === null || this.seen.frame === f;
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
    this.lastDt = animTierStep(this.st, animTierPeriod(i), dt);
    return this.lastDt;
  }
}
