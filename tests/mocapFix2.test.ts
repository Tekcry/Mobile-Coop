/**
 * (mocap-trial-2, fix 2: the orchestrator's review of PR #159, items 3 / 4 / 5 / 8) The mocap switch's slots and clip
 * feet at the edges the first cut missed:
 * - item 3: the switch turned on mid-walk, or a partner rig first seen already walking, plays no start one-shot (the
 *   slots seed "standing" from the pace on their first frame); a real start from standing still plays it;
 * - item 4: a spin on the spot past 90 deg keeps the turn clip at full weight (no dip every 90 deg) and its replay eases
 *   in from the clip's end pose (no pose jump at the wrap);
 * - item 5: the clip's own duty (the jog's 0.21) reaches the gait clock only while its feet are on (or handed to the
 *   planner by a fast turn alone: clamped there the jog / run turns popped worse, measured); handed over for a part mocap
 *   share (crouching, drawing) the duty goes into the planner's [0.4, 0.75], never moving a window under a foot in the air;
 * - item 8: the switch turned off mid-walk leaves no clip feet state on the planner's feet (the OFF path's state).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import { MOCAP_FEET, MOCAP_SET, MOCAP_SLOT, MocapSlots, setMocapLocomotion } from '../src/anim/mocap';
import { mixKeyed, newKeyedPose, sampleKeyed } from '../src/anim/keyed';
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { proportions } from '../src/player/proportions';
import { driveRig, type Plan } from './helpers/mocapMeasure';
import type { CharacterRig } from '../src/player/characterRig';
import type { FootState } from '../src/anim/footPlanner';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

afterEach(() => {
  setMocapLocomotion(false);
});

const DT = 1 / 60;
const slotsOf = (rig: CharacterRig): MocapSlots => (rig.graph as unknown as { mSlots: MocapSlots }).mSlots;
const walk = (v: number): Plan => () => ({ speed: v, yawRate: 0, rec: false });

describe('mocap fix 2: no start one-shot unless the rig starts from standing (item 3)', () => {
  it('the slots alone: first seen walking, or reset mid-walk, never start; from standing they do', () => {
    const m = new MocapSlots();
    let peak = 0;
    for (let k = 0; k < 120; k++) {
      m.update(DT, MOCAP_SET, 1.4, 0, 0);
      peak = Math.max(peak, m.wStart);
    }
    m.reset();
    for (let k = 0; k < 120; k++) {
      m.update(DT, MOCAP_SET, 1.4, 0, 0);
      peak = Math.max(peak, m.wStart);
    }
    expect(peak).toBe(0);
    for (let k = 0; k < 30; k++) m.update(DT, MOCAP_SET, 0, 0, 0);
    for (let k = 0; k < 30; k++) {
      m.update(DT, MOCAP_SET, 1.4, 0, 0);
      peak = Math.max(peak, m.wStart);
    }
    expect(peak).toBeGreaterThan(0.5);
  });

  it('on the rig: the switch turned on mid-walk at 1.4 m/s, and a rig first seen walking, play no start', async () => {
    let peak = 0;
    setMocapLocomotion(false);
    await driveRig(240, walk(1.4), (rig, k) => {
      if (k === 119) setMocapLocomotion(true);
      peak = Math.max(peak, slotsOf(rig).wStart);
    });
    expect(peak, 'switch on mid-walk').toBe(0);
    setMocapLocomotion(true);
    await driveRig(180, walk(1.4), (rig) => {
      peak = Math.max(peak, slotsOf(rig).wStart);
    });
    expect(peak, 'first seen walking').toBe(0);
    // (control) standing 1 s, then walking: the start plays
    await driveRig(180, (_k, t) => ({ speed: t < 1 ? 0 : 1.4, yawRate: 0, rec: false }), (rig) => {
      peak = Math.max(peak, slotsOf(rig).wStart);
    });
    expect(peak, 'a start from standing').toBeGreaterThan(0.5);
  }, 60_000);
});

describe('mocap fix 2: a spin on the spot plays the turn clip on (item 4)', () => {
  it('spinning 3 rad/s for 3 s: the turn weight stays over 0.9 after its ramp, no pose jump at each 90 deg', () => {
    expect(MOCAP_SET.turnInPlace).not.toBeNull();
    const m = new MocapSlots();
    const base = newKeyedPose();
    const pose = newKeyedPose();
    const tmp = newKeyedPose();
    const v = { half: 0, kneeOut: 0, duty: 0, lift: 0 };
    m.update(DT, MOCAP_SET, 0, 0, 0);
    let low = 1;
    let wraps = 0;
    let lastT = 0;
    let stepMax = 0;
    let prev: number[] | null = null;
    for (let k = 0; k < 180; k++) {
      m.update(DT, MOCAP_SET, 0, 0, 3);
      expect(m.turnSpot).toBe(true);
      if (m.turnT < lastT) wraps++;
      lastT = m.turnT;
      if (k * DT > 0.3) low = Math.min(low, m.wTurn);
      // the slot's pose over a still base: its pelvis quaternion's turn a frame
      mixKeyed(base, base, 0, pose);
      m.apply(MOCAP_SET, pose, tmp, v);
      const q = [pose.q[0]!, pose.q[1]!, pose.q[2]!, pose.q[3]!];
      if (prev && k * DT > 0.3) {
        const d = Math.abs(q[0]! * prev[0]! + q[1]! * prev[1]! + q[2]! * prev[2]! + q[3]! * prev[3]!);
        stepMax = Math.max(stepMax, (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI);
      }
      prev = q;
    }
    console.info(`spin 3 rad/s: ${wraps} wraps, lowest turn weight after the ramp ${low.toFixed(3)}, pelvis step a frame ${stepMax.toFixed(2)} deg`);
    expect(wraps).toBeGreaterThanOrEqual(4);
    expect(low).toBeGreaterThan(0.9);
    // (the clip's own pelvis turns up to 4.5 deg a clip frame; before fix 2 the dips and the wrap jump read 6.0 deg)
    expect(stepMax).toBeLessThan(4.5);
    // the spin stops: the turn ends and fades out
    for (let k = 0; k < 60; k++) m.update(DT, MOCAP_SET, 0, 0, 0);
    expect(m.turnT).toBe(-1);
    expect(m.wTurn).toBe(0);
  });

  it('a single 90 deg turn on the move still fades in and out by its progress', () => {
    const m = new MocapSlots();
    m.update(DT, MOCAP_SET, 1.4, 0, 0);
    let peak = 0;
    let last = 0;
    for (let k = 0; k < 60 && (k === 0 || m.turnT >= 0); k++) {
      m.update(DT, MOCAP_SET, 1.4, 0, 4);
      peak = Math.max(peak, m.wTurn);
      if (m.turnT >= 0) last = m.turnT;
    }
    expect(m.turnT).toBe(-1);
    expect(last).toBeGreaterThan(1 - MOCAP_SLOT.fadeOut);
    expect(peak).toBeGreaterThan(0.5);
  });

  // (fix 2 check) every joint of the slot's pose over a standing keyed pose: the largest turn of any joint a frame
  const spin = (plan: (t: number) => readonly [number, number]): { step: number; low: number; m: MocapSlots } => {
    const m = new MocapSlots();
    const base = newKeyedPose();
    sampleKeyed(MOCAP_SET.walk, 0, 1, base, null);
    const pose = newKeyedPose();
    const tmp = newKeyedPose();
    const v = { half: 0, kneeOut: 0, duty: 0, lift: 0 };
    const prev = new Float64Array(pose.q.length);
    let step = 0;
    let low = 1;
    for (let k = 0; k < 300; k++) {
      const [sp, yr] = plan(k * DT);
      m.update(DT, MOCAP_SET, sp, 0, yr);
      mixKeyed(base, base, 0, pose);
      m.apply(MOCAP_SET, pose, tmp, v);
      const q = pose.q;
      if (k > 0) {
        for (let j = 0; j < q.length; j += 4) {
          const d = Math.abs(q[j]! * prev[j]! + q[j + 1]! * prev[j + 1]! + q[j + 2]! * prev[j + 2]! + q[j + 3]! * prev[j + 3]!);
          step = Math.max(step, (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI);
        }
      }
      prev.set(q);
      if (k > 30 && k < 150) low = Math.min(low, m.wTurn);
    }
    return { step, low, m };
  };

  it('(fix 2 check) a spin reversed on the spot: the other side plays on at full weight from where it was (no pose jump)', () => {
    const one = spin(() => [0, 3]);
    const rev = spin((t) => [0, t < 1.5 ? 3 : -3]);
    console.info(`spin 3 rad/s: largest joint step a frame ${one.step.toFixed(2)} deg; reversed at 1.5 s ${rev.step.toFixed(2)} deg, lowest turn weight ${rev.low.toFixed(3)}`);
    // (before: 15.8 deg the frame after the reversal and a dip to 0.49; the clip's own joints turn up to ~3.3 deg a frame)
    expect(rev.step).toBeLessThan(one.step + 0.5);
    expect(rev.low).toBeGreaterThan(0.9);
    expect(rev.m.turnSide).toBe(-1);
  });

  it('(fix 2 check) a slow spin (0.8 rad/s, under the start rate, over the end rate) wraps at full weight too', () => {
    const slow = spin((t) => [0, t < 0.3 ? 3 : 0.8]);
    console.info(`spin slowing to 0.8 rad/s: lowest turn weight over its first wrap ${slow.low.toFixed(3)}, largest joint step ${slow.step.toFixed(2)} deg`);
    // (before: faded to 0.06 over each pass's last 22 deg, back to full after the wrap)
    expect(slow.low).toBeGreaterThan(0.9);
    expect(slow.m.turnSpot).toBe(true);
  });

  it('(fix 2 check) a spin that walks off the spot ends its pass and hands over to a turn on the move', () => {
    const r = spin((t) => [t < 1.5 ? 0 : Math.min(1.4, (t - 1.5) * 3), 3]);
    const walk = spin(() => [1.4, 3]);
    console.info(`spin walking off at 1.5 s: largest joint step a frame ${r.step.toFixed(2)} deg (a turn on the move alone ${walk.step.toFixed(2)})`);
    // (before: the turn on the spot replayed on the move for good, at full weight)
    expect(r.m.turnSpot).toBe(false);
    expect(r.m.turnT).toBeGreaterThanOrEqual(0);
    expect(r.step).toBeLessThan(Math.max(4.5, walk.step + 0.5));
  });
});

describe('mocap fix 2: the clip duty only with clip feet on (item 5)', () => {
  it('a jog crouching and back (a part mocap share): handed to the planner the duty is in [0.4, 0.75], never jumping', () => {
    setMocapLocomotion(true);
    const g = new AnimGraph(proportions('average', 1.68));
    const i = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.armed = false;
    i.localZ = 1;
    let part = 0;
    let settled = 0;
    let lo = 1;
    let hi = 0;
    let onLo = 1;
    let turnOff = 0;
    let turnLo = 1;
    let jump = 0;
    let run = 0;
    let lastDuty = -1;
    let lastPh = 0;
    for (let k = 0; k < 60 * 12; k++) {
      const t = k / 60;
      i.speed = 2.8;
      i.crouch = t < 3 ? 0 : t < 5 ? (t - 3) / 2 : t < 7 ? 1 - (t - 5) / 2 : 0;
      i.yawRate = t > 9 && t < 10.5 ? 4 : 0;
      g.update(DT, i);
      const o = g.out;
      const CF = o.clipFeet;
      if (!CF.valid) {
        lastDuty = -1;
        run = 0;
        continue;
      }
      // the gait clock's windows move at most half its advance a frame (a foot in the air never falls back into its stance)
      let dPh = o.gait.phase - lastPh;
      if (dPh < 0) dPh += 1;
      if (lastDuty >= 0) jump = Math.max(jump, Math.abs(o.gait.duty - lastDuty) - 0.5 * dPh);
      lastDuty = o.gait.duty;
      lastPh = o.gait.phase;
      if (CF.on) {
        onLo = Math.min(onLo, o.gait.duty);
        run = 0;
      } else if (o.keyMocap < MOCAP_FEET.share) {
        part++;
        run++;
        // (once the move toward the clamp is done: 0.2 at the jog's ~0.5 % of a cycle a frame, ~0.3 s)
        if (run > 24) {
          settled++;
          lo = Math.min(lo, o.gait.duty);
          hi = Math.max(hi, o.gait.duty);
        }
      } else {
        // handed off by the turn alone: the clip's window is kept (clamped, the jog / run turns popped worse)
        turnOff++;
        turnLo = Math.min(turnLo, o.gait.duty);
        run = 0;
      }
    }
    console.info(`jog 2.8: part share ${part} frames (${settled} settled: duty ${lo.toFixed(3)}..${hi.toFixed(3)}), clip feet on duty from ${onLo.toFixed(3)}, turn hand-off ${turnOff} frames duty from ${turnLo.toFixed(3)}, largest window jump past the limit ${jump.toFixed(4)}`);
    expect(part).toBeGreaterThan(60);
    expect(settled).toBeGreaterThan(30);
    expect(lo).toBeGreaterThanOrEqual(0.4);
    expect(hi).toBeLessThanOrEqual(0.75);
    expect(jump).toBeLessThanOrEqual(1e-9);
    // (the jog's own short stance, outside the planner's clamp, while the clip places the steps or a turn hands them over)
    expect(onLo).toBeLessThan(0.3);
    expect(turnOff).toBeGreaterThan(30);
    expect(turnLo).toBeLessThan(0.3);
  });

  it('(fix 2 check) the edges: the switch on mid-jog, clip feet gone under a quick crouch and back: no window moves under a foot in the air', () => {
    setMocapLocomotion(false);
    const g = new AnimGraph(proportions('average', 1.68));
    const i = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.armed = false;
    i.localZ = 1;
    i.speed = 2.8;
    let onStep = 0;
    let edge = 0;
    let edges = 0;
    let carried = 0;
    let back = 0;
    let lastDuty = -1;
    let lastPh = 0;
    let lastValid = false;
    for (let k = 0; k < 60 * 8; k++) {
      const t = k / 60;
      if (k === 120) setMocapLocomotion(true);
      // (a crouch in 0.3 s takes the mocap share to 0 before the duty has eased into the planner's clamp)
      i.crouch = t < 4 ? 0 : t < 4.3 ? (t - 4) / 0.3 : t < 5.5 ? 1 : t < 5.8 ? 1 - (t - 5.5) / 0.3 : 0;
      g.update(DT, i);
      const o = g.out;
      const valid = o.clipFeet.valid;
      if (lastDuty >= 0 && o.gait.moving) {
        let dPh = o.gait.phase - lastPh;
        if (dPh < 0) dPh += 1;
        // a foot in its swing window last frame put back into its stance window (not past its strike)
        for (const strike of [0, 0.5]) {
          const s0 = (((lastPh - strike) % 1) + 1) % 1;
          const s1 = (((o.gait.phase - strike) % 1) + 1) % 1;
          if (s0 >= lastDuty && s1 < o.gait.duty && s1 >= s0) back++;
        }
        if (k === 120) onStep = Math.abs(o.gait.duty - lastDuty);
        if (valid !== lastValid && k > 125) {
          edges++;
          edge = Math.max(edge, Math.abs(o.gait.duty - lastDuty) - 0.5 * dPh);
        }
        if (!valid && (g as unknown as { mCarry: boolean }).mCarry) carried++;
      }
      lastDuty = o.gait.duty;
      lastPh = o.gait.phase;
      lastValid = valid;
    }
    console.info(`jog 2.8: duty step at the switch on ${onStep.toFixed(4)}, at the clip feet edges (${edges}) past half the clock ${edge.toFixed(4)}, eased on ${carried} frames after they went, swing -> stance ${back}`);
    // (before: 0.23 at the switch on (the clip's 0.21 from the planner's 0.44 in a frame); 0.18 past the limit as the
    // crouch took clip feet away, a foot in the air put back in its stance window)
    expect(onStep).toBeLessThan(0.05);
    expect(edges).toBeGreaterThanOrEqual(2);
    expect(edge).toBeLessThanOrEqual(1e-9);
    expect(carried).toBeGreaterThan(3);
    expect(back).toBe(0);
  });
});

describe('mocap fix 2: the switch off mid-walk leaves the planner clean (item 8)', () => {
  const clipSet = (f: FootState): boolean => f.clipOwn || f.clipPlant || f.clipPitchT !== -1 || f.clipPitchOff !== 0;
  it('no clip feet state from the first frame off, through the walk and a stop (but a planted plant flag until it lifts)', async () => {
    setMocapLocomotion(true);
    let setBefore = 0;
    let setAfter = 0;
    let kept = 0;
    const keep = [false, false];
    await driveRig(60 * 7, (_k, t) => ({ speed: t < 4 ? 1.4 : 0, yawRate: 0, rec: false }), (rig, k) => {
      const P = rig.planner;
      if (k < 180) {
        if (clipSet(P.L) || clipSet(P.R)) setBefore++;
        if (k === 179) setMocapLocomotion(false);
        return;
      }
      // (fix 2 check) a planted foot on the clip's heel strike (toe up) keeps `clipPlant` until it lifts: the stop flattens
      // it by the flag (cleared, the switch off mid-stop left it toe up at idle)
      for (const [s, f] of [[0, P.L], [1, P.R]] as const) {
        if (k === 180 && f.clipPlant && f.contact) keep[s] = true;
        if (!f.contact) keep[s] = false;
        if (keep[s]) kept++;
        if (f.clipOwn || f.clipPitchT !== -1 || f.clipPitchOff !== 0 || (f.clipPlant && !keep[s])) setAfter++;
      }
    });
    console.info(`switch off mid-walk: clip state on ${setBefore} of 180 frames before, ${setAfter} after (a toe-up plant's flag kept ${kept} foot-frames)`);
    expect(setBefore).toBeGreaterThan(60);
    expect(setAfter).toBe(0);
  }, 60_000);

  it('(fix 2 check) the switch off mid-stop: a foot planted toe up on the clip goes flat at idle', async () => {
    const worst: string[] = [];
    let toeUp = 0;
    for (const v of [1.4, 2.0]) {
      for (const off of [6, 12, 18]) {
        setMocapLocomotion(true);
        let at = 0;
        let end = 0;
        let flags = 0;
        await driveRig(60 * 6, (_k, t) => ({ speed: t < 3 ? v : Math.max(0, v - (t - 3) * 6), yawRate: 0, rec: false }), (rig, k) => {
          const P = rig.planner;
          if (k === 180 + off) {
            at = Math.min(P.L.contact ? P.L.pitch : 0, P.R.contact ? P.R.pitch : 0);
            setMocapLocomotion(false);
          }
          if (k === 60 * 6 - 1) {
            end = Math.max(Math.abs(P.L.pitch), Math.abs(P.R.pitch));
            // (a kept plant flag stays on its planted foot until it lifts: only the stop's flatten reads it with the switch off)
            const loose = (f: FootState): boolean => f.clipOwn || f.clipPitchT !== -1 || f.clipPitchOff !== 0 || (f.clipPlant && !f.contact);
            flags = loose(P.L) || loose(P.R) ? 1 : 0;
          }
        });
        if (at < -0.01) toeUp++;
        worst.push(`${v} m/s +${off}: ${at.toFixed(3)} -> ${end.toFixed(4)} rad`);
        expect(end, `${v} m/s, off ${off} frames into the stop`).toBeLessThan(1e-3);
        expect(flags).toBe(0);
      }
    }
    console.info(`switch off mid-stop, the planted feet's pitch at the switch -> after 3 s idle: ${worst.join(', ')}`);
    // (the case is exercised: a foot planted toe up when the switch goes off)
    expect(toeUp).toBeGreaterThan(2);
  }, 120_000);
});
