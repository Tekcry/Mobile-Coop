import { describe, expect, it } from 'vitest';
import { parseMessage, type NetItem } from '../src/net/protocol';
import { HOLD_PULSE_MIN_GAP, HoldPulseWatch, hostHoldPulse, inUseReach, type PulseItem } from '../src/net/holdPulse';
import { HOLD_NOISE_PULSE, HOLD_NOISE_RADIUS, holdNoisePulse } from '../src/config/noise';

// (marlow-final Q12, SPEC N4) a client's noisy hold makes the same noise on the host as the host's own hold

const DT = 1 / 60;

function item(over: Partial<PulseItem> = {}): PulseItem {
  return { id: 'c-drive', progress: 0, enabled: true, done: false, holdTime: 3, holdNoise: HOLD_NOISE_RADIUS, reach: 1.4, pos: { x: 10, y: 1, z: 5 }, ...over };
}

/** How many pulses the host's own hold of `secs` makes (the `GameState` rule: `holdNoisePulse` per fixed step). */
function hostOwnPulses(secs: number): number {
  let n = 0;
  let p = 0;
  while (p < secs - 1e-9) {
    const q = p + DT;
    if (holdNoisePulse(p, q)) n++;
    p = q;
  }
  return n;
}

describe('marlow-final Q12: client hold noise on the wire', () => {

  it('`use` carries the pulse flag; a plain use stays a plain use', () => {
    expect(parseMessage({ t: 'use', id: 'c-drive', pulse: true })).toEqual({ t: 'use', id: 'c-drive', pulse: true });
    expect(parseMessage({ t: 'use', id: 'c-drive' })).toEqual({ t: 'use', id: 'c-drive' });
    // anything but true is the finished use, as before
    expect(parseMessage({ t: 'use', id: 'c-drive', pulse: 1 })).toEqual({ t: 'use', id: 'c-drive' });
    expect(parseMessage({ t: 'use', pulse: true })).toBeNull();
  });

  it('a snapshot item carries a noisy hold radius `hn` (clamped); a silent item has none', () => {
    const base = { k: 'switch', x: 1, y: 0, z: 2, yaw: 0, label: 'Isolate', hold: 3, reach: 1.4, on: true };
    const m = parseMessage({ t: 'snap', time: 1, players: [], enemies: [], items: [{ ...base, id: 'c-a', hn: 4 }, { ...base, id: 'c-b' }, { ...base, id: 'c-c', hn: 0 }, { ...base, id: 'c-d', hn: 'x' }, { ...base, id: 'c-e', hn: 99 }] });
    expect(m?.t).toBe('snap');
    const items = (m as { items: NetItem[] }).items;
    expect(items.map((i) => i.hn)).toEqual([4, undefined, undefined, undefined, 30]);
    expect('hn' in items[1]!).toBe(false);
  });
});

describe('marlow-final Q12: the client pulse watch', () => {
  it('pulses a held noisy hold exactly as often as the host hears its own hold', () => {
    const w = new HoldPulseWatch();
    const it = item();
    w.add(it);
    const sent: string[] = [];
    const send = (id: string): void => void sent.push(id);
    while (it.progress < it.holdTime - 1e-9) {
      it.progress += DT;
      w.step(send);
    }
    expect(sent.length).toBe(hostOwnPulses(3));
    // the first moment, then every 0.5 s
    expect(sent.length).toBeGreaterThanOrEqual(Math.floor(3 / HOLD_NOISE_PULSE));
    expect(sent.every((s) => s === 'c-drive')).toBe(true);
  });

  it('a silent item, a tap item, a release and a removed item send nothing', () => {
    const w = new HoldPulseWatch();
    w.add(item({ id: 'silent', holdNoise: undefined }));
    w.add(item({ id: 'tap', holdTime: 0 }));
    expect(w.size).toBe(0);
    const it = item();
    w.add(it);
    w.add(it);
    expect(w.size).toBe(1);
    const sent: string[] = [];
    const send = (id: string): void => void sent.push(id);
    it.progress = 0.4;
    w.step(send);
    expect(sent.length).toBe(1);
    // released: the progress drains (2x speed), no pulse
    for (let i = 0; i < 10; i++) {
      it.progress = Math.max(0, it.progress - DT * 2);
      w.step(send);
    }
    expect(sent.length).toBe(1);
    // disabled by the host mid-hold: no pulse
    it.enabled = false;
    it.progress = 1.2;
    w.step(send);
    expect(sent.length).toBe(1);
    it.enabled = true;
    w.remove(it);
    it.progress = 2.6;
    w.step(send);
    expect(sent.length).toBe(1);
    expect(w.size).toBe(0);
  });
});

