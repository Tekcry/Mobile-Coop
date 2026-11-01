import { describe, expect, it } from 'vitest';
import { GuardView, GV_DOWN, GV_HELD, LEVEL } from '../src/ai/incidents';
import { MAX_INTRUDERS } from '../src/ai/targetPick';
import { CALL_KIND, callHold, hearsVoice, RADIO, RADIO_CALLS, RadioNet, staggerDelay, type CallKind, type RadioSink } from '../src/ai/radioNet';

// (guard-ai S3) the section radio net (design section 5), on a hand-filled guard view and a recording sink.

interface G {
  id: number;
  x: number;
  z: number;
  y?: number;
  flags?: number;
}

function view(gs: G[]): GuardView {
  const v = new GuardView(4);
  v.ensure(gs.length);
  v.n = gs.length;
  gs.forEach((g, i) => v.set(i, g.id, g.x, g.y ?? 0, g.z, LEVEL.unaware, g.flags ?? 0, -1));
  return v;
}

interface Rec {
  guard: number;
  inc: number;
  kind: CallKind;
  caller: number;
  t: number;
}

class Sink implements RadioSink {
  got: Rec[] = [];
  alarmsAt: [number, number][] = [];
  constructor(private net: () => RadioNet) {}
  deliver(guard: number, inc: number, kind: CallKind, caller: number): void {
    this.got.push({ guard, inc, kind, caller, t: this.net().now });
  }
  alarm(section: number, caller: number): void {
    this.alarmsAt.push([section, caller]);
  }
}

function setup(gs: G[], section = 0): { net: RadioNet; v: GuardView; s: Sink } {
  const net = new RadioNet(section);
  return { net, v: view(gs), s: new Sink(() => net) };
}

const DT = 0.1;

function run(net: RadioNet, v: GuardView, s: Sink, seconds: number, react: Float32Array | null = null, sec: Int16Array | null = null): void {
  const n = Math.round(seconds / DT);
  for (let k = 0; k < n; k++) net.tick(DT, v, s, react, sec);
}

/** Caller 1 at the origin and 8 receivers at distinct distances, listed out of order. */
const EIGHT: G[] = [
  { id: 1, x: 0, z: 0 },
  { id: 50, x: 14, z: 0 },
  { id: 20, x: 0, z: 3 },
  { id: 80, x: -22, z: 0 },
  { id: 30, x: 0, z: -6 },
  { id: 70, x: 0, z: 19 },
  { id: 10, x: 1.5, z: 0 },
  { id: 60, x: -16, z: 2 },
  { id: 40, x: 7, z: 7 },
];

