/**
 * (piano-knife S1, BRIEF A14) The paired knife kill's contacts: one place for the pairing, used by the takedown now
 * (`TakedownController`, solo / host) and by S3's remote poses later. Render-frame helpers; no allocation per call
 * (module scratch).
 *
 * - `victimRoot`: the guard's root and facing from the attacker's (the row's offset in his frame), eased from where the
 *   guard stood over the grab: attached, not placed once.
 * - `attackerHands`: the grip hand (left) on the guard's mouth or shoulder, the knife hand (right) from a wind-up point to
 *   the row's target, the knife tip (not the wrist) on it from contact to `limp`.
 * - `victimHands`: the guard's hands on the attacker's gripping forearm (0.40 and 0.75 of elbow to wrist).
 * - `contactErrors`: each contact's miss of its mark (m), for tests and S2's measure script.
 *
 * The rig's world grips (`reachL` / `reachR` without a grip axis) put the wrist `hand.len x 0.45` back from the target
 * along the shoulder's line; the hand itself then hangs off the wrist by its own frame. So a contact is placed by the
 * wrist: the wrist goes where the hand point (palm, knife tip) lands on its mark with the hand's offset from the wrist
 * as it was last drawn, and the reach target is that wrist plus the rig's `back` along the shoulder line. The offset
 * turns little between frames, so the hand point lands within millimetres.
 */
import { Vector3 } from '../core/babylon';
import type { CharacterRig, WorldTarget } from '../player/characterRig';
import { clearGripAxis } from '../player/attachGrips';
import { wrapPi } from '../anim/motion';
import { holdHandTargets } from './closeQuarters';
import { KNIFE, type KnifeKillRow } from './knifeKill';
import { WREN_HANDS } from '../operators/handFrame';

/** What a pair reads of the knife: its tip in world space (`KnifeModel.tipWorld`). */
export interface KnifeTip {
  tipWorld(out: Vector3): Vector3;
}

/** Marks on the guard (m, in his frame: forward, right, up from the joint named). The mouth as the interrogation's jaw
 *  hold (`takedownController` grabHands), the knife targets on his body's surface. */
export const KNIFE_MARKS = {
  mouth: { fwd: 0.09, down: 0.07 },
  kidney: { fwd: -0.1, right: 0.07, up: 0 },
  neck: { fwd: -0.02, right: 0.06, up: 0 },
  chest: { fwd: 0.12, right: 0.03, up: 0 },
  /** The guard's hands on the attacker's forearm: these shares of elbow to wrist (right hand, left hand), the palm this
   *  far off the bone line towards his own shoulder (on the sleeve, not inside it). */
  foreR: 0.75,
  foreL: 0.4,
  foreOut: 0.035,
  /** The knife hand's wind-up: this far back from the target along the attacker's facing. */
  windUp: 0.25,
} as const;

/**
 * One hand's tracking state (per pair, allocated once): the mark's last place (the next is extrapolated one frame on,
 * since the contacts are set before the rigs pose) and a trim that takes out what the rig's later layers (joint limits,
 * the elbow's self-collision, the trunk layers after the arm solve) leave of the hand's miss, measured on the last drawn
 * frame. `on` false: the next call starts afresh.
 */
export interface HandTrack {
  on: boolean;
  mx: number;
  my: number;
  mz: number;
  ix: number;
  iy: number;
  iz: number;
}

/** The pair's four hands (attacker left, right; guard right, left). */
export interface PairTrack {
  readonly aL: HandTrack;
  readonly aR: HandTrack;
  readonly vR: HandTrack;
  readonly vL: HandTrack;
}

const newHand = (): HandTrack => ({ on: false, mx: 0, my: 0, mz: 0, ix: 0, iy: 0, iz: 0 });

export function newPairTrack(): PairTrack {
  return { aL: newHand(), aR: newHand(), vR: newHand(), vL: newHand() };
}

/** Every hand starts afresh (a new move). */
export function resetPairTrack(t: PairTrack): void {
  t.aL.on = t.aR.on = t.vR.on = t.vL.on = false;
}

/** The trim's gain per frame and its largest size (m). */
export const PAIR_TRACK = { gain: 0.7, predict: 1 };
const TRIM_MAX = 0.1;
const TRIM_SETTLED = 0.06;

