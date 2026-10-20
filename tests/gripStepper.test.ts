import { describe, expect, it } from 'vitest';
import { GripStepper, type GripConfig } from '../src/player/gripStepper';
import { AttachGrips, ARM_SWEEP_RATE, CLIMB_HAND_SWING, minReachSwing } from '../src/player/attachGrips';
import { proportions } from '../src/player/proportions';
import { ATTACH } from '../src/player/attach';
import { findJumpTarget, ledgeContinuation, generateLedges, makeLedge, TraversalAnchors, type AnchorBox, type Ladder, type Ledge, type PipeHorizontal } from '../src/world/anchors';

const lip = (): GripConfig => ({ offL: -0.22, offR: 0.22, slack: 0.12, swingTime: 0.13, lead: 1, grid: 0, gridOrigin: 0, min: 0, max: 10 });

/** Move the body at `v` m/s for `t` s at 120 Hz; returns the largest planted-hand error from its wanted spot and
 *  whether a planted contact ever moved. */
function shimmy(g: GripStepper, cfg: GripConfig, start: number, v: number, t: number): { body: number; maxErr: number; slid: boolean } {
  let body = start;
  let maxErr = 0;
  let slid = false;
  const prev = [g.L.at, g.R.at];
  const was = [g.L.swing < 0, g.R.swing < 0];
  for (let i = 0; i < t * 120; i++) {
    body += v / 120;
    g.update(1 / 120, body, v);
    const limbs = [g.L, g.R];
    for (let k = 0; k < 2; k++) {
      const l = limbs[k]!;
      if (l.swing < 0) {
        if (was[k] && Math.abs(l.at - prev[k]!) > 1e-9) slid = true;
        maxErr = Math.max(maxErr, Math.abs(body + (k === 0 ? cfg.offL : cfg.offR) - l.at));
      }
      was[k] = l.swing < 0;
      prev[k] = l.at;
    }
  }
  return { body, maxErr, slid };
}