describe('radio net: staggered section call', () => {
  it('receivers hear in distance order, nearest first, each once', () => {
    const { net, v, s } = setup(EIGHT);
    net.startCall(1, 5, 'contact', RADIO.callIn);
    run(net, v, s, RADIO.callIn + RADIO.staggerMax + 1);
    expect(s.got.map((r) => r.guard)).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
    expect(s.got.every((r) => r.inc === 5 && r.kind === 'contact' && r.caller === 1)).toBe(true);
  });

  it('8 receivers spread over <= staggerMax after the call, never two at the same instant', () => {
    const { net, v, s } = setup(EIGHT);
    net.startCall(1, 5, 'contact', RADIO.callIn);
    run(net, v, s, RADIO.callIn + RADIO.staggerMax + 1);
    expect(s.got.length).toBe(8);
    const first = s.got[0]!.t;
    const last = s.got[7]!.t;
    expect(first).toBeGreaterThanOrEqual(RADIO.callIn + RADIO.staggerBase - 1e-6);
    // within the cap (plus one 10 Hz tick of quantisation)
    expect(last - RADIO.callIn).toBeLessThanOrEqual(RADIO.staggerMax + DT + 1e-6);
    // ~4 s from first to last (M5 "over a few seconds")
    expect(last - first).toBeGreaterThan(3);
    for (let k = 1; k < 8; k++) expect(s.got[k]!.t).toBeGreaterThan(s.got[k - 1]!.t);
    // the exact delays are distinct and rising
    for (let r = 1; r < 8; r++) expect(staggerDelay(r, 1, 1)).toBeGreaterThan(staggerDelay(r - 1, 1, 1));
    expect(staggerDelay(20, 0)).toBe(RADIO.staggerMax);
  });

  it('equidistant receivers: the lower view index first', () => {
    const { net, v, s } = setup([
      { id: 1, x: 0, z: 0 },
      { id: 9, x: 5, z: 0 },
      { id: 3, x: -5, z: 0 },
      { id: 7, x: 0, z: 5 },
    ]);
    net.startCall(1, 1, 'body', 1);
    run(net, v, s, 6);
    expect(s.got.map((r) => r.guard)).toEqual([9, 3, 7]);
  });

  it('nothing is delivered before the call completes', () => {
    const { net, v, s } = setup(EIGHT);
    net.startCall(1, 5, 'contact', RADIO.callIn);
    run(net, v, s, RADIO.callIn - 0.2);
    expect(s.got.length).toBe(0);
    expect(net.queued).toBe(0);
    expect(net.openCalls).toBe(1);
    run(net, v, s, 0.3);
    expect(net.openCalls).toBe(0);
    expect(net.queued).toBe(8);
  });

  it('the receiver reaction lane scales each delay (a slow guard hears later)', () => {
    const { net, v, s } = setup([
      { id: 1, x: 0, z: 0 },
      { id: 2, x: 2, z: 0 },
      { id: 3, x: 4, z: 0 },
    ]);
    const react = new Float32Array([1, 3, 1]);
    net.startCall(1, 1, 'light', 0);
    run(net, v, s, 6, react);
    // guard 2 is nearest but slow: 0.64 x 3 = 1.92 s; guard 3 at 0.6 + 0.5 + 0.08 = 1.18 s
    expect(s.got.map((r) => r.guard)).toEqual([3, 2]);
  });

  it('a down guard is not queued; a receiver who goes down before his turn is skipped', () => {
    const { net, v, s } = setup([
      { id: 1, x: 0, z: 0 },
      { id: 2, x: 2, z: 0, flags: GV_DOWN },
      { id: 3, x: 4, z: 0 },
      { id: 4, x: 30, z: 0 },
    ]);
    net.startCall(1, 1, 'contact', 0);
    run(net, v, s, 0.1);
    expect(net.queued).toBe(2);
    v.flags[3] = GV_DOWN;
    run(net, v, s, 6);
    expect(s.got.map((r) => r.guard)).toEqual([3]);
  });

  it('the same receiver, incident and kind is queued once; the same caller call is not duplicated', () => {
    const { net, v, s } = setup([
      { id: 1, x: 0, z: 0 },
      { id: 2, x: 3, z: 0 },
      { id: 3, x: 6, z: 0 },
    ]);
    const a = net.startCall(1, 4, 'contact', 1);
    expect(net.startCall(1, 4, 'contact', 1)).toBe(a);
    net.startCall(2, 4, 'contact', 1);
    run(net, v, s, 7);
    // 1 -> 2, 3 and 2 -> 1, 3: guard 3 once
    expect(s.got.filter((r) => r.guard === 3).length).toBe(1);
    expect(s.got.length).toBe(3);
  });
});

