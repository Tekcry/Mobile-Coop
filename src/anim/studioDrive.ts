/**
 * (anim-studio) The Anim Studio's loop player drive (pure, Babylon-free; a dev aid). A drive set on one rig's graph
 * (`AnimGraph.drive`) plays a keyed clip straight onto that rig: the graph's keyed targets are replaced by the clip
 * sampled at the drive's phase (full weight, the trunk, pelvis and free arms), and in place the feet walk a treadmill
 * under the standing root (`studioFeet`), so scrub and step show the whole body. Null on every graph outside the
 * studio: the game never reads a drive.
 *
 * - In place (`inPlace`): the studio owns the phase (advanced by the graph's dt over `cycle`, so the loop's time scale,
 *   the freeze and the step all apply); the planted foot slides back under the body at `pace`, the swing foot arcs
 *   forward (the clip's duty, lift and track half width).
 * - Root motion (not in place): the body walks the studio circle by synthesised input and the clip is sampled on the
 *   graph's own gait clock (the planner's feet), so the legs and the clip agree.
 * - Mirror: the pose mirrored left / right, sampled half a cycle on (as the game's left strafe), so the feet still land
 *   on the clock (left heel strike at 0).
 */
import { mirrorKeyed, sampleKeyed, type KeyedClip } from './keyed';
import type { RigTargets } from './animGraph';
import { TUNE_CUR } from './tune';
import { cqKeyedHold } from './cqGait';
import { MOCAP_LAYERS } from './mocap';
import { mocapSource } from './mocapSources';

export interface StudioDrive {
  /** The clip played (null: the drive does nothing). */
  clip: KeyedClip | null;
  /** In place: the studio owns the phase and the treadmill feet; else the graph's gait clock and the planner's feet. */
  inPlace: boolean;
  /** (anim-studio-2) In place, the phase is set from outside each frame (a pair's one clock): the drive never advances it. */
  held: boolean;
  /** Phase in cycles 0..1 (in place: advanced here; root motion: copied from the graph). */
  phase: number;
  /** Seconds per cycle in place. */
  cycle: number;
  mirror: boolean;
  /** The drawn set (gun out): the trunk shares the gun platform when raised, the arms stay on the gun. */
  drawn: boolean;
  /** Crouched clips (the pelvis offset of the clip is from the standing rest: the body itself stands). */
  crouch: boolean;
  /** Treadmill pace (m/s) and travel direction in the body frame (x right, z forward; unit or zero). */
  pace: number;
  dirX: number;
  dirZ: number;
  /** Written each frame: the phase the pose was sampled at (before the mirror's half cycle). */
  live: number;
  /** The treadmill's contacts last frame (left, right): a heel strike sets the foot's `landed`. */
  inL: boolean;
  inR: boolean;
  /** (anim-n4b) A hold clip: the game's close-quarters layer on its keyed trunk (`cqKeyedHold`): 'still' the hold's
   *  brace (on the drive's time, phase x cycle), 'walk' the hold walk's counter-rotation; 'none' else. */
  cq: 'none' | 'still' | 'walk';
}

export function newStudioDrive(): StudioDrive {
  return { clip: null, inPlace: true, held: false, phase: 0, cycle: 1, mirror: false, drawn: false, crouch: false, pace: 0, dirX: 0, dirZ: 1, live: 0, inL: true, inR: true, cq: 'none' };
}

/** A phase wrapped into 0..1. */
export function wrap01(p: number): number {
  const w = p - Math.floor(p);
  return w >= 1 ? 0 : w;
}

/**
 * The graph's hook (end of `AnimGraph.update`, only when a drive is set): the clip over the targets. No allocation.
 */
export function studioDriveTargets(d: StudioDrive, o: RigTargets, dt: number): void {
  const c = d.clip;
  if (!c) return;
  if (d.inPlace) {
    if (!d.held && dt > 0 && d.cycle > 0) d.phase = wrap01(d.phase + dt / d.cycle);
  } else d.phase = wrap01(o.gait.phase);
  d.live = d.phase;
  // (mixamo-retarget M5) a capture (a row in mocapSources.ts: CMU or Mixamo) plays as the game plays it, on the mocap
  // share: the MOCAP_LAYERS scales (the Body sliders the game keeps off a capture stay off it here too)
  const cap = mocapSource(c.name) !== null;
  sampleKeyed(c, d.mirror ? d.phase + 0.5 : d.phase, 1, o.keyed, cap ? MOCAP_LAYERS : null);
  if (d.mirror) mirrorKeyed(o.keyed);
  if (d.cq !== 'none') cqKeyedHold(o.keyed.pel, o.keyed.q, d.cq === 'walk', d.phase, d.phase * d.cycle); // (anim-n4b)
  o.keyW = 1;
  o.keyArmW = d.drawn ? 0 : 1;
  o.keyHol = d.drawn || d.crouch ? 0 : 1;
  o.keyScan = 0;
  o.keyDrawn = d.drawn ? 1 : 0;
  o.keyTrunk = d.drawn ? 1 - o.aimW : 1;
  o.keyKneeOut = c.kneeOut;
  // (mocap-trial) the loop player's clip is not the mocap gait: no clip feet (the treadmill's feet); (M5) a capture's
  // pose is the whole mocap share (the rig's layer scales: pelvis follow, elbow out, the run carriage), a hand-made clip none
  o.keyMocap = cap ? 1 : 0;
  o.clipFeet.valid = o.clipFeet.on = false;
  if (d.inPlace) {
    o.gait.phase = d.phase;
    o.gait.duty = c.duty;
    // (marlow-bays item 29) the Body sliders "Foot width" and "Knee lift" reach the clip on the spot as in the game
    // (identity outside the local player's tuning window)
    o.gait.liftH = c.liftH * TUNE_CUR.kneeLiftMul;
    o.gait.moving = d.pace > 0;
  }
}

