import { describe, expect, it } from 'vitest';
import { CIRCUIT_CUT, CIRCUIT_READY, CIRCUIT_REARM, CircuitSchedule, EV_CUT, EV_READY, EV_RESTORE, EV_WARN } from '../src/world/lighting/circuitSchedule';

const DT = 1 / 60;
const run = (s: CircuitSchedule, secs: number): number => {
  let ev = 0;
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) {
    s.step(DT);
    ev |= s.events(0);
  }
  return ev;
};

describe('CircuitSchedule (marlow-final timed isolators)', () => {
  it('a press cuts a ready circuit for its seconds, then restores and re-arms', () => {
    const s = new CircuitSchedule([{ seconds: 15, rearm: 3 }]);
    expect(s.lit(0)).toBe(true);
    expect(s.press(0)).toBe(true);
    expect(s.events(0) & EV_CUT).toBeTruthy();
    expect(s.lit(0)).toBe(false);
    s.clearEvents();
    run(s, 14.9);
    expect(s.phase(0)).toBe(CIRCUIT_CUT);
    expect(s.remaining(0)).toBeCloseTo(0.1, 1);
    const ev = run(s, 0.2);
    expect(ev & EV_RESTORE).toBeTruthy();
    expect(s.lit(0)).toBe(true);
    expect(s.phase(0)).toBe(CIRCUIT_REARM);
    expect(s.ready(0)).toBe(false);
    run(s, 3);
    expect(s.ready(0)).toBe(true);
  });

  it('presses while cut or re-arming do nothing (no extending the window)', () => {
    const s = new CircuitSchedule([{ seconds: 15, rearm: 3 }]);
    s.press(0);
    run(s, 10);
    expect(s.press(0)).toBe(false);
    expect(s.remaining(0)).toBeCloseTo(5, 1);
    run(s, 6);
    expect(s.phase(0)).toBe(CIRCUIT_REARM);
    expect(s.press(0)).toBe(false);
  });

  it('warns once at five seconds left and signals ready', () => {
    const s = new CircuitSchedule([{ seconds: 25, rearm: 5 }]);
    s.press(0);
    s.clearEvents();
    let warns = 0;
    for (let i = 0; i < 25 * 60 + 10; i++) {
      s.step(DT);
      if (s.events(0) & EV_WARN) warns++;
      s.clearEvents();
    }
    expect(warns).toBe(1);
    expect(run(s, 5.1) & EV_READY).toBeTruthy();
  });

  it('a long step carries its overshoot into the re-arm; rearm 0 is ready at the restore', () => {
    const s = new CircuitSchedule([{ seconds: 2, rearm: 3 }, { seconds: 2, rearm: 0 }]);
    s.press(0);
    s.press(1);
    s.step(4);
    expect(s.phase(0)).toBe(CIRCUIT_REARM);
    expect(s.remaining(0)).toBeCloseTo(1, 6);
    expect(s.phase(1)).toBe(CIRCUIT_READY);
    expect(s.events(1) & (EV_RESTORE | EV_READY)).toBe(EV_RESTORE | EV_READY);
  });

  it('reset puts every circuit lit and ready with no events (the set restart)', () => {
    const s = new CircuitSchedule([{ seconds: 15, rearm: 3 }, { seconds: 25, rearm: 5 }]);
    s.press(0);
    s.press(1);
    s.reset();
    expect(s.lit(0) && s.lit(1) && s.ready(0) && s.ready(1)).toBe(true);
    expect(s.pending).toBe(0);
    expect(s.events(0) | s.events(1)).toBe(0);
  });

  it('setPhase mirrors a state without events; bad timings throw; out-of-range presses are refused', () => {
    const s = new CircuitSchedule([{ seconds: 15, rearm: 3 }]);
    s.setPhase(0, CIRCUIT_CUT, 9);
    expect(s.lit(0)).toBe(false);
    expect(s.remaining(0)).toBe(9);
    expect(s.events(0)).toBe(0);
    expect(s.press(3)).toBe(false);
    expect(() => new CircuitSchedule([{ seconds: 0, rearm: 1 }])).toThrow();
    expect(() => new CircuitSchedule([{ seconds: 5, rearm: -1 }])).toThrow();
  });

  it('steps without allocating (per-frame path)', () => {
    const s = new CircuitSchedule(Array.from({ length: 16 }, () => ({ seconds: 15, rearm: 3 })));
    for (let i = 0; i < 16; i++) s.press(i);
    const g = globalThis as { gc?: () => void };
    g.gc?.();
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 200_000; i++) {
      s.step(DT);
      if (s.pending) s.clearEvents();
      if (i % 1200 === 0) for (let k = 0; k < 16; k++) s.press(k);
    }
    const grew = process.memoryUsage().heapUsed - before;
    // 200k steps x 16 circuits: any per-step object would cost tens of MB
    expect(grew).toBeLessThan(2_000_000);
  });
});