/** The pose of the guard's root (feet) and facing. */
export interface RootOut {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

const ease = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * The guard's root: the row's spot is the attacker's root plus `standoff` forward and `side` right in his frame, facing
 * `ayaw + yawOff`; `k` (0..1, eased over the grab) blends from where the guard stood (`from*`) to it. A corner kill so
 * pulls him round to the attacker's side of the corner (Campaign PB3). No allocation.
 */
export function victimRoot(row: KnifeKillRow, ax: number, ay: number, az: number, ayaw: number, k: number, fromX: number, fromZ: number, fromYaw: number, out: RootOut): RootOut {
  const s = Math.sin(ayaw);
  const c = Math.cos(ayaw);
  const sx = ax + s * row.standoff + c * row.side;
  const sz = az + c * row.standoff - s * row.side;
  const sy = ayaw + row.yawOff;
  const u = k <= 0 ? 0 : k >= 1 ? 1 : k;
  out.x = fromX + (sx - fromX) * u;
  out.y = ay;
  out.z = fromZ + (sz - fromZ) * u;
  out.yaw = u >= 1 ? wrapPi(sy) : fromYaw + wrapPi(sy - fromYaw) * u;
  return out;
}

// ---- marks (world, this frame) ----

const mA = new Vector3();
const mB = new Vector3();
const mC = new Vector3();
const mD = new Vector3();
const hl = { x: 0, y: 0, z: 0 };
const hr = { x: 0, y: 0, z: 0 };

function abs(n: { computeWorldMatrix(force: boolean): unknown; getAbsolutePosition(): Vector3 }): Vector3 {
  n.computeWorldMatrix(true);
  return n.getAbsolutePosition();
}

/** The grip hand's mark on the guard (`vr`): his mouth (the jaw hold) or the top of his shoulder on her left-hand side
 *  (`holdHandTargets`' shoulder point: his left from behind, his right face to face). */
export function gripMark(row: KnifeKillRow, vr: CharacterRig, out: Vector3): Vector3 {
  const yaw = vr.root.rotation.y;
  if (row.grip === 'mouth') {
    const h = abs(vr.headNode);
    const M = KNIFE_MARKS.mouth;
    return out.set(h.x + Math.sin(yaw) * M.fwd, h.y - M.down, h.z + Math.cos(yaw) * M.fwd);
  }
  const n = abs(vr.neck);
  const nx = n.x;
  const ny = n.y;
  const nz = n.z;
  const s = abs(row.yawOff === 0 ? vr.shoulderL : vr.shoulderR);
  holdHandTargets(nx, ny, nz, s.x, s.y, s.z, yaw, hl, hr);
  return out.set(hr.x, hr.y, hr.z);
}

/** The knife's target on the guard: his kidney (from behind), the side of his neck, his chest (from the front). */
export function knifeMark(row: KnifeKillRow, vr: CharacterRig, out: Vector3): Vector3 {
  const yaw = vr.root.rotation.y;
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  const M = KNIFE_MARKS[row.target];
  const j = abs(row.target === 'kidney' ? vr.spine : row.target === 'neck' ? vr.neck : vr.torso);
  // his forward (s, c), his right (c, -s)
  return out.set(j.x + s * M.fwd + c * M.right, j.y + M.up, j.z + c * M.fwd - s * M.right);
}

/** A guard's palm mark on the attacker's left forearm: `share` of elbow to wrist, `foreOut` off the bone line towards
 *  the guard's shoulder on that side (`side` 1 right, -1 left). */
export function forearmMark(ar: CharacterRig, vr: CharacterRig, share: number, side: 1 | -1, out: Vector3): Vector3 {
  const e = abs(ar.elbowL);
  const ex = e.x;
  const ey = e.y;
  const ez = e.z;
  const w = abs(ar.wristL);
  const dx = w.x - ex;
  const dy = w.y - ey;
  const dz = w.z - ez;
  out.set(ex + dx * share, ey + dy * share, ez + dz * share);
  const sh = abs(side > 0 ? vr.shoulderR : vr.shoulderL);
  let ox = sh.x - out.x;
  let oy = sh.y - out.y;
  let oz = sh.z - out.z;
  const L2 = dx * dx + dy * dy + dz * dz;
  if (L2 > 1e-8) {
    const k = (ox * dx + oy * dy + oz * dz) / L2;
    ox -= dx * k;
    oy -= dy * k;
    oz -= dz * k;
  }
  const L = Math.sqrt(ox * ox + oy * oy + oz * oz);
  if (L > 1e-6) out.set(out.x + (ox / L) * KNIFE_MARKS.foreOut, out.y + (oy / L) * KNIFE_MARKS.foreOut, out.z + (oz / L) * KNIFE_MARKS.foreOut);
  return out;
}

/** A hand's palm point (world): `hand.len x 0.45` down the wrist's own frame (a rig without hands of its own, as its
 *  `weaponSocket`: the guards). */
export function palmWorld(rig: CharacterRig, side: 1 | -1, out: Vector3): Vector3 {
  const m = (side > 0 ? rig.wristR : rig.wristL).computeWorldMatrix(true);
  return Vector3.TransformCoordinatesFromFloatsToRef(0, -rig.p.hand.len * 0.45, 0, m, out);
}

/** An operator's palm centre (world): her hands' rest frame (`WREN_HANDS`, every operator body: `playerFigure`). */
export function operatorPalm(rig: CharacterRig, side: 1 | -1, out: Vector3): Vector3 {
  const m = (side > 0 ? rig.wristR : rig.wristL).computeWorldMatrix(true);
  const h = (side > 0 ? WREN_HANDS.R : WREN_HANDS.L).palm;
  return Vector3.TransformCoordinatesFromFloatsToRef(h[0], h[1], h[2], m, out);
}

const cmd = { x: 0, y: 0, z: 0 };

/**
 * Where to send a hand point (palm or knife tip, `h*` as last drawn) so it lands on `mark` this frame, into `cmd`: the
 * mark one frame on (its last step again: the contacts are set before the rigs pose) plus the trim (`tr`: the settled
 * miss left on the last drawn frame, integrated). No allocation.
 */
function track(mark: Vector3, hx: number, hy: number, hz: number, w: number, tr: HandTrack | null): void {
  cmd.x = mark.x;
  cmd.y = mark.y;
  cmd.z = mark.z;
  if (!tr) return;
  if (w <= 0) {
    tr.on = false;
    return;
  }
  if (tr.on) {
    const ex = mark.x - hx;
    const ey = mark.y - hy;
    const ez = mark.z - hz;
    // only a settled hand's miss (the rig's later layers), never the arm still on its way
    if (w >= 0.99 && ex * ex + ey * ey + ez * ez < TRIM_SETTLED * TRIM_SETTLED) {
      tr.ix += ex * PAIR_TRACK.gain;
      tr.iy += ey * PAIR_TRACK.gain;
      tr.iz += ez * PAIR_TRACK.gain;
      const L = Math.sqrt(tr.ix * tr.ix + tr.iy * tr.iy + tr.iz * tr.iz);
      if (L > TRIM_MAX) {
        tr.ix *= TRIM_MAX / L;
        tr.iy *= TRIM_MAX / L;
        tr.iz *= TRIM_MAX / L;
      }
    }
    cmd.x += (mark.x - tr.mx) * PAIR_TRACK.predict + tr.ix;
    cmd.y += (mark.y - tr.my) * PAIR_TRACK.predict + tr.iy;
    cmd.z += (mark.z - tr.mz) * PAIR_TRACK.predict + tr.iz;
  } else {
    tr.ix = tr.iy = tr.iz = 0;
    tr.on = true;
  }
  tr.mx = mark.x;
  tr.my = mark.y;
  tr.mz = mark.z;
}

/** The rig's palm depth under a world grip (`characterRig` PALM_DEPTH): a grip radius of minus it puts the palm centre
 *  on the grip point. */
const PALM_DEPTH = 0.014;

/**
 * An operator's hand on a world grip (`solveWorldGrip`: her hands' own frame, the palm centre on the point) along the
 * horizontal axis (`ax`, `az`, unit): across her body, so the hand's frame is the overhand bar grip (palm forward,
 * knuckles up), fixed to her facing whatever the arm does. No allocation.
 */
function palmGrip(t: WorldTarget, x: number, y: number, z: number, ax: number, az: number, w: number): void {
  t.w = w;
  t.x = t.cx = x;
  t.y = t.cy = y;
  t.z = t.cz = z;
  t.ax = ax;
  t.ay = 0;
  t.az = az;
  t.rad = -PALM_DEPTH;
  t.hook = 0;
}

/**
 * A guard's hand (no hands of its own): the wrist moves by the hand point's miss of `cmd`, the reach target is that
 * wrist plus the rig's `back` along the shoulder line (`solveArm`). No allocation.
 */
function wristReach(rig: CharacterRig, side: 1 | -1, t: WorldTarget, hx: number, hy: number, hz: number, w: number): void {
  clearGripAxis(t);
  t.w = w;
  if (w <= 0) return;
  const wr = abs(side > 0 ? rig.wristR : rig.wristL);
  const wx = cmd.x - (hx - wr.x);
  const wy = cmd.y - (hy - wr.y);
  const wz = cmd.z - (hz - wr.z);
  const S = abs(side > 0 ? rig.shoulderR : rig.shoulderL);
  const dx = wx - S.x;
  const dy = wy - S.y;
  const dz = wz - S.z;
  const L = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const back = L > 1e-4 ? (rig.p.hand.len * 0.45) / L : 0;
  t.x = wx + dx * back;
  t.y = wy + dy * back;
  t.z = wz + dz * back;
}

/**
 * The attacker's hands (render frame, before the rigs pose). `ph` the move's phase, `sinceContact` s from the stab
 * (negative before it), `wGrip` the hands' weight (in from the press, held to `limp`, out over `release`): the left
 * palm on the grip mark; the right from the wind-up point (`windUp` back along her facing from the target) to the
 * target over `stabIn` (ending `lead` s before contact), the knife tip on it (no knife: the palm). Both on world grips
 * across her body (`palmGrip`), so the knife's offset from the palm turns only with her facing. `tr` the pair's
 * tracking (null: none). No allocation.
 */
export function attackerHands(row: KnifeKillRow, ph: number, sinceContact: number, ar: CharacterRig, vr: CharacterRig, knife: KnifeTip | null, wGrip: number, tr: PairTrack | null = null): void {
  void ph;
  const ay = ar.root.rotation.y;
  const rx = Math.cos(ay);
  const rz = -Math.sin(ay);
  gripMark(row, vr, mA);
  operatorPalm(ar, -1, mB);
  track(mA, mB.x, mB.y, mB.z, wGrip, tr ? tr.aL : null);
  palmGrip(ar.reachL, cmd.x, cmd.y, cmd.z, rx, rz, wGrip);
  knifeMark(row, vr, mA);
  const k = ease((sinceContact + KNIFE.stabIn + KNIFE.lead) / KNIFE.stabIn);
  if (k < 1) {
    const W = KNIFE_MARKS.windUp * (1 - k);
    mA.x -= Math.sin(ay) * W;
    mA.z -= Math.cos(ay) * W;
  }
  operatorPalm(ar, 1, mB);
  if (knife) knife.tipWorld(mC);
  else mC.copyFrom(mB);
  track(mA, mC.x, mC.y, mC.z, wGrip, tr ? tr.aR : null);
  // the palm where the tip lands there (the knife's offset from the palm as last drawn)
  palmGrip(ar.reachR, cmd.x - (mC.x - mB.x), cmd.y - (mC.y - mB.y), cmd.z - (mC.z - mB.z), rx, rz, wGrip);
}

/** The guard's hands' weight `sinceContact` s from the stab: in over `victimHandsIn` before it, held to `limp`, out over
 *  `release`. */
export function victimHandsW(row: KnifeKillRow, sinceContact: number): number {
  const inW = ease((sinceContact + KNIFE.victimHandsIn + KNIFE.lead) / KNIFE.victimHandsIn);
  const toLimp = (row.limp - row.contact) * row.seconds;
  return inW * (1 - ease((sinceContact - toLimp) / KNIFE.release));
}

/** The guard's hands on the attacker's gripping (left) forearm, right hand nearer her wrist. No allocation. */
export function victimHands(row: KnifeKillRow, sinceContact: number, ar: CharacterRig, vr: CharacterRig, tr: PairTrack | null = null): void {
  const w = victimHandsW(row, sinceContact);
  forearmMark(ar, vr, KNIFE_MARKS.foreR, 1, mA);
  palmWorld(vr, 1, mB);
  track(mA, mB.x, mB.y, mB.z, w, tr ? tr.vR : null);
  wristReach(vr, 1, vr.reachR, mB.x, mB.y, mB.z, w);
  forearmMark(ar, vr, KNIFE_MARKS.foreL, -1, mA);
  palmWorld(vr, -1, mB);
  track(mA, mB.x, mB.y, mB.z, w, tr ? tr.vL : null);
  wristReach(vr, -1, vr.reachL, mB.x, mB.y, mB.z, w);
}

/** Every hand of the pair off (an abort, the end). */
export function pairHandsOff(ar: CharacterRig | null, vr: CharacterRig | null): void {
  if (ar) ar.reachL.w = ar.reachR.w = 0;
  if (vr) vr.reachL.w = vr.reachR.w = 0;
}

/** Each contact's miss of its mark (m), as drawn now: the grip palm, the knife tip (no knife: the right palm), the
 *  guard's right and left palms. */
export interface ContactErrors {
  grip: number;
  tip: number;
  handR: number;
  handL: number;
}

const dist = (a: Vector3, b: Vector3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/** The contacts' misses now (after both rigs posed). For tests and S2's measure script. No allocation. */
export function contactErrors(row: KnifeKillRow, ar: CharacterRig, vr: CharacterRig, knife: KnifeTip | null, out: ContactErrors): ContactErrors {
  out.grip = dist(operatorPalm(ar, -1, mB), gripMark(row, vr, mA));
  knifeMark(row, vr, mA);
  out.tip = dist(knife ? knife.tipWorld(mB) : operatorPalm(ar, 1, mB), mA);
  forearmMark(ar, vr, KNIFE_MARKS.foreR, 1, mC);
  out.handR = dist(palmWorld(vr, 1, mD), mC);
  forearmMark(ar, vr, KNIFE_MARKS.foreL, -1, mC);
  out.handL = dist(palmWorld(vr, -1, mD), mC);
  return out;
}
