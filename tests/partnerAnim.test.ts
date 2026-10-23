import { describe, expect, it } from 'vitest';
import { CLIENT_INTERP_DELAY, ClockSync, ExtrapBlend, HOST_INTERP_DELAY, sampleSpeed, sendClock, SnapshotBuffer } from '../src/net/interp';
import { gaitWire, MOTION_WIRE, motionWire, parseMessage } from '../src/net/protocol';
import { NETSIM_PRESETS, NetSim } from '../src/net/netSim';

// afp AF6 (Michael P5, co-op partner "more jumpy"): the receiving side's continuous motion between states
interface S {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
}
const st = (x: number, z: number, yaw: number, speed: number): S => ({ x, y: 0, z, yaw, speed });

describe('partner motion between states (afp AF6)', () => {
  it('the velocity and the turn rate are continuous at render rate (the span velocity stepped at 20 Hz)', () => {
    const b = new SnapshotBuffer<S>(40, 0.25);
    const acc = 3; // m/s^2
    const w = 2; // rad/s^2 turn ramp
    for (let i = 0; i <= 40; i++) {
      const t = i / 20;
      b.push(t, st(0.5 * acc * t * t, 0, 0.5 * w * t * t * 0.1, acc * t));
    }
    let pv = Number.NaN;
    let pw = Number.NaN;
    let pspan = Number.NaN;
    let dv = 0;
    let dw = 0;
    let dspan = 0;
    let err = 0;
    for (let f = 30; f < 100; f++) {
      const t = f / 60;
      const o = b.sample(t)!;
      const spanV = (o.to.x - o.from.x) / o.span;
      if (!Number.isNaN(pv)) {
        dv = Math.max(dv, Math.abs(o.vx - pv));
        dw = Math.max(dw, Math.abs(o.vyaw - pw));
        dspan = Math.max(dspan, Math.abs(spanV - pspan));
      }
      pv = o.vx;
      pw = o.vyaw;
      pspan = spanV;
      err = Math.max(err, Math.abs(o.vx - acc * t));
    }
    // true change a frame: acc / 60 = 0.05 m/s; the span velocity steps acc / 20 = 0.15 m/s every third frame
    expect(dspan).toBeGreaterThan(0.14);
    expect(dv).toBeLessThan(0.06);
    expect(dw).toBeLessThan(0.2 * 0.05 + 1e-3);
    expect(err).toBeLessThan(0.03);
  });

  it("the owner's pace blends across the span (it stepped from the older state)", () => {
    const b = new SnapshotBuffer<S>(40, 0.25);
    for (let i = 0; i <= 20; i++) b.push(i / 20, st(i * 0.1, 0, 0, i * 0.2));
    let prev = Number.NaN;
    let worst = 0;
    for (let f = 6; f < 55; f++) {
      const sp = sampleSpeed(b.sample(f / 60)!);
      if (!Number.isNaN(prev)) worst = Math.max(worst, Math.abs(sp - prev));
      prev = sp;
    }
    // 4 m/s^2: 0.067 m/s a frame, never the 0.2 step
    expect(worst).toBeLessThan(0.07);
  });

  it('a teleport span has no velocity', () => {
    const b = new SnapshotBuffer<S>(40, 0.25);
    b.push(0, st(0, 0, 0, 0));
    b.push(0.05, st(0, 0, 0, 0));
    b.push(0.1, st(30, 0, 0, 0));
    const o = b.sample(0.075)!;
    expect(o.jump).toBe(true);
    expect(o.vx).toBe(0);
  });

  it('the step back from an extrapolation blends out over frames (it showed in one)', () => {
    const b = new SnapshotBuffer<S>(40, 0.25);
    const xb = new ExtrapBlend();
    for (let i = 0; i <= 10; i++) b.push(i / 20, st(i * 0.2, 0, 0, 4));
    // a stall: the buffer extrapolates past 0.5 s, then the owner is found to have stopped at 2.1 m
    let prevX = Number.NaN;
    let worstStep = 0;
    let off = 0;
    for (let f = 0; f < 60; f++) {
      const t = 0.4 + f / 60;
      if (Math.abs(t - 0.7) < 1e-6 || (t > 0.7 && b.latestTime() < 0.7)) {
        b.push(0.6, st(2.1, 0, 0, 0));
        b.push(0.65, st(2.1, 0, 0, 0));
        b.push(0.7, st(2.1, 0, 0, 0));
      }
      const o = b.sample(t)!;
      const raw = o.x;
      xb.apply(o, 1 / 60);
      off = Math.max(off, Math.abs(o.x - raw));
      if (!Number.isNaN(prevX)) worstStep = Math.max(worstStep, Math.abs(o.x - prevX));
      prevX = o.x;
    }
    expect(off).toBeGreaterThan(0.1); // it did extrapolate past the stop
    expect(worstStep).toBeLessThan(0.11); // 4 m/s at 60 Hz is 0.067; the raw snap back was ~0.3 m in a frame
  });

  it('under netsim typical the host never runs out of joiner states at HOST_INTERP_DELAY (arrival stamps)', () => {
    const res = (delay: number, senderTime = false) => {
      const sim = new NetSim(NETSIM_PRESETS.typical!, 11);
      const clock = new ClockSync();
      let last = -Infinity;
      const b = new SnapshotBuffer<S>(40, 0.25);
      const xb = new ExtrapBlend();
      const arrivals: { at: number; t: number; s: S }[] = [];
      // the joiner sends every 1 / 20 s on its 60 Hz frame timer, running 4 m/s
      let sendT = 0;
      for (let f = 0; f < 60 * 20; f++) {
        const t = f / 60;
        sendT -= 1 / 60;
        if (sendT > 0) continue;
        sendT = 1 / 20;
        arrivals.push({ at: sim.deliverAt('host', t * 1000) / 1000, t: t + 100, s: st(4 * t, 0, 0, 4) });
      }
      let ai = 0;
      let over = 0;
      let n = 0;
      let worst = 0;
      let prev = Number.NaN;
      for (let f = 60; f < 60 * 19; f++) {
        const now = f / 60 + 0.3 / 60; // the host's frames are not in step with the joiner's
        while (ai < arrivals.length && arrivals[ai]!.at <= now) {
          const a = arrivals[ai++]!;
          // (afp AF6) the host's stamp: the joiner's send clock through a ClockSync (coopHost.stateTime), else the arrival
          let at = a.at;
          if (senderTime) {
            clock.observe(a.t, a.at);
            at = Math.max(clock.toLocal(a.t), last + 1e-3);
          }
          last = at;
          b.push(at, a.s);
        }
        const o = b.sample(now - delay)!;
        if (o.over > 0) over++;
        xb.apply(o, 1 / 60);
        if (!Number.isNaN(prev)) worst = Math.max(worst, Math.abs(o.x - prev - 4 / 60));
        prev = o.x;
        n++;
      }
      return { over: over / n, worst };
    };
    const now = res(HOST_INTERP_DELAY);
    const was = res(0.1);
    console.info('netsim typical: extrapolating', now, 'was', was);
    // (1% of the states are retransmitted 100 ms late: those few gaps still extrapolate, and blend back)
    expect(now.over).toBeLessThan(0.02);
    expect(now.over).toBeLessThan(was.over);
    // arrival stamps: the jitter bends the spans (a retransmit's bunched states step the pace)
    expect(now.worst).toBeGreaterThan(0.1);
    // (afp AF6) stamped by the joiner's send clock: the spans keep the pace (the 1% retransmits still extrapolate and blend)
    const sent = res(HOST_INTERP_DELAY, true);
    console.info('netsim typical, sender time:', sent);
    expect(sent.over).toBeLessThan(0.02);
    expect(sent.worst).toBeLessThan(0.03);
    expect(CLIENT_INTERP_DELAY).toBeGreaterThanOrEqual(2 / 15 + 0.02);
    expect(HOST_INTERP_DELAY).toBeGreaterThanOrEqual(2 / 20 + 0.02);
  });
});

