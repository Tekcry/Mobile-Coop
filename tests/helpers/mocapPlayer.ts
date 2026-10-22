/**
 * mocap-trial-2 check 3: drive the rig the way player.ts drives it for a CT player. The pace goes through CT's springs
 * (start, stop), `quickStop` is CT.stopBlend always (CT.stopEase while the stop eases out), the stop hold sends
 * `holdSpeed` (the pace at release) for CT.stopHoldTime, the crouch eases over 0.22 s, flicks turn at CT.turnRate (6.1
 * above 4 m/s). Measures each run as CHECK-3 did: the worst pelvis step beyond pace x dt, the worst bone step, the worst
 * ankle-toe step and the worst planted-foot slide.
 */
import { setMocapLocomotion } from '../../src/anim/mocap';
import type { CharacterRig, RigPose } from '../../src/player/characterRig';
import { FOOT_SLIDE } from '../../src/anim/audit/limits';
import { contactSlide } from '../../src/anim/audit/metrics';
import { driveRig, plantSlide, pops, type Plan, type Rec } from './mocapMeasure';

const DT = 1 / 60;
const DEG = 180 / Math.PI;

/** The stick at time t: pace asked (m/s), yaw rate (rad/s), crouch, armed, the mocap switch (toggle runs). */
export interface Stick { v: number; yr: number; crouch?: number; armed?: boolean; mocap?: boolean }
export type Target = (t: number) => Stick;
export type Mode = 'off' | 'on' | 'tgl';

/** CT's flick turn rate at a pace (7.85 rad/s up to 3 m/s, 6.1 from 4). */
export const rateAt = (v: number): number => (v <= 3 ? 7.85 : v >= 4 ? 6.1 : 7.85 + (6.1 - 7.85) * (v - 3));

/** The worst ankle-toe step (deg) in a frame, either foot. */
export function toeStep(R: Rec): number {
  let m = 0;
  for (const [a, b] of [[R.pos.ankleL, R.pos.toeL], [R.pos.ankleR, R.pos.toeR]] as const) {
    for (let f = 1; f < R.n; f++) {
      const p = (f - 1) * 3, q = f * 3;
      const x1 = b[p]! - a[p]!, y1 = b[p + 1]! - a[p + 1]!, z1 = b[p + 2]! - a[p + 2]!;
      const x2 = b[q]! - a[q]!, y2 = b[q + 1]! - a[q + 1]!, z2 = b[q + 2]! - a[q + 2]!;
      const d = (x1 * x2 + y1 * y2 + z1 * z2) / Math.hypot(x1, y1, z1) / Math.hypot(x2, y2, z2);
      m = Math.max(m, Math.acos(Math.max(-1, Math.min(1, d))) * DEG);
    }
  }
  return m;
}

/** The worst hips move in a frame beyond pace x dt (m) and its frame. */
export function pelvisStep(R: Rec): [number, number] {
  const h = R.pos.hips;
  let m = 0, at = -1;
  for (let f = 1; f < R.n; f++) {
    const r = Math.hypot(h[f * 3]! - h[(f - 1) * 3]!, h[f * 3 + 1]! - h[(f - 1) * 3 + 1]!, h[f * 3 + 2]! - h[(f - 1) * 3 + 2]!) - R.speed[f]! * DT;
    if (r > m) { m = r; at = f; }
  }
  return [m, at];
}

export interface PlayerM { pel: number; pelAt: number; bone: number; boneN: string; boneAt: number; toe: number; slide: number }
export function measurePlayer(R: Rec): PlayerM {
  const [p, pa] = pelvisStep(R);
  const q = pops(R);
  return { pel: p, pelAt: pa, bone: q.maxStepDeg, boneN: q.bone, boneAt: q.at, toe: toeStep(R), slide: plantSlide(R, 0.01) };
}
export const fmtPlayer = (m: PlayerM): string =>
  `pel ${(m.pel * 100).toFixed(2)}@${m.pelAt} bone ${m.bone.toFixed(1)} ${m.boneN}@${m.boneAt} toe ${m.toe.toFixed(1)} slide ${(m.slide * 100).toFixed(2)}`;

/** The rules (CHECK-3): bone / ankle-toe <= OFF + 2 deg or <= 24; planted slide < 2 cm (or <= OFF's); pelvis <= max(2 cm, OFF). */
export function playerFails(on: PlayerM, off: PlayerM): string[] {
  const f: string[] = [];
  if (on.bone > 24 && on.bone > off.bone + 2) f.push('BONE');
  if (on.toe > 24 && on.toe > off.toe + 2) f.push('TOE');
  // (mt2-fixC) a slide OFF already has (a crouched sneak flick's band at offset 0.5: OFF 16.9 cm) is OFF's, not the switch's
  if (on.slide >= 0.02 && on.slide > off.slide) f.push('SLIDE');
  if (on.pel > Math.max(0.02, off.pel)) f.push('PEL');
  return f;
}