describe('radio net: the caller must survive the call', () => {
  it('cut before completion: nothing delivered, no alarm', () => {
    const { net, v, s } = setup(EIGHT);
    net.startCall(1, 5, 'contact', RADIO.callIn);
    net.startCall(1, 5, 'command', RADIO.report);
    run(net, v, s, 1);
    expect(net.cut(1)).toBe(2);
    run(net, v, s, 10);
    expect(s.got.length).toBe(0);
    expect(s.alarmsAt.length).toBe(0);
    expect(net.lost).toBe(2);
  });

  it('a caller down or held when the call completes loses it too (safety net)', () => {
    const { net, v, s } = setup(EIGHT);
    net.startCall(1, 5, 'contact', 1);
    v.flags[0] = GV_HELD;
    run(net, v, s, 8);
    expect(s.got.length).toBe(0);
    expect(net.lost).toBe(1);
  });

  it('cut after completion does not recall the call (it got through)', () => {
    const { net, v, s } = setup(EIGHT);
    net.startCall(1, 5, 'contact', 1);
    run(net, v, s, 1.1);
    expect(net.cut(1)).toBe(0);
    run(net, v, s, 6);
    expect(s.got.length).toBe(8);
  });
});

describe('radio net: command call (alarm)', () => {
  it('a completed command call raises the alarm once and queues nobody', () => {
    const { net, v, s } = setup(EIGHT, 3);
    const sec = new Int16Array(EIGHT.length).fill(3);
    net.startCall(1, 5, 'command', callHold('command', 1));
    run(net, v, s, RADIO.report - 0.3, null, sec);
    expect(s.alarmsAt.length).toBe(0);
    run(net, v, s, 30, null, sec);
    expect(s.alarmsAt).toEqual([[3, 1]]);
    expect(s.got.length).toBe(0);
  });

  it('a second command call in the section is refused while one is open; allowed after', () => {
    const { net, v, s } = setup(EIGHT);
    expect(net.startCall(1, 5, 'command', 4)).toBeGreaterThan(0);
    expect(net.commandOpen).toBe(true);
    expect(net.startCall(20, 5, 'command', 4)).toBe(-1);
    expect(net.refused).toBe(1);
    run(net, v, s, 4.2);
    expect(net.commandOpen).toBe(false);
    expect(net.startCall(20, 5, 'command', 4)).toBeGreaterThan(0);
    run(net, v, s, 4.2);
    expect(s.alarmsAt).toEqual([
      [0, 1],
      [0, 20],
    ]);
  });
});

describe('radio net: sections', () => {
  it('only the caller section hears; the other section net is untouched', () => {
    const gs: G[] = [
      { id: 1, x: 0, z: 0 },
      { id: 2, x: 3, z: 0 },
      { id: 3, x: 1, z: 0 },
      { id: 4, x: 6, z: 0 },
      { id: 5, x: 2, z: 0 },
    ];
    const sec = new Int16Array([0, 0, 1, 0, 1]);
    const v = view(gs);
    const a = new RadioNet(0);
    const b = new RadioNet(1);
    const sa = new Sink(() => a);
    const sb = new Sink(() => b);
    a.startCall(1, 1, 'contact', 1);
    for (let k = 0; k < 80; k++) {
      a.tick(DT, v, sa, null, sec);
      b.tick(DT, v, sb, null, sec);
    }
    expect(sa.got.map((r) => r.guard)).toEqual([2, 4]);
    expect(sb.got.length).toBe(0);
    expect(b.queued + b.openCalls + b.completed).toBe(0);
  });
});