/** A foot the treadmill writes (the planner's `FootState` fields it sets). */
export interface StudioFoot {
  x: number;
  y: number;
  z: number;
  yaw: number;
  contact: boolean;
  swing: number;
  pitch: number;
  landed: boolean;
  init: boolean;
  /** (anim-natural N1) The planner holds this foot at its contact (its ball pivot's anchor); the treadmill lets it go. */
  anchored?: boolean;
}

/** One foot of the treadmill in the body frame (x right, z forward, lift up), for `side` -1 left / 1 right. */
export interface TreadOut {
  x: number;
  z: number;
  lift: number;
  contact: boolean;
  swing: number;
}

/**
 * The treadmill foot at the drive's phase (body frame at 1.75 m scaled by `scale`): the left heel strikes at phase 0,
 * the right at 0.5; in stance the foot slides back along the travel by the stance distance (pace x cycle x duty), in
 * the swing it arcs forward (smoothstep along, the clip's lift as a half sine). No allocation.
 */
export function treadmillFoot(d: StudioDrive, side: -1 | 1, scale: number, out: TreadOut): TreadOut {
  const c = d.clip;
  const duty = c ? Math.min(0.95, Math.max(0.05, c.duty)) : 0.6;
  const half = (c ? c.half : 0.08) * scale * TUNE_CUR.trackMul;
  const lift = (c ? c.liftH : 0) * scale * TUNE_CUR.kneeLiftMul;
  const u = wrap01(d.phase - (side < 0 ? 0 : 0.5));
  const S = Math.max(0, d.pace) * d.cycle * duty;
  let along: number;
  if (u < duty) {
    along = S * (0.5 - u / duty);
    out.lift = 0;
    out.contact = true;
    out.swing = -1;
  } else {
    const s = (u - duty) / (1 - duty);
    const e = s * s * (3 - 2 * s);
    along = S * (e - 0.5);
    out.lift = S > 0 ? lift * Math.sin(Math.PI * s) : 0;
    out.contact = S <= 0;
    out.swing = S > 0 ? s : -1;
  }
  const dx = d.mirror ? -d.dirX : d.dirX;
  out.x = side * half + dx * along;
  out.z = d.dirZ * along;
  return out;
}

const TL: TreadOut = { x: 0, z: 0, lift: 0, contact: true, swing: -1 };

/**
 * The rig's hook (after the foot planner, only when a drive is set): in place, the treadmill feet replace the planner's
 * under the standing root (`yaw` the root's). Off or with root motion: nothing. No allocation.
 */
export function studioFeet(d: StudioDrive, pl: { L: StudioFoot; R: StudioFoot }, rx: number, ry: number, rz: number, yaw: number, scale: number): void {
  if (!d.clip || !d.inPlace) return;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (let k = 0; k < 2; k++) {
    const f = k === 0 ? pl.L : pl.R;
    treadmillFoot(d, k === 0 ? -1 : 1, scale, TL);
    f.x = rx + TL.x * c + TL.z * s;
    f.z = rz - TL.x * s + TL.z * c;
    f.y = ry + TL.lift;
    f.yaw = yaw;
    f.pitch = 0;
    const was = k === 0 ? d.inL : d.inR;
    f.landed = TL.contact && !was;
    if (k === 0) d.inL = TL.contact;
    else d.inR = TL.contact;
    f.contact = TL.contact;
    f.swing = TL.swing;
    f.init = true;
    // (anim-natural N1 fix round, CHECK finding 9) the treadmill owns the feet: the planner's anchor is let go, or the
    // planner put the foot back on its stale ball spot each frame before this ran (and on the frame the drive goes off)
    f.anchored = false;
  }
}