/** Run a CT-driven plan from a stick target for `steps` 60 Hz steps, recording from `recFrom` s (`onStep`: a probe). */
export function ctRun(target: Target, steps: number, recFrom: number, mode: Mode, onStep?: (rig: CharacterRig, k: number) => void): Promise<Rec> {
  let pace = 0, pv = 0, hold = false, holdSpeed = 0, holdT = 0, easeT = -1, wasMoving = false, holdCrouch = 0;
  let cur: Stick = { v: 0, yr: 0 };
  let crouchK = 0;
  let qs = 0.12;
  const plan: Plan = (_k, t) => {
    const s = target(t);
    cur = s;
    if (mode === 'tgl') setMocapLocomotion(s.mocap ?? true);
    const w = s.v > pace ? 10.5 : 29;
    pv += (w * w * (s.v - pace) - 2 * w * pv) * DT;
    pace += pv * DT;
    if (pace < 0) { pace = 0; pv = 0; }
    if (s.v === 0 && pace < 0.01) { pace = 0; pv = 0; }
    const moving = s.v > 0.05;
    const cr = s.crouch ?? 0;
    if (wasMoving && !moving && pace > 0.02) { hold = true; holdSpeed = pace; holdT = 0; easeT = -1; holdCrouch = cr; }
    if (hold && (moving || cr !== holdCrouch || s.armed)) hold = false;
    if (hold) {
      holdT += DT;
      if (holdT >= 1.7) { hold = false; easeT = 0; }
    } else if (easeT >= 0) {
      easeT += DT;
      if (easeT >= 0.35 || moving) easeT = -1;
    }
    wasMoving = moving;
    qs = easeT >= 0 ? 0.35 : 0.12;
    crouchK = Math.max(0, Math.min(1, crouchK + (cr > crouchK ? 1 : cr < crouchK ? -1 : 0) * DT / 0.22));
    return { speed: pace, yawRate: s.yr, rec: t >= recFrom, crouch: crouchK * crouchK * (3 - 2 * crouchK) };
  };
  setMocapLocomotion(mode === 'tgl' ? (target(0).mocap ?? true) : mode === 'on');
  let patched = false;
  const hook = (rig: CharacterRig, k: number): void => {
    onStep?.(rig, k);
    if (patched) return;
    patched = true;
    const animate = rig.animate.bind(rig);
    rig.animate = (dt: number, p: RigPose) => {
      p.quickStop = qs;
      p.holdSpeed = hold ? holdSpeed : 0;
      p.armed = !!cur.armed;
      animate(dt, p);
    };
  };
  return driveRig(steps, plan, hook).finally(() => setMocapLocomotion(false));
}

/** A plan run OFF and ON (or toggled): both measures. */
export async function ctBoth(target: Target, steps: number, recFrom: number, tgl = false): Promise<{ off: PlayerM; on: PlayerM }> {
  const off = measurePlayer(await ctRun(target, steps, recFrom, 'off'));
  const on = measurePlayer(await ctRun(target, steps, recFrom, tgl ? 'tgl' : 'on'));
  return { off, on };
}

/** CHECK-3 group A: a CT start / stop cycle at pace v, stand s, moving `go` s of each cycle, three cycles. */
export function startStopPlan(v: number, stand: number, go: number): [Target, number] {
  const cyc = go + stand;
  return [(t) => ({ v: t < 1 ? 0 : (t - 1) % cyc < go ? v : 0, yr: 0 }), Math.round(60 * (1 + cyc * 3))];
}

/** CHECK-3 group B: a flick turn on the move every 2 s (both ways) with CT's pace dip, after `off` s. */
export function flickPlan(v: number, ang: number, off: number): Target {
  const r = rateAt(v);
  const dur = ((ang * Math.PI) / 180) / r;
  return (t) => {
    const u = t - 2 - off;
    if (u < 0) return { v, yr: 0 };
    const ph = u % 2;
    const sg = Math.floor(u / 2) % 2 === 0 ? 1 : -1;
    const turning = ph < dur;
    return { v: turning ? v * (1 - (0.55 * ang) / 180) : v, yr: turning ? sg * r : 0 };
  };
}

/** (mt2-fixE) e2e-anim's turn feet numbers for one CT direction change: the planted feet's rendered contact slide (heel,
 *  ball; metrics.ts contactSlide), and the largest planted foot's twist from the body as it lifts (rad). */
export interface TurnFeet { slide: number; heel: number; ball: number; plants: number; lift: number }

/** (mt2-fixE) A CT `ang` deg direction change at pace v (CT's turn rate and pace dip, `sg` the side) after 2 + `off` s,
 *  recorded from 0.2 s before it for 1.6 s, as e2e-anim's turn feet rows measure it. */
export async function turnFeet(v: number, ang: number, off: number, mode: Mode, sg = 1): Promise<TurnFeet> {
  const r = rateAt(v);
  const dur = ((ang * Math.PI) / 180) / r;
  const t0 = 2 + off;
  const tw = [0, 0];
  const on = [false, false];
  let lift = 0;
  const R = await ctRun(
    (t) => {
      const turning = t >= t0 && t < t0 + dur;
      return { v: turning ? v * (1 - (0.55 * ang) / 180) : v, yr: turning ? sg * r : 0 };
    },
    Math.round(60 * (t0 + 1.4)),
    t0 - 0.2,
    mode,
    (rig, k) => {
      if (k * DT < t0 - 0.2) return;
      const yaw = (rig as unknown as { pin: { yaw: number } }).pin.yaw;
      for (let s = 0; s < 2; s++) {
        const f = s === 0 ? rig.planner.L : rig.planner.R;
        if (f.contact) {
          on[s] = true;
          tw[s] = Math.abs(Math.atan2(Math.sin(f.yaw - yaw), Math.cos(f.yaw - yaw)));
        } else {
          if (on[s]) lift = Math.max(lift, tw[s]!);
          on[s] = false;
        }
      }
    },
  );
  const a = contactSlide(R.heelL, R.ballL, R.contactL, FOOT_SLIDE);
  const b = contactSlide(R.heelR, R.ballR, R.contactR, FOOT_SLIDE);
  return { slide: Math.max(a.worst, b.worst), heel: Math.max(a.heelWorst, b.heelWorst), ball: Math.max(a.ballWorst, b.ballWorst), plants: a.plants + b.plants, lift };
}