describe('radio net: fixed pools', () => {
  it('queue overflow refuses new entries (dropped), keeps the queued ones, never throws', () => {
    const gs: G[] = [];
    for (let i = 0; i < 33; i++) gs.push({ id: 100 + i, x: i, z: 0 });
    const { net, v, s } = setup(gs);
    // (coop4 A173: the pool is RADIO.queue 128) enough calls x 32 receivers to pass it: 5 x 32 = 160 > 128
    const calls = Math.floor(RADIO.queue / 32) + 1;
    for (let c = 1; c <= calls; c++) net.startCall(99 + c, c, 'contact', 1);
    run(net, v, s, 1.1);
    expect(net.queued).toBe(RADIO.queue);
    expect(net.dropped).toBe(calls * 32 - RADIO.queue);
    run(net, v, s, 10);
    expect(s.got.length).toBe(RADIO.queue);
    // the first call's 32 all arrive; the last call's are the ones refused
    expect(s.got.filter((r) => r.inc === 1).length).toBe(32);
    expect(s.got.filter((r) => r.inc === calls).length).toBe(0);
  });

  it('the call pool refuses past RADIO_CALLS', () => {
    const net = new RadioNet();
    for (let c = 0; c < RADIO_CALLS; c++) expect(net.startCall(c, c, 'ko', 5)).toBeGreaterThan(0);
    expect(net.startCall(99, 99, 'ko', 5)).toBe(-1);
    expect(net.openCalls).toBe(RADIO_CALLS);
  });

  it('1000 ticks with no new calls grow nothing', () => {
    const { net, v, s } = setup(EIGHT);
    net.startCall(1, 5, 'contact', 1);
    run(net, v, s, 8);
    const cap = net.scratchCap;
    const qDue = net.qDue;
    const callDue = net.callDue;
    for (let k = 0; k < 1000; k++) net.tick(DT, v, s);
    expect(net.scratchCap).toBe(cap);
    expect(net.qDue).toBe(qDue);
    expect(net.callDue).toBe(callDue);
    expect(net.queued).toBe(0);
    expect(net.openCalls).toBe(0);
    expect(s.got.length).toBe(8);
  });

  it('deterministic: two runs deliver the same guards at the same times', () => {
    const a = setup(EIGHT);
    const b = setup(EIGHT);
    for (const x of [a, b]) {
      x.net.startCall(1, 5, 'contact', RADIO.callIn);
      x.net.startCall(40, 6, 'missing', 1.3);
      run(x.net, x.v, x.s, 10);
    }
    expect(b.s.got).toEqual(a.s.got);
  });
});

describe('radio net: helpers', () => {
  it('callHold: command takes RADIO.report, others RADIO.callIn, x reaction', () => {
    expect(callHold('command', 1)).toBe(RADIO.report);
    expect(callHold('contact', 0.8)).toBeCloseTo(RADIO.callIn * 0.8);
    expect(CALL_KIND).toContain('standDown');
  });

  it('hearsVoice: inside half the voice reach in the open; one wall cuts it to ~2.7 m', () => {
    expect(hearsVoice(5.9, 0, 0)).toBe(true);
    expect(hearsVoice(6.1, 0, 0)).toBe(false);
    expect(hearsVoice(2.5, 1, 0)).toBe(true);
    expect(hearsVoice(3, 1, 0)).toBe(false);
    // a 12 dB generator at the listener quarters it
    expect(hearsVoice(2, 0, 12)).toBe(false);
  });
});