describe('marlow-final Q12: the host check', () => {
  const feet = { x: 10.5, y: 0, z: 5.5 };

  it('takes a live noisy hold in reach from a live client', () => {
    expect(hostHoldPulse(item(), true, feet.x, feet.y, feet.z, 10, -Infinity)).toBe(true);
    expect(hostHoldPulse(item(), true, feet.x, feet.y, feet.z, 10, 10 - HOLD_NOISE_PULSE)).toBe(true);
  });

  it('drops a dead client, a missing / silent / tap / done / disabled item, out of reach and too fast', () => {
    expect(hostHoldPulse(item(), false, feet.x, feet.y, feet.z, 10, -Infinity)).toBe(false);
    expect(hostHoldPulse(undefined, true, feet.x, feet.y, feet.z, 10, -Infinity)).toBe(false);
    expect(hostHoldPulse(item({ holdNoise: undefined }), true, feet.x, feet.y, feet.z, 10, -Infinity)).toBe(false);
    expect(hostHoldPulse(item({ holdTime: 0 }), true, feet.x, feet.y, feet.z, 10, -Infinity)).toBe(false);
    expect(hostHoldPulse(item({ done: true }), true, feet.x, feet.y, feet.z, 10, -Infinity)).toBe(false);
    expect(hostHoldPulse(item({ enabled: false }), true, feet.x, feet.y, feet.z, 10, -Infinity)).toBe(false);
    expect(hostHoldPulse(item(), true, 10 + 1.4 + 0.8, 0, 5, 10, -Infinity)).toBe(false);
    expect(hostHoldPulse(item(), true, feet.x, 3.5, feet.z, 10, -Infinity)).toBe(false);
    expect(hostHoldPulse(item(), true, feet.x, feet.y, feet.z, 10, 10 - HOLD_PULSE_MIN_GAP / 2)).toBe(false);
  });

  it('the reach is the `use` reach (item reach + 0.75 m, 2 m of height)', () => {
    expect(inUseReach(item(), 10 + 1.4 + 0.74, 1, 5)).toBe(true);
    expect(inUseReach(item(), 10 + 1.4 + 0.76, 1, 5)).toBe(false);
    expect(inUseReach(item({ reach: undefined }), 10 + 2.5, 1, 5)).toBe(true);
    expect(inUseReach(item(), 10, -1.01, 5)).toBe(false);
  });

  it('end to end: a client hold over the wire is heard as often as the host hold', () => {
    const w = new HoldPulseWatch();
    const it = item();
    w.add(it);
    let now = 0;
    let last = -Infinity;
    let heard = 0;
    const send = (id: string): void => {
      const m = parseMessage(JSON.parse(JSON.stringify({ t: 'use', id, pulse: true })));
      if (m?.t !== 'use' || !m.pulse || m.id !== it.id) return;
      if (!hostHoldPulse(it, true, feet.x, feet.y, feet.z, now, last)) return;
      last = now;
      heard++;
    };
    while (it.progress < it.holdTime - 1e-9) {
      now += DT;
      it.progress += DT;
      w.step(send);
    }
    expect(heard).toBe(hostOwnPulses(3));
  });
});