describe('grip stepper', () => {
  it('planted contacts never slide; a shimmy at 1.2 m/s keeps both hands within reach', () => {
    const cfg = lip();
    const g = new GripStepper(cfg);
    g.reset(2);
    expect(g.L.at).toBeCloseTo(1.78);
    expect(g.R.at).toBeCloseTo(2.22);
    const r = shimmy(g, cfg, 2, 1.2, 3);
    expect(r.slid).toBe(false);
    // never more than slack + the distance covered during half a swing behind (the overlap allowance)
    expect(r.maxErr).toBeLessThan(cfg.slack + 1.2 * cfg.swingTime + 0.02);
    expect(g.steps).toBeGreaterThan(10);
  });

  it('(ct-prototype D2b, G4) the ledge shimmy at its table speed: one hand at a time, ~1.2 reaches a second per hand, in reach', () => {
    const v = ATTACH.ledge.speed;
    // (G4, CT 110522 65.3-69.9: a 1.0 s hand cycle at 0.5 m/s) the AttachGrips ledge set-up (was swing 0.28, lead 0.42 s, spots 0.26; now 0.32 s, 0.6 s, 0.25 m)
    const cfg: GripConfig = { offL: -0.25, offR: 0.25, slack: 0.08, swingTime: 0.32, lead: 0, leadTime: 0.6, overlap: false, alternate: 0.02, grid: 0, gridOrigin: 0, min: 0, max: 20 };
    const g = new GripStepper(cfg);
    g.reset(2);
    let first: 'L' | 'R' | null = null;
    let both = false;
    let body = 2;
    let lo = 0;
    let hi = 0;
    for (let i = 0; i < 4 * 120; i++) {
      body += v / 120;
      g.update(1 / 120, body, v);
      if (!first && g.L.swing >= 0) first = 'L';
      if (!first && g.R.swing >= 0) first = 'R';
      if (g.L.swing >= 0 && g.R.swing >= 0) both = true;
      // planted hands relative to the body: the trailing (left) never past -0.42, the leading (right) never past 0.6
      if (i > 120 && g.L.swing < 0) lo = Math.min(lo, g.L.at - body);
      if (i > 120 && g.R.swing < 0) hi = Math.max(hi, g.R.at - body);
    }
    // moving +: the left hand trails, so it lets go first (a tie at the start)
    expect(first).toBe('L');
    expect(both).toBe(false);
    // ~1.2 reaches a second per hand (4 s, both hands; CT 1.0, D2b's 0.7 m/s ~1.8, was ~5 at 1.2 m/s)
    expect(g.steps).toBeGreaterThanOrEqual(7);
    expect(g.steps).toBeLessThanOrEqual(11);
    expect(lo).toBeGreaterThan(-0.42);
    expect(hi).toBeLessThan(0.6);
    // stopping: the last reach lands no further out than its spot plus the slack
    g.update(1 / 120, body, 0);
    for (let i = 0; i < 120; i++) g.update(1 / 120, body, 0);
    expect(Math.abs(g.R.at - body)).toBeLessThan(0.25 + cfg.slack + 0.01);
    const r = shimmy(g, cfg, body, v, 3);
    expect(r.slid).toBe(false);
    // (G4) behind its spot by at most the slack and a swing's travel, ahead by at most the speed lead (the 0.5 m reach)
    expect(r.maxErr).toBeLessThan(Math.max(cfg.slack + v * cfg.swingTime, v * (cfg.leadTime ?? 0)) + 0.02);
  });

  it('(ct-prototype D+E fix r1) offsets of the same sign (drainpipe hands / feet) still step from a tie', () => {
    const cfg: GripConfig = { offL: 1.35, offR: 1.6, slack: 0.16, swingTime: 0.2, lead: 0.8, grid: 0, gridOrigin: 0, min: 0, max: 20 };
    const g = new GripStepper(cfg);
    g.reset(0);
    const r = shimmy(g, cfg, 0, 0.9, 2);
    expect(g.steps).toBeGreaterThan(6);
    expect(r.maxErr).toBeLessThan(cfg.slack + 0.9 * cfg.swingTime + 0.02);
  });

  it('frame-rate independent: the same steps at 60 and 120 Hz', () => {
    const run = (hz: number): number => {
      const g = new GripStepper(lip());
      g.reset(0);
      let body = 0;
      for (let i = 0; i < 2 * hz; i++) {
        body += 1 / hz;
        g.update(1 / hz, body, 1);
      }
      return g.steps;
    };
    expect(Math.abs(run(60) - run(120))).toBeLessThanOrEqual(1);
  });

  it('still: no steps once settled; a grid snaps contacts to rungs inside the range', () => {
    const cfg: GripConfig = { offL: 0, offR: 0.3, slack: 0.31, swingTime: 0.24, lead: 1, grid: 0.3, gridOrigin: 0, min: 0.3, max: 3 };
    const g = new GripStepper(cfg);
    g.reset(0);
    expect(g.L.at).toBeCloseTo(0.3);
    expect(g.R.at).toBeCloseTo(0.3);
    for (let i = 0; i < 120; i++) g.update(1 / 120, 0, 0);
    const steps = g.steps;
    for (let i = 0; i < 120; i++) g.update(1 / 120, 0, 0);
    expect(g.steps).toBe(steps);
    shimmy(g, cfg, 0, 0.48, 3);
    for (const l of [g.L, g.R]) {
      const k = l.at / 0.3;
      expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-9);
      expect(l.at).toBeLessThanOrEqual(3 + 1e-9);
    }
  });

  it('swing position eases from the old grip to the new and lifts mid-swing', () => {
    const g = new GripStepper(lip());
    g.reset(0);
    g.update(1 / 120, 0.5, 1);
    const l = g.L.swing >= 0 ? g.L : g.R;
    expect(l.swing).toBeGreaterThanOrEqual(0);
    expect(g.lift(l)).toBeLessThan(0.1);
    while (l.swing >= 0 && l.swing < 0.5) g.update(1 / 120, 0.5, 0);
    expect(g.lift(l)).toBeGreaterThan(0.9);
    const p = g.pos(l);
    expect(p).toBeGreaterThan(Math.min(l.from, l.at) - 1e-9);
    expect(p).toBeLessThan(Math.max(l.from, l.at) + 1e-9);
  });
});

const box = (x: number, y0: number, z: number, w: number, h: number, d: number): AnchorBox => ({ c: [x, y0 + h / 2, z], s: [w, h, d], yaw: 0, pitch: 0, collide: true });