describe('radio net: integration hooks (S3)', () => {
  it('completed(): called once per call that gets through, before its receivers; not for a lost call', () => {
    const { net, v } = setup(EIGHT);
    const order: string[] = [];
    const sink: RadioSink = {
      deliver: (g) => order.push(`rx${g}`),
      alarm: () => order.push('alarm'),
      completed: (caller, inc, kind) => order.push(`done${caller}:${inc}:${kind}`),
    };
    net.startCall(1, 3, 'light', RADIO.callIn);
    net.startCall(20, 3, 'contact', RADIO.callIn);
    net.cut(20);
    for (let k = 0; k < 80; k++) net.tick(DT, v, sink);
    expect(order[0]).toBe('done1:3:light');
    expect(order.filter((o) => o.startsWith('done'))).toEqual(['done1:3:light']);
    expect(order.length).toBe(1 + EIGHT.length - 1);
  });
  it('(S6 stack-tip fix) a call started from completed() (the command call) does not move the receivers or their incident', () => {
    // the completed call's slot is free during the callback, so the new call takes it: the receivers must still be due
    // at the first call's completion + stagger, about its incident
    const { net, v } = setup(EIGHT);
    const got: Rec[] = [];
    const sink: RadioSink = {
      deliver: (guard, inc, kind, caller) => got.push({ guard, inc, kind, caller, t: net.now }),
      alarm: () => {},
      completed: (caller, _inc, kind) => {
        if (kind === 'contact') net.startCall(caller, 9, 'command', RADIO.report);
      },
    };
    net.startCall(1, 5, 'contact', RADIO.callIn);
    for (let k = 0; k < Math.round((RADIO.callIn + RADIO.staggerMax + 0.5) / DT); k++) net.tick(DT, v, sink);
    expect(got.length).toBe(EIGHT.length - 1);
    expect(got.every((g) => g.inc === 5 && g.kind === 'contact')).toBe(true);
    expect(Math.min(...got.map((g) => g.t))).toBeLessThan(RADIO.callIn + staggerDelay(0, 1.5) + DT + 1e-6);
    expect(Math.max(...got.map((g) => g.t))).toBeLessThanOrEqual(RADIO.callIn + RADIO.staggerMax + DT + 1e-6);
    // the command call itself still completes on its own clock (the alarm)
    expect(net.alarms).toBe(1);
  });
  it('pendingFor(): seconds to his earliest open call, 0 with none or after it completes', () => {
    const { net, v, s } = setup(EIGHT);
    expect(net.pendingFor(1)).toBe(0);
    net.startCall(1, -1, 'contact', 2.5);
    net.startCall(1, 4, 'light', 1.5);
    expect(net.pendingFor(1)).toBeCloseTo(1.5, 6);
    run(net, v, s, 1);
    expect(net.pendingFor(1)).toBeCloseTo(0.5, 5);
    run(net, v, s, 2);
    expect(net.pendingFor(1)).toBe(0);
  });
});

describe('radio net: section alert calls (guard-ai S14)', () => {
  it("'shots' is appended: the older kind codes keep their numbers; it holds RADIO.callIn x reaction", () => {
    expect(CALL_KIND.slice(0, 7)).toEqual(['contact', 'body', 'ko', 'light', 'standDown', 'missing', 'command']);
    expect(CALL_KIND.indexOf('shots')).toBe(7);
    expect(callHold('shots')).toBe(RADIO.callIn);
    expect(callHold('shots', 1.4)).toBeCloseTo(RADIO.callIn * 1.4, 6);
  });
  it('isOpen(): true while the call goes out; false once it completes, once it is cut, and for a bad id', () => {
    const { net, v, s } = setup(EIGHT);
    const a = net.startCall(1, -2, 'shots', RADIO.callIn);
    const b = net.startCall(20, -3, 'missing', RADIO.callIn);
    expect(net.isOpen(a)).toBe(true);
    expect(net.isOpen(b)).toBe(true);
    expect(net.isOpen(-1)).toBe(false);
    expect(net.isOpen(0)).toBe(false);
    net.cut(20);
    expect(net.isOpen(b)).toBe(false);
    run(net, v, s, RADIO.callIn + 0.05);
    expect(net.isOpen(a)).toBe(false);
  });
  it('a shots call reaches the section staggered, nearest first; cut, nobody hears it', () => {
    const { net, v, s } = setup(EIGHT);
    net.startCall(1, -2, 'shots', RADIO.callIn);
    run(net, v, s, RADIO.callIn + RADIO.staggerMax + 0.5);
    const got = s.got.filter((r) => r.kind === 'shots');
    expect(got).toHaveLength(EIGHT.length - 1);
    expect(got.every((r) => r.inc === -2 && r.caller === 1 && r.t >= RADIO.callIn)).toBe(true);
    expect(got[0]!.guard).toBe(10);
    const c = setup(EIGHT);
    c.net.startCall(1, -2, 'shots', RADIO.callIn);
    c.net.tick(1, c.v, c.s);
    c.net.cut(1);
    run(c.net, c.v, c.s, RADIO.callIn + RADIO.staggerMax + 0.5);
    expect(c.s.got).toHaveLength(0);
  });
  it('two missing calls about the same guard under different incident ids (the S2 lead report, the alert) both reach every receiver', () => {
    const { net, v, s } = setup(EIGHT);
    net.startCall(20, 5, 'missing', RADIO.callIn);
    net.startCall(1, -2, 'missing', RADIO.callIn);
    run(net, v, s, RADIO.callIn + RADIO.staggerMax + 0.5);
    const alert = s.got.filter((r) => r.inc === -2);
    const lead = s.got.filter((r) => r.inc === 5);
    expect(alert).toHaveLength(EIGHT.length - 1);
    expect(alert.every((r) => r.caller === 1)).toBe(true);
    expect(lead).toHaveLength(EIGHT.length - 1);
  });
});

