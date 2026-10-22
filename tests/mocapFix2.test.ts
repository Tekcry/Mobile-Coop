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
import { MOCAP_FEET, MOCAP_SET, MOCAP_SLOT, MocapSlots, setMocapLocomotion } from '../src/anim/mocap';
import { mixKeyed, newKeyedPose } from '../src/anim/keyed';
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { proportions } from '../src/player/proportions';
import { driveRig, type Plan } from './helpers/mocapMeasure';
import type { CharacterRig } from '../src/player/characterRig';
import type { FootState } from '../src/anim/footPlanner';

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
});

describe('mocap fix 2: the switch off mid-walk leaves the planner clean (item 8)', () => {
  const clipSet = (f: FootState): boolean => f.clipOwn || f.clipPlant || f.clipPitchT !== -1 || f.clipPitchOff !== 0;
  it('no clip feet state from the first frame off, through the walk and a stop', async () => {
    setMocapLocomotion(true);
    let setBefore = 0;
    let setAfter = 0;
    await driveRig(60 * 7, (_k, t) => ({ speed: t < 4 ? 1.4 : 0, yawRate: 0, rec: false }), (rig, k) => {
      const P = rig.planner;
      if (k < 180) {
        if (clipSet(P.L) || clipSet(P.R)) setBefore++;
        if (k === 179) setMocapLocomotion(false);
      } else if (clipSet(P.L) || clipSet(P.R)) setAfter++;
    });
    expect(setBefore).toBeGreaterThan(60);
    expect(setAfter).toBe(0);
  }, 60_000);
});
