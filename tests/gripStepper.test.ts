import { describe, expect, it } from 'vitest';
import { GripStepper, type GripConfig } from '../src/player/gripStepper';
import { findJumpTarget, ledgeContinuation, generateLedges, makeLedge, TraversalAnchors, type AnchorBox, type Ledge, type PipeHorizontal } from '../src/world/anchors';

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