describe('ledge continuation and jumps', () => {
  it('outside corners continue onto the linked lip; a collinear neighbour continues too', () => {
    const a = generateLedges([box(0, 0, 0, 3, 2.3, 3)]);
    const west = a.ledges.find((l) => l.nx < -0.9)!;
    for (const side of [-1, 1] as const) {
      const n = ledgeContinuation(a, west, side);
      expect(n).not.toBeNull();
      expect(Math.abs(n!.ledge.nz)).toBeCloseTo(1);
      // just inside the meeting end
      const ex = side < 0 ? west.a : west.b;
      const px = n!.ledge.a.x + n!.ledge.tx * n!.s;
      const pz = n!.ledge.a.z + n!.ledge.tz * n!.s;
      expect(Math.hypot(px - ex.x, pz - ex.z)).toBeLessThan(0.3);
    }
    const two = new TraversalAnchors();
    const l1 = two.add<Ledge>(makeLedge(0, 0, 2, 0, 2.3));
    two.add<Ledge>(makeLedge(2.2, 0, 5, 0, 2.3));
    two.add<Ledge>(makeLedge(2.1, 0.1, 4, 0.1, 3.5));
    const n = ledgeContinuation(two, l1, 1)!;
    expect(n.ledge.top).toBeCloseTo(2.3);
    expect(ledgeContinuation(two, l1, -1)).toBeNull();
  });

  it('jump targets: in the stick direction, within 2.5 m, same-facing lips preferred, never the held one', () => {
    const a = new TraversalAnchors();
    // two walls along z facing -x (lips at x = 0), a 2 m gap between them; a south-facing lip near the second
    const held = a.add<Ledge>(makeLedge(0, 17.5, 0, 14.5, 2.3));
    const next = a.add<Ledge>(makeLedge(0, 21, 0, 19, 2.3));
    a.add<Ledge>(makeLedge(3, 19, 0, 19, 2.3));
    expect(held.nx).toBeLessThan(-0.9);
    expect(next.nx).toBeLessThan(-0.9);
    const from = { x: 0, y: 2.3, z: 17.25 };
    const t = findJumpTarget(a, from, held.id, 0, 1, 0, 2.5, 0.6, held.nx, held.nz)!;
    expect(t.anchor).toBe(next);
    expect(t.dist).toBeLessThanOrEqual(2.5);
    // backwards: nothing there
    expect(findJumpTarget(a, from, held.id, 0, -1, 0)).toBeNull();
    // too far
    expect(findJumpTarget(a, { x: 0, y: 2.3, z: 14.6 }, held.id, 0, 1, 0)).toBeNull();
    // a pipe overhead is a target straight up
    const pipe = a.add<PipeHorizontal>({ kind: 'pipeH', a: { x: 0.3, y: 3.3, z: 15 }, b: { x: 0.3, y: 3.3, z: 18 }, hangHeight: 3.3, radius: 0.05 });
    const up = findJumpTarget(a, { x: 0, y: 2.3, z: 16 }, held.id, 1, 0, 1)!;
    expect(up.anchor).toBe(pipe);
  });
});

describe('climb reach speed (operators step 11e)', () => {
  const zero = () => ({ x: 0, y: 0, z: 0, w: 0 });
  it("a ladder sprint's hand swing never outruns the rig's arm (Wren 1.68 m and the 1.75 m rig)", () => {
    const anchors = new TraversalAnchors();
    const ladder = anchors.add<Ladder>({ kind: 'ladder', base: { x: 0, y: 0, z: 0 }, top: { x: 0, y: 4, z: 0.45 }, facing: 0, rung: 0.3, width: 0.5 });
    for (const height of [1.68, 1.75]) {
      const g = new AttachGrips();
      g.setup(ladder, 0.3, 1, height);
      const rig = { reachL: zero(), reachR: zero(), plantL: zero(), plantR: zero(), height };
      // the longest reach (slack + lead, rounded up a rung) at the arm's planned sweep rate; (G4) 2 rungs a reach
      const min = minReachSwing(g.hands.cfg.slack * (1 + g.hands.cfg.lead) + 0.15, height);
      const arm = proportions('average', height);
      expect((1.5 * (0.57 * 1.05 + 0.15)) / (arm.upperArm.len + arm.forearm.len) / min).toBeCloseTo(ARM_SWEEP_RATE, 0);
      g.update(1 / 120, ladder, 0.3, 1.5, 1, 1, rig); // sprint (1.5 m/s)
      expect(g.hands.cfg.swingTime).toBeGreaterThanOrEqual(min - 1e-9);
      expect(g.hands.cfg.swingTime).toBeGreaterThan(0.14);
      g.update(1 / 120, ladder, 0.3, ATTACH.ladder.speed, 1, 1, rig); // the climb's own pace: (G4) CT's 0.3 s reach
      expect(g.hands.cfg.swingTime).toBeCloseTo(CLIMB_HAND_SWING, 5);
    }
    expect(minReachSwing(0.6, 1.68)).toBeGreaterThan(minReachSwing(0.6, 1.75));
  });
});