describe('the gait on the wire (afp AF6)', () => {
  it('gaitWire: the clock wrapped to 0..1, the CT stop only while set', () => {
    const o: { gph?: number; qs?: number; hs?: number } = {};
    gaitWire(1.25, true, -1, false, 0, 0.35, 0.12, o);
    expect(o).toEqual({ gph: 0.25, qs: 0.12 });
    const h: { gph?: number; qs?: number; hs?: number } = {};
    gaitWire(-0.25, true, 0.1, true, 3.2, 0.35, 0.12, h);
    expect(h).toEqual({ gph: 0.75, qs: 0.35, hs: 3.2 });
    const n: { gph?: number; qs?: number; hs?: number } = {};
    gaitWire(0.5, false, -1, false, 0, 0.35, 0.12, n);
    expect(n).toEqual({ gph: 0.5 });
  });

  it('sendClock: the wall clock, never closer to the last stamp than the sim time between them', () => {
    // two catch-up steps in one frame: the second is a step later, not the same instant
    expect(sendClock(10, 5, 10, 5 + 1 / 60)).toBeCloseTo(10 + 1 / 60, 9);
    // a normal frame: the wall clock
    expect(sendClock(10, 5, 10.05, 5.05)).toBeCloseTo(10.05, 9);
    // a slow page dropped its backlog (sim behind the wall): the wall clock, the host's ClockSync is not left behind
    expect(sendClock(10, 5, 10.5, 5.1)).toBeCloseTo(10.5, 9);
    // the first state
    expect(sendClock(-Infinity, 0, 3, 1)).toBe(3);
  });

  it('motionWire: the driver state by index and its time; none under a scripted override; parsed and clamped', () => {
    const o: { mo?: number; mt?: number } = {};
    motionWire('start', 0.1, 2, -150, o);
    expect(o).toEqual({ mo: MOTION_WIRE.indexOf('start'), mt: 0.1, ax: 2, az: -100 });
    const n: { mo?: number; mt?: number } = {};
    motionWire(null, 0.1, 1, 1, n);
    expect(n).toEqual({});
    const base = { id: 'p1', x: 1, y: 0, z: 2, yaw: 0, pitch: 0, speed: 3, f: 16, w: 'rifle', hp: 100 };
    const m = parseMessage({ t: 'pstate', s: { ...base, mo: 9, mt: 99, ax: 3, az: -300 } });
    expect(m && m.t === 'pstate' ? [m.s.mo, m.s.mt, m.s.ax, m.s.az] : null).toEqual([MOTION_WIRE.length - 1, 60, 3, -100]);
    const h = parseMessage({ t: 'pstate', s: { ...base, mo: 3 } });
    expect(h && h.t === 'pstate' ? 'mo' in h.s : null).toBe(false);
  });

  it('pstate carries t / gph / qs / hs, clamped; absent stays absent', () => {
    const base = { id: 'p1', x: 1, y: 0, z: 2, yaw: 0, pitch: 0, speed: 3, f: 16, w: 'rifle', hp: 100 };
    const m = parseMessage({ t: 'pstate', s: { ...base, t: 12.5, gph: 0.4, qs: 0.12, hs: 3 } });
    expect(m && m.t === 'pstate' ? [m.s.t, m.s.gph, m.s.qs, m.s.hs] : null).toEqual([12.5, 0.4, 0.12, 3]);
    const c = parseMessage({ t: 'pstate', s: { ...base, gph: 7, qs: 9, hs: -1 } });
    expect(c && c.t === 'pstate' ? [c.s.gph, c.s.qs, c.s.hs] : null).toEqual([1, 2, 0]);
    const a = parseMessage({ t: 'pstate', s: base });
    expect(a && a.t === 'pstate' ? 'gph' in a.s || 't' in a.s : null).toBe(false);
  });
});
