import { describe, expect, it } from 'vitest';
import { AttachGrips, HANG_SWING, HANG_SWING_CLIP } from '../src/player/attachGrips';
import { ATTACH } from '../src/player/attach';
import { jumpGrabTime, LADDER_DROP_MAX, LADDER_TOP_TIME, LADDER_TOPOUT_TIME, DUCT_CRAWL_OUT } from '../src/player/attachController';
import { makeLedge, TraversalAnchors, type Ladder, type Ledge, type PipeVertical } from '../src/world/anchors';

const zero = () => ({ x: 0, y: 0, z: 0, w: 0 });
const rigOf = () => ({ reachL: zero(), reachR: zero(), plantL: zero(), plantR: zero(), height: 1.75 });
const anchors = new TraversalAnchors();
const pipe = anchors.add<PipeVertical>({ kind: 'pipeV', base: { x: 0, y: 0, z: 0 }, top: { x: 0, y: 9, z: 0 }, side: 0, radius: 0.05 });
const ladder = anchors.add<Ladder>({ kind: 'ladder', base: { x: 5, y: 0, z: 0 }, top: { x: 5, y: 9, z: 0.45 }, facing: 0, rung: 0.3, width: 0.5 });
const lip = anchors.add<Ledge>(makeLedge(-5, 10, 5, 10, 2.4));

/** Climb at `v` for `t` s at 120 Hz from `s0`; counts each hand's reaches and checks the feet. */
function climb(g: AttachGrips, a: PipeVertical | Ladder, s0: number, v: number, t: number) {
  const rig = rigOf();
  let s = s0;
  const reaches = { L: 0, R: 0 };
  const travel: number[] = [];
  let both = 0;
  let feetApart = 0;
  let cadMin = 9;
  let cadMax = -9;
  const was = { L: false, R: false };
  for (let i = 0; i < t * 120; i++) {
    s += v / 120;
    g.update(1 / 120, a, s, v, 1, 1, rig);
    for (const k of ['L', 'R'] as const) {
      const l = g.hands[k];
      const sw = l.swing >= 0;
      if (sw && !was[k]) {
        reaches[k]++;
        travel.push(Math.abs(l.at - l.from));
      }
      was[k] = sw;
    }
    if (g.hands.L.swing >= 0 && g.hands.R.swing >= 0) both++;
    feetApart = Math.max(feetApart, Math.abs(g.feet.L.at - g.feet.R.at), Math.abs(g.feet.L.swing - g.feet.R.swing));
    const c = g.cadence();
    cadMin = Math.min(cadMin, c);
    cadMax = Math.max(cadMax, c);
  }
  return { reaches, travel, both, feetApart, cadMin, cadMax, feetSteps: g.feet.steps };
}

describe('(ct-prototype G4) climb cadence against CT', () => {
  it('a drainpipe: one reach per hand about every second (~0.9 m), the hands alternating, the feet one pair (inchworm)', () => {
    const g = new AttachGrips();
    g.setup(pipe, 0.5, 1, 1.75);
    const v = ATTACH.pipeV.speed;
    const r = climb(g, pipe, 0.5, v, 4);
    // CT 054411: one reach per hand a 1.1-1.2 s cycle (was ~3 a second per hand)
    for (const k of ['L', 'R'] as const) {
      expect(r.reaches[k]).toBeGreaterThanOrEqual(3);
      expect(r.reaches[k]).toBeLessThanOrEqual(5);
    }
    for (const d of r.travel.slice(1)) expect(d).toBeGreaterThan(0.7);
    // alternating, not reaching as a pair
    expect(r.both).toBe(0);
    // the feet: always together, and drawn up then pushed (the inchworm cadence spans 0..1)
    expect(r.feetApart).toBeLessThan(1e-9);
    expect(r.cadMin).toBeLessThan(0.2);
    expect(r.cadMax).toBeGreaterThan(0.8);
  });

  it('a ladder: 1.7 rungs/s, each hand 2 rungs a reach, one reach every ~0.6 s', () => {
    const g = new AttachGrips();
    g.setup(ladder, 0.3, 1, 1.75);
    const v = ATTACH.ladder.speed;
    expect(v / 0.3).toBeCloseTo(1.7);
    const r = climb(g, ladder, 0.3, v, 6);
    // CT 112102 9.19-10.66: a 1.2 s cycle, one hand reach every 0.6 s
    const n = r.reaches.L + r.reaches.R;
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(11);
    for (const d of r.travel.slice(2)) expect(d).toBeCloseTo(0.6, 5);
  });
});

describe('(G4) the hang pendulum', () => {
  it('shimmying the hips trail the travel; stopping it settles to the small rest sway, never past the limit', () => {
    const g = new AttachGrips();
    g.setup(lip, 5, 1, 1.75);
    const rig = rigOf();
    const v = ATTACH.ledge.speed;
    let s = 5;
    let sum = 0;
    let n = 0;
    let peak = 0;
    for (let i = 0; i < 4 * 120; i++) {
      s += v / 120;
      g.update(1 / 120, lip, s, v, 1, 1, rig);
      if (i > 120) {
        sum += g.swingA;
        n++;
      }
      peak = Math.max(peak, Math.abs(g.swingA));
      const c = g.cadence();
      expect(Math.abs(c)).toBeLessThanOrEqual(HANG_SWING_CLIP + 1e-9);
    }
    expect(peak).toBeLessThanOrEqual(HANG_SWING.max + 1e-9);
    // the travel along the lip is the body's right or left (which way it faces): the hips trail the other way
    const right = Math.sign(g.hands.cfg.offR);
    expect((sum / n) * right).toBeLessThan(-0.05);
    // stopped: within 4 s the swing is down to the rest sway (about 6 deg once settled)
    for (let i = 0; i < 4 * 120; i++) g.update(1 / 120, lip, s, 0, 1, 1, rig);
    let late = 0;
    for (let i = 0; i < 2 * 120; i++) {
      g.update(1 / 120, lip, s, 0, 1, 1, rig);
      late = Math.max(late, Math.abs(g.swingA));
    }
    expect(late).toBeLessThan(HANG_SWING.idle + 0.02);
    expect(late).toBeGreaterThan(0.02);
  });
});

describe('(G4) traversal timings from CT', () => {
  it('jump-grab, ladder top mount / top-out, ladder let-go, crawl-out', () => {
    expect(jumpGrabTime(1.9)).toBeCloseTo(0.3);
    expect(jumpGrabTime(2.4)).toBeCloseTo(0.55);
    expect(LADDER_TOP_TIME).toBeCloseTo(1.2);
    expect(LADDER_TOPOUT_TIME).toBeGreaterThanOrEqual(0.6);
    expect(LADDER_TOPOUT_TIME).toBeLessThanOrEqual(1.0);
    expect(LADDER_DROP_MAX).toBeCloseTo(1.2);
    expect(DUCT_CRAWL_OUT).toBeGreaterThanOrEqual(2.4);
  });
});
