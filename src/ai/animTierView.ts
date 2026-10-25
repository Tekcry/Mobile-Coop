import type { AbstractMesh, Observer, Scene, Vector3 } from '../core/babylon';
import { flags } from '../core/flags';
import { FREEZE_DRAW, FREEZE_LAMP_IN, FREEZE_SHADOW_IN, FreezeLights, guardFrustum } from '../game/sectorGuardFreeze';
import { readFreezeLights, type FreezeCharSlots, type FreezeTorchSlots } from '../game/sectorGuardFreezeView';
import type { CharacterRig, RigPose } from '../player/characterRig';
import { ANIM_TIER_OFFSCREEN, THAW_REPLANT, animTierPeriod, animTierStep, animTierThaw, newAnimTierIn, newAnimTierState, type AnimTierIn, type AnimTierState } from './animTier';

/**
 * (guard-render S4) The scene side of a guard's anim tier (`animTier.ts` has the rules): whether its merged body was
 * drawn in any local view last render, the nearest local camera and player. One observer per scene marks the drawn
 * bodies after each camera's active-mesh evaluation (a mesh that passed that camera's culling was activated with the
 * scene's current render id; shadow and other render-target passes do not fire it). No allocation per frame.
 * (guard-cap T1-SHADOW, A195: Michael 2026-10-25 "shadow in view = seen") A guard the camera did not draw still counts
 * as seen when a shadow of his can fall in that view: the render freeze's frustum test (`guardFrustum`: the moon
 * shadow capsule, each shadowing lamp's shadow volume of him, the torch and character atlas slots) says
 * `FREEZE_SHADOW_IN` / `FREEZE_LAMP_IN`, or `FREEZE_DRAW` (near the camera, a lamp at his body, too many lights). The
 * body bit alone does not count (camera culling is the truth for the body). Frustum only, no occlusion rays: a shadow
 * behind a wall still counts (less saving, never wrong on screen). Render LOD, like the freeze: it reads the camera,
 * the frustum and the shadowing lights, never gameplay state, and gameplay never reads the rig. `?animshadow=0` off.
 */
interface SeenTrack {
  mesh: AbstractMesh;
  /** Frame id of the last render that drew it in a camera view or (T1-SHADOW) had a shadow of his in one. */
  frame: number;
  /** (T1-SHADOW) Frame id of the last render a camera drew it (-1: never). */
  camFrame: number;
  /** (T1-SHADOW) Frame id of the last render the shadow rule marked it (-1: never). */
  shadowFrame: number;
  /** (T1-SHADOW) His feet at the last `dt` (NaN until then). */
  x: number;
  y: number;
  z: number;
  /** (T1-SHADOW) His standing height (m); 0: no shadow test. */
  h: number;
}

/** (T1-SHADOW) Where the shadow rule reads the torch and character shadow atlases (`World` matches it). Read every
 *  frame, never cached: either may be null at load or turned off by the quality setting. */
export interface AnimTierShadowSource {
  readonly torchShadows?: FreezeTorchSlots | null;
  readonly charShadows?: FreezeCharSlots | null;
}

interface LiveScene {
  tracks: SeenTrack[];
  obs: Observer<Scene> | null;
  /** (T1-SHADOW) The frame's shadowing lights, read at most once per frame id (`lightsFrame`). */
  lights: FreezeLights;
  lightsFrame: number;
  /** (T1-SHADOW) The current camera's frustum, 6 x (nx, ny, nz, d). */
  planes: Float64Array;
  /** (T1-SHADOW) Scratch for a character atlas slot's lamp. */
  slot4: Float32Array;
  src: AnimTierShadowSource | null;
  /** (T1-SHADOW, debug) Guards the shadow rule marked in the frame `shadowNFrame`. */
  shadowN: number;
  shadowNFrame: number;
}

const LIVE = new Map<Scene, LiveScene>();