describe('radio net: four intruders (coop4 AI3, A173)', () => {
  /** A full section: `n` guards in a line 1 m apart (ids 100..), caller i is guard i. */
  const line = (n: number): G[] => {
    const gs: G[] = [];
    for (let i = 0; i < n; i++) gs.push({ id: 100 + i, x: i, z: 0 });
    return gs;
  };

  it('RADIO.queue is 128 (room for 4 contacts; the game now has 2 intruders at most)', () => {
    expect(RADIO.queue).toBe(128);
    expect(RADIO.queue).toBeGreaterThanOrEqual(MAX_INTRUDERS * 32);
  });

  it('every intruder calls at once in one section of 32 guards (31 receivers each): dropped 0, all delivered, each receiver once per contact', () => {
    const { net, v, s } = setup(line(32));
    for (let c = 0; c < MAX_INTRUDERS; c++) expect(net.startCall(100 + c, c, 'contact', RADIO.callIn)).toBeGreaterThan(0);
    run(net, v, s, RADIO.callIn + 0.05);
    expect(net.queued).toBe(MAX_INTRUDERS * 31);
    expect(net.dropped).toBe(0);
    run(net, v, s, RADIO.staggerMax + 1);
    expect(net.dropped).toBe(0);
    expect(net.queued).toBe(0);
    expect(s.got.length).toBe(MAX_INTRUDERS * 31);
    for (let c = 0; c < MAX_INTRUDERS; c++) {
      const got = s.got.filter((r) => r.inc === c);
      expect(got.length).toBe(31);
      expect(new Set(got.map((r) => r.guard)).size).toBe(31);
      expect(got.every((r) => r.caller === 100 + c && r.guard !== 100 + c)).toBe(true);
    }
  });

  it('2-player identity: 2 contacts with 31 receivers fit the old 64 pool (62), so the 128 pool delivers exactly the old schedule', () => {
    const { net, v, s } = setup(line(32));
    net.startCall(100, 0, 'contact', RADIO.callIn);
    net.startCall(101, 1, 'contact', RADIO.callIn);
    let peak = 0;
    const n = Math.round((RADIO.callIn + RADIO.staggerMax + 1) / DT);
    for (let k = 0; k < n; k++) {
      net.tick(DT, v, s);
      peak = Math.max(peak, net.queued);
    }
    // never more than the old pool held: the pool size never decided anything
    expect(peak).toBe(62);
    expect(peak).toBeLessThanOrEqual(64);
    expect(net.dropped).toBe(0);
    // every delivery on the pure schedule: call end + staggerDelay(rank by distance, distance), quantised to the 10 Hz tick
    for (const c of [0, 1]) {
      const cx = c;
      const want = line(32)
        .filter((g) => g.id !== 100 + c)
        .map((g) => ({ id: g.id, d: Math.abs(g.x - cx) }))
        .sort((a, b) => a.d - b.d || a.id - b.id)
        .map((g, r) => ({ guard: g.id, due: RADIO.callIn + staggerDelay(r, g.d) }));
      const got = s.got.filter((r) => r.inc === c);
      expect(got.map((r) => r.guard)).toEqual(want.map((w) => w.guard));
      for (let r = 0; r < want.length; r++) {
        expect(got[r]!.t).toBeGreaterThanOrEqual(want[r]!.due - 1e-6);
        expect(got[r]!.t - want[r]!.due).toBeLessThan(DT + 1e-6);
      }
    }
  });
});
