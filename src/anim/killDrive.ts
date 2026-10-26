/**
 * (piano-knife S1) The paired knife kill's clip on a rig (pure, Babylon-free; no allocation per call). A drive set on a
 * graph (`AnimGraph.kill`) plays a captured clip at a phase the takedown owns (the attacker's move, or the victim's
 * clip on the same clock), mixed over the graph's keyed targets by `w`, with the victim's buckle (a fold of the spine
 * and chest timed to the stab) on top. Unlike the Studio's drive it plays on any rig (it never reads `keyedOk`, so a
 * guard's graph takes it too) and the feet stay the planner's (planted: no treadmill, no clip feet).
 */
import { KQ, mirrorKeyed, mixKeyed, newKeyedPose, sampleKeyed, type KeyedClip, type KeyedPose } from './keyed';
import type { RigTargets } from './animGraph';
import { MOCAP_LAYERS } from './mocap';

export interface KillDrive {
  /** The clip played (null: the drive does nothing). */
  clip: KeyedClip | null;
  /** The clip's phase 0..1 (a one-shot: 1 its last frame). */
  phase: number;
  /** The drive's weight on the keyed targets 0..1. */
  w: number;
  /** The pose mirrored left / right. */
  mirror: boolean;
  /** The buckle's weight 0..1 (`knifeKill.buckleAt`) and its full fold (rad, forward pitch). */
  buckle: number;
  bucklePitch: number;
}

/** A drive and its scratch pose (allocated once). */
export type KillDriveState = KillDrive & { readonly pose: KeyedPose };

export function newKillDrive(): KillDriveState {
  return { clip: null, phase: 0, w: 0, mirror: false, buckle: 0, bucklePitch: 0, pose: newKeyedPose() };
}

/** The buckle's split: the spine takes this share of the fold, the chest the rest. */
const SPINE_SHARE = 0.4;

/** `q[o..o+3]` (x, y, z, w) pre-multiplied by a pitch about x (in the parent frame; + folds forward). No allocation. */
function prePitch(q: Float64Array, o: number, pitch: number): void {
  const sp = Math.sin(pitch / 2);
  const cp = Math.cos(pitch / 2);
  const x = q[o]!;
  const y = q[o + 1]!;
  const z = q[o + 2]!;
  const w = q[o + 3]!;
  q[o] = cp * x + sp * w;
  q[o + 1] = cp * y - sp * z;
  q[o + 2] = cp * z + sp * y;
  q[o + 3] = cp * w - sp * x;
}

/**
 * The graph's hook (end of `AnimGraph.update`, only when a kill drive is set): the clip sampled at `phase` into the
 * drive's scratch pose and mixed into `o.keyed` by `w` (a one-shot by progress: phase 1 is its last frame); the keyed
 * weights raised to at least `w` (body, free arms, the trunk, the mocap share); the clip feet off (the planner keeps the
 * feet planted); then the buckle on the spine (40%) and chest (60%) pitch. No allocation.
 */
export function killDriveTargets(d: KillDrive & { readonly pose?: KeyedPose }, o: RigTargets): void {
  const c = d.clip;
  const w = d.w < 0 ? 0 : d.w > 1 ? 1 : d.w;
  if (c && w > 0 && d.pose) {
    const p = d.phase < 0 ? 0 : d.phase > 1 ? 1 : d.phase;
    sampleKeyed(c, (p * (c.frames - 1)) / c.frames, 1, d.pose, MOCAP_LAYERS);
    if (d.mirror) mirrorKeyed(d.pose);
    // the graph's keyed pose only counts by its own weight: what it had is kept at that share
    mixKeyed(o.keyW > 0 ? o.keyed : d.pose, d.pose, o.keyW > 0 ? w : 1, o.keyed);
    if (o.keyW < w) o.keyW = w;
    if (o.keyArmW < w) o.keyArmW = w;
    if (o.keyMocap < w) o.keyMocap = w;
    o.keyTrunk += (1 - o.keyTrunk) * w;
    o.keyDrawn *= 1 - w;
    o.keyScan *= 1 - w;
    o.keyKneeOut = c.kneeOut;
    o.clipFeet.valid = o.clipFeet.on = false;
  }
  const b = d.buckle * d.bucklePitch;
  if (b !== 0) {
    prePitch(o.keyed.q, KQ.spine, b * SPINE_SHARE);
    prePitch(o.keyed.q, KQ.chest, b * (1 - SPINE_SHARE));
  }
}