function markSeen(scene: Scene, live: LiveScene): void {
  const rid = scene.getRenderId();
  const fid = scene.getFrameId();
  const tracks = live.tracks;
  if (live.shadowNFrame !== fid) {
    live.shadowNFrame = fid;
    live.shadowN = 0;
  }
  let unseen = false;
  for (let i = tracks.length - 1; i >= 0; i--) {
    const t = tracks[i]!;
    if (t.mesh.isDisposed()) {
      tracks[i] = tracks[tracks.length - 1]!;
      tracks.pop();
      continue;
    }
    if (t.mesh._renderId === rid) t.frame = t.camFrame = fid;
    else if (t.frame !== fid) unseen = true;
  }
  // (T1-SHADOW) the guards this camera did not draw: can a shadow of theirs be in its view?
  if (!unseen || !flags.animShadow) return;
  const cam = scene.activeCamera;
  const fp = scene.frustumPlanes;
  if (!cam || !fp || fp.length < 6) return;
  if (live.lightsFrame !== fid) {
    const src = live.src;
    readFreezeLights(scene, live.lights, src ? src.torchShadows : null, src ? src.charShadows : null, live.slot4);
    live.lightsFrame = fid;
  }
  const pl = live.planes;
  for (let i = 0; i < 6; i++) {
    const p = fp[i]!;
    pl[i * 4] = p.normal.x;
    pl[i * 4 + 1] = p.normal.y;
    pl[i * 4 + 2] = p.normal.z;
    pl[i * 4 + 3] = p.d;
  }
  const c = cam.globalPosition;
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i]!;
    // drawn or marked already, no height, no position yet, or render-frozen (the FROZEN tier owns him)
    if (t.frame === fid || !(t.h > 0) || t.x !== t.x || !t.mesh.isEnabled()) continue;
    const b = guardFrustum(pl, t.x, t.y, t.z, t.h, c.x, c.y, c.z, live.lights);
    if (b === FREEZE_DRAW || (b & (FREEZE_SHADOW_IN | FREEZE_LAMP_IN)) !== 0) {
      t.frame = t.shadowFrame = fid;
      live.shadowN++;
    }
  }
}

function track(scene: Scene, mesh: AbstractMesh, h: number, src: AnimTierShadowSource | null): SeenTrack {
  let live = LIVE.get(scene);
  if (!live) {
    const l: LiveScene = {
      tracks: [],
      obs: null,
      lights: new FreezeLights(),
      lightsFrame: -1,
      planes: new Float64Array(24),
      slot4: new Float32Array(4),
      src: null,
      shadowN: 0,
      shadowNFrame: -1,
    };
    l.obs = scene.onAfterActiveMeshesEvaluationObservable.add(() => markSeen(scene, l));
    LIVE.set(scene, (live = l));
    scene.onDisposeObservable.addOnce(() => LIVE.delete(scene));
  }
  if (live.src === null && src) live.src = src;
  const t: SeenTrack = { mesh, frame: -1, camFrame: -1, shadowFrame: -1, x: Number.NaN, y: Number.NaN, z: Number.NaN, h: h > 0 ? h : 0 };
  live.tracks.push(t);
  return t;
}

/** (T1-SHADOW) Guards the shadow rule counted as seen in the scene's current frame (debug, the measure and look runs). */
export function animTierShadowSeen(scene: Scene): number {
  const live = LIVE.get(scene);
  return live && live.shadowNFrame === scene.getFrameId() ? live.shadowN : 0;
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

  /** `body`: the merged body's full mesh (`rig.voxel.meshes[0]`); null (no merged body): never off-screen.
   *  (T1-SHADOW) `height`: his standing height for the shadow rule (0: no shadow test, camera only); `shadows`: where
   *  the rule reads the torch / character shadow atlases (the `World`). */
  constructor(
    private readonly scene: Scene,
    body: AbstractMesh | null,
    slot: number,
    height = 0,
    shadows: AnimTierShadowSource | null = null,
  ) {
    this.seen = body ? track(scene, body, height, shadows) : null;
    this.st = newAnimTierState(slot);
  }

  /** (guard-models G7) Watch `body` from now on: the guard figure's shown LOD mesh once it draws (it changes with the
   *  LOD), the merged body before. Same mesh, or no track (built without a body): nothing. No allocation. */
  watch(body: AbstractMesh | null): void {
    const t = this.seen;
    if (t && body && t.mesh !== body) t.mesh = body;
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
    i.offPeriod = flags.animOff > 1 ? flags.animOff : ANIM_TIER_OFFSCREEN;
    const t = this.seen;
    if (t) {
      // (T1-SHADOW) his feet for the shadow rule at the next camera evaluation
      t.x = pos.x;
      t.y = pos.y;
      t.z = pos.z;
    }
    i.seen = shown || t === null || t.frame === f;
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
